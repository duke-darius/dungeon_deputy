using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace DungeonDeputy.Api.AiPreparation;

public sealed class AiPreparationService : IAiPreparationService
{
    public const int MaxResponseBytes = 64 * 1024;
    public const int MaxPromptCharacters = 2000;
    private static readonly Uri Endpoint = new("https://api.openai.com/v1/responses");
    private readonly HttpClient client;
    private readonly Func<AiProviderSettings> settings;

    public AiPreparationService(HttpClient client, Func<AiProviderSettings>? settings = null)
    {
        this.client = client;
        this.settings = settings ?? ReadSettings;
        this.client.Timeout = TimeSpan.FromSeconds(20);
    }

    public static AiProviderSettings ReadSettings() => new(
        Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED") == "1",
        Environment.GetEnvironmentVariable("OPENAI_API_KEY"),
        Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL"));

    public AiPreparationStatus GetStatus()
    {
        var value = settings();
        return new AiPreparationStatus(!value.Enabled ? "disabled" :
            string.IsNullOrWhiteSpace(value.ApiKey) || string.IsNullOrWhiteSpace(value.Model) ? "unconfigured" : "configured");
    }

    public async Task<AiPreparationResult> GenerateAsync(AiGenerationRequest request, IReadOnlyList<AiSelectedSrdRecord> records, CancellationToken cancellationToken)
    {
        var config = settings();
        if (!config.Enabled) return AiPreparationResult.Failed(AiPreparationFailure.Disabled);
        if (string.IsNullOrWhiteSpace(config.ApiKey) || string.IsNullOrWhiteSpace(config.Model)) return AiPreparationResult.Failed(AiPreparationFailure.NotConfigured);
        if (!request.Consent) return AiPreparationResult.Failed(AiPreparationFailure.ConsentRequired);
        var prompt = request.Prompt;
        if (string.IsNullOrWhiteSpace(prompt) || prompt.Length > MaxPromptCharacters || records.Count > 3 || records.Any(x => x.Excerpt.Length > 2000) || records.Sum(x => x.Excerpt.Length) > 6000 || !new[] { "npc", "encounter", "adventure", "scene", "geometry" }.Contains(request.Kind, StringComparer.Ordinal))
            return AiPreparationResult.Failed(AiPreparationFailure.InvalidRequest);

        var input = new StringBuilder(prompt);
        foreach (var record in records)
            input.Append("\n\nSelected local SRD record ").Append(record.Id).Append(" — ").Append(record.Name).Append(" [").Append(record.Source).Append("]: ").Append(record.Excerpt);
        var schema = SchemaFor(request.Kind);
        var body = JsonSerializer.Serialize(new { model = config.Model, input = input.ToString(), store = false, text = new { format = new { type = "json_schema", name = "dm_" + request.Kind + "_proposal", strict = true, schema } } });
        using var message = new HttpRequestMessage(HttpMethod.Post, Endpoint);
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);
        message.Content = new StringContent(body, Encoding.UTF8, "application/json");
        try
        {
            using var response = await client.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!response.IsSuccessStatusCode) return AiPreparationResult.Failed(AiPreparationFailure.ProviderUnavailable);
            if (response.Content.Headers.ContentLength is > MaxResponseBytes) return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var buffer = new MemoryStream();
            var chunk = new byte[4096];
            while (true)
            {
                var read = await stream.ReadAsync(chunk, cancellationToken);
                if (read == 0) break;
                if (buffer.Length + read > MaxResponseBytes) return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                buffer.Write(chunk, 0, read);
            }
            using var json = JsonDocument.Parse(buffer.ToArray());
            foreach (var item in json.RootElement.GetProperty("output").EnumerateArray())
            {
                if (item.TryGetProperty("type", out var type) && type.GetString() == "refusal") return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                if (!item.TryGetProperty("content", out var content)) continue;
                foreach (var part in content.EnumerateArray())
                {
                    if (!part.TryGetProperty("type", out var partType)) continue;
                    if (partType.GetString() == "refusal") return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                    if (partType.GetString() == "output_text" && part.TryGetProperty("text", out var text))
                    {
                        if (!ProposalValidator.TryValidate(request.Kind, text.GetString()!, out var proposal)) return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                        var referenceIds = proposal!.References.Select(x => x.Id).ToArray();
                        if (records.Count > 0 && referenceIds.Length == 0) return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                        var selected = records.Where(x => referenceIds.Contains(x.Id, StringComparer.Ordinal)).ToArray();
                        if (selected.Length != referenceIds.Length) return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                        if (proposal.Content is EncounterProposalContent encounter && encounter.Actors.Any(x => x.SrdRecordId is not null && (!referenceIds.Contains(x.SrdRecordId, StringComparer.Ordinal) || !records.Any(r => r.Id == x.SrdRecordId && r.Id.StartsWith("srd:monster:", StringComparison.Ordinal))))) return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
                        var resolvedProposal = proposal with { References = selected };
                        var npcs = proposal.Content is NpcProposalContent npcContent ? new AiNpcProposal(npcContent.Npcs) : null;
                        return new AiPreparationResult(npcs, null, "Proposal ready for private review.", resolvedProposal);
                    }
                }
            }
            return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse);
        }
        catch (OperationCanceledException) { return AiPreparationResult.Failed(AiPreparationFailure.ProviderUnavailable); }
        catch (HttpRequestException) { return AiPreparationResult.Failed(AiPreparationFailure.ProviderUnavailable); }
        catch (JsonException) { return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse); }
        catch (InvalidOperationException) { return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse); }
        catch (KeyNotFoundException) { return AiPreparationResult.Failed(AiPreparationFailure.InvalidProviderResponse); }
    }

    private static object SchemaFor(string kind)
    {
        static object Arr(int max, object item) => new { type = "array", minItems = 1, maxItems = max, items = item };
        static object Obj(string[] required, object properties) => new { type = "object", additionalProperties = false, required, properties };
        var references = new { type = "array", maxItems = 3, items = new { type = "string", maxLength = 120 } };
        var text = new { type = "string", maxLength = 500 };
        var props = kind switch
        {
            "npc" => Obj(["npcs", "referenceIds"], new { npcs = Arr(8, Obj(["name", "description"], new { name = new { type = "string", maxLength = 80 }, description = text })), referenceIds = references }),
            "encounter" => Obj(["actors", "referenceIds"], new { actors = Arr(8, Obj(["name", "rationale", "srdRecordId"], new { name = new { type = "string", maxLength = 80 }, rationale = text, srdRecordId = new { type = new[] { "string", "null" }, maxLength = 120 } })), referenceIds = references }),
            "adventure" => Obj(["title", "scenes", "referenceIds"], new { title = new { type = "string", maxLength = 80 }, scenes = Arr(5, Obj(["title", "description"], new { title = new { type = "string", maxLength = 80 }, description = text })), referenceIds = references }),
            "scene" => Obj(["description", "referenceIds"], new { description = new { type = "string", maxLength = 1000 }, referenceIds = references }),
            _ => Obj(["primitives", "referenceIds"], new { primitives = Arr(40, Obj(["kind", "x", "y", "width", "height", "label"], new { kind = new { type = "string", @enum = new[] { "line", "rectangle" } }, x = new { type = "number" }, y = new { type = "number" }, width = new { type = "number" }, height = new { type = "number" }, label = new { type = "string", maxLength = 80 } })), referenceIds = references })
        };
        return props;
    }
}
