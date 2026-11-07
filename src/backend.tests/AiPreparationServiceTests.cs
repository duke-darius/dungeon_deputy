using System.Net;
using System.Text;
using System.Text.Json;
using DungeonDeputy.Api.AiPreparation;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class AiPreparationServiceTests
{
    [Fact]
    public async Task MissingConfigurationConsentOrFeatureFlagNeverCallsProvider()
    {
        var handler = new CaptureHandler(_ => throw new InvalidOperationException("unexpected request"));
        var service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(false, "secret", "model"));
        Assert.Equal(AiPreparationFailure.Disabled, (await service.GenerateAsync(new AiGenerationRequest("hello", true, []), [], default)).Failure);
        service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(true, null, "model"));
        Assert.Equal(AiPreparationFailure.NotConfigured, (await service.GenerateAsync(new AiGenerationRequest("hello", true, []), [], default)).Failure);
        service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(true, "secret", "model"));
        Assert.Equal(AiPreparationFailure.ConsentRequired, (await service.GenerateAsync(new AiGenerationRequest("hello", false, []), [], default)).Failure);
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task SendsOnlyBoundedPromptUsingStrictResponsesSchemaAndReturnsNpcProposal()
    {
        var handler = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"output":[{"type":"message","content":[{"type":"output_text","text":"{\"npcs\":[{\"name\":\"Mira\",\"description\":\"A guide\"}],\"referenceIds\":[]}"}]}]}""", Encoding.UTF8, "application/json")
        });
        var service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(true, "test-key", "test-model"));
        var result = await service.GenerateAsync(new AiGenerationRequest("A cautious guide", true, []), [], default);
        Assert.Null(result.Failure);
        Assert.Equal("Mira", Assert.Single(result.Proposal!.Npcs).Name);
        Assert.Equal(HttpMethod.Post, handler.Method);
        Assert.Equal("https://api.openai.com/v1/responses", handler.Uri!.ToString());
        Assert.Equal("Bearer", handler.AuthorizationScheme);
        Assert.Equal("test-key", handler.AuthorizationParameter);
        using var body = JsonDocument.Parse(handler.Body!);
        Assert.Equal("test-model", body.RootElement.GetProperty("model").GetString());
        Assert.False(body.RootElement.GetProperty("store").GetBoolean());
        var format = body.RootElement.GetProperty("text").GetProperty("format");
        Assert.Equal("json_schema", format.GetProperty("type").GetString());
        Assert.True(format.GetProperty("strict").GetBoolean());
        Assert.Contains("A cautious guide", body.RootElement.GetProperty("input").GetString());
        Assert.DoesNotContain("secret", handler.Body!, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task UsesStrictBoundedSchemaForAllFiveProposalKindsWithFakeResponsesOnly()
    {
        var fixtures = new[]
        {
            ("npc", "{\"npcs\":[{\"name\":\"Mira\",\"description\":\"Guide\"}],\"referenceIds\":[]}", "npcs"),
            ("encounter", "{\"actors\":[{\"name\":\"Bandit\",\"rationale\":\"Road ambush\",\"srdRecordId\":null}],\"referenceIds\":[]}", "actors"),
            ("adventure", "{\"title\":\"Road\",\"scenes\":[{\"title\":\"Inn\",\"description\":\"A stop\"}],\"referenceIds\":[]}", "scenes"),
            ("scene", "{\"description\":\"A dim tavern\",\"referenceIds\":[]}", "description"),
            ("geometry", "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":10,\"y\":10,\"width\":20,\"height\":20,\"label\":\"Room\"}],\"referenceIds\":[]}", "primitives"),
        };

        foreach (var (kind, proposalJson, rootField) in fixtures)
        {
            var bodyJson = JsonSerializer.Serialize(new { output = new[] { new { type = "message", content = new[] { new { type = "output_text", text = proposalJson } } } } });
            var handler = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
            });
            var service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(true, "test-only-key", "test-model"));
            var result = await service.GenerateAsync(new AiGenerationRequest("Bounded test request", true, [], kind), [], default);

            Assert.Null(result.Failure);
            Assert.Equal(kind, result.StructuredProposal!.Kind);
            Assert.Equal(1, handler.Calls);
            using var body = JsonDocument.Parse(handler.Body!);
            Assert.Equal("https://api.openai.com/v1/responses", handler.Uri!.ToString());
            Assert.Equal("Bearer", handler.AuthorizationScheme);
            Assert.False(body.RootElement.GetProperty("store").GetBoolean());
            Assert.Contains("Bounded test request", body.RootElement.GetProperty("input").GetString());
            Assert.DoesNotContain("test-only-key", handler.Body!, StringComparison.Ordinal);
            var schema = body.RootElement.GetProperty("text").GetProperty("format");
            Assert.True(schema.GetProperty("strict").GetBoolean());
            Assert.True(schema.GetProperty("schema").GetProperty("properties").TryGetProperty(rootField, out _));
        }
    }

    [Fact]
    public async Task ProviderPayloadContainsOnlyPromptAndExplicitLocalRecordContext()
    {
        const string selectedId = "srd521:monster:bandit";
        const string selectedExcerpt = "Only this locally selected monster excerpt.";
        var selected = new AiSelectedSrdRecord(selectedId, "Bandit", selectedExcerpt, "SRD 5.2.1, CC-BY-4.0, p. 1");
        var responseText = "{\"npcs\":[{\"name\":\"Guide\",\"description\":\"A traveler\"}],\"referenceIds\":[\"srd521:monster:bandit\"]}";
        var providerJson = JsonSerializer.Serialize(new { output = new[] { new { type = "message", content = new[] { new { type = "output_text", text = responseText } } } } });
        var handler = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(providerJson, Encoding.UTF8, "application/json") });
        var service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(true, "no-real-provider-key", "test-model"));

        var result = await service.GenerateAsync(new AiGenerationRequest("Write a tavern guide", true, [selectedId], "npc"), [selected], default);

        Assert.Null(result.Failure);
        using var body = JsonDocument.Parse(handler.Body!);
        var input = body.RootElement.GetProperty("input").GetString()!;
        Assert.Contains("Write a tavern guide", input);
        Assert.Contains(selectedId, input);
        Assert.Contains(selectedExcerpt, input);
        Assert.DoesNotContain("PRIVATE_PLAYER_SENTINEL", input);
        Assert.DoesNotContain("HIDDEN_FOG_SENTINEL", input);
        Assert.DoesNotContain("DM_SECRET_SENTINEL", input);
        Assert.DoesNotContain("no-real-provider-key", handler.Body!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SelectedLocalRecordsCannotBeSilentlyIgnoredByProviderOutput()
    {
        var selected = new AiSelectedSrdRecord("srd521:monster:bandit", "Bandit", "A selected local entry.", "SRD 5.2.1, CC-BY-4.0");
        var providerJson = """{"output":[{"type":"message","content":[{"type":"output_text","text":"{\"npcs\":[{\"name\":\"Guide\",\"description\":\"A traveler\"}],\"referenceIds\":[]}"}]}]}""";
        var handler = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(providerJson, Encoding.UTF8, "application/json") });
        var service = new AiPreparationService(new HttpClient(handler), () => new AiProviderSettings(true, "test-key", "test-model"));
        var result = await service.GenerateAsync(new AiGenerationRequest("Use this local rules reference", true, [selected.Id]), [selected], default);
        Assert.Equal(AiPreparationFailure.InvalidProviderResponse, result.Failure);
    }

    [Fact]
    public async Task ProviderFailuresAreSanitizedAndResponseBytesAreBounded()
    {
        var timeout = new CaptureHandler(_ => throw new TaskCanceledException("secret prompt leaked"));
        var service = new AiPreparationService(new HttpClient(timeout), () => new AiProviderSettings(true, "key", "model"));
        var result = await service.GenerateAsync(new AiGenerationRequest("prompt", true, []), [], default);
        Assert.Equal(AiPreparationFailure.ProviderUnavailable, result.Failure);
        Assert.DoesNotContain("secret", result.Message, StringComparison.OrdinalIgnoreCase);

        var oversized = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(new string('x', AiPreparationService.MaxResponseBytes + 1)) });
        service = new AiPreparationService(new HttpClient(oversized), () => new AiProviderSettings(true, "key", "model"));
        result = await service.GenerateAsync(new AiGenerationRequest("prompt", true, []), [], default);
        Assert.Equal(AiPreparationFailure.InvalidProviderResponse, result.Failure);

        var refusal = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"output":[{"type":"message","content":[{"type":"refusal","refusal":"private refusal details"}]}]}""")
        });
        service = new AiPreparationService(new HttpClient(refusal), () => new AiProviderSettings(true, "key", "model"));
        result = await service.GenerateAsync(new AiGenerationRequest("prompt", true, []), [], default);
        Assert.Equal(AiPreparationFailure.InvalidProviderResponse, result.Failure);
        Assert.DoesNotContain("private refusal details", result.Message);

        var malformed = new CaptureHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });
        service = new AiPreparationService(new HttpClient(malformed), () => new AiProviderSettings(true, "key", "model"));
        result = await service.GenerateAsync(new AiGenerationRequest("prompt", true, []), [], default);
        Assert.Equal(AiPreparationFailure.InvalidProviderResponse, result.Failure);
    }

    private sealed class CaptureHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public HttpMethod? Method { get; private set; }
        public Uri? Uri { get; private set; }
        public string? AuthorizationScheme { get; private set; }
        public string? AuthorizationParameter { get; private set; }
        public string? Body { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++; Method = request.Method; Uri = request.RequestUri;
            AuthorizationScheme = request.Headers.Authorization?.Scheme; AuthorizationParameter = request.Headers.Authorization?.Parameter;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return respond(request);
        }
    }
}
