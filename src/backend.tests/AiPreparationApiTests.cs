using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DungeonDeputy.Api.AiPreparation;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class AiPreparationApiTests
{
    [Fact]
    public async Task PrivateGenerationUsesOnlyExplicitContextAndPersistsNeitherPromptNorSecret()
    {
        const string prompt = "P7_PRIVATE_PROMPT_SENTINEL_tavern_ambush";
        const string secret = "P7_TEST_KEY_SENTINEL_never_a_real_key";
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-private-generation-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        var oldEnabled = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED");
        var oldKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        var oldModel = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL");
        var oldE2e = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E");
        var oldFake = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43140");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "ai-private-test-token");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED", null);
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", secret);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL", null);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E", null);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE", null);

            var fake = new CapturingAiPreparationService();
            var logs = new CapturedLogs();
            using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            {
                builder.ConfigureLogging(logging => logging.AddProvider(logs));
                builder.ConfigureTestServices(services =>
                {
                    services.RemoveAll<IAiPreparationService>();
                    services.AddSingleton<IAiPreparationService>(fake);
                });
            });
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "ai-private-test-token");
            var before = await Snapshot(client);
            var response = await client.PostAsJsonAsync("/api/ai/geometry", new
            {
                prompt,
                consent = true,
                selectedSrdRecordIds = new[] { "srd521:monster:bandit" },
            });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(fake.LastRequest!.Consent);
            Assert.Equal(prompt, fake.LastRequest.Prompt);
            Assert.Equal(new[] { "srd521:monster:bandit" }, fake.LastRecords.Select(record => record.Id));
            Assert.DoesNotContain(secret, await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
            Assert.Equal(before, await Snapshot(client));

            var invalidSelection = await client.PostAsJsonAsync("/api/ai/geometry", new
            {
                prompt,
                consent = true,
                selectedSrdRecordIds = new string?[] { null },
            });
            Assert.Equal(HttpStatusCode.BadRequest, invalidSelection.StatusCode);
            Assert.Equal("srd521:monster:bandit", Assert.Single(fake.LastRecords).Id);
            Assert.Equal(before, await Snapshot(client));

            using (var db = new Microsoft.Data.Sqlite.SqliteConnection(new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder { DataSource = Path.Combine(dir, "dungeon-deputy.sqlite3") }.ToString()))
            {
                db.Open();
                using var tableCommand = db.CreateCommand();
                tableCommand.CommandText = "SELECT name FROM sqlite_master WHERE type='table'";
                var tables = new List<string>();
                using (var tableReader = tableCommand.ExecuteReader())
                    while (tableReader.Read()) tables.Add(tableReader.GetString(0));
                foreach (var table in tables)
                {
                    using var command = db.CreateCommand();
                    command.CommandText = $"SELECT * FROM \"{table.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
                    using var reader = command.ExecuteReader();
                    while (reader.Read())
                        for (var column = 0; column < reader.FieldCount; column++)
                            if (!reader.IsDBNull(column) && reader.GetFieldType(column) == typeof(string))
                            {
                                var value = reader.GetString(column);
                                Assert.DoesNotContain(prompt, value, StringComparison.Ordinal);
                                Assert.DoesNotContain(secret, value, StringComparison.Ordinal);
                            }
                }
            }
            var logText = string.Join("\n", logs.Messages);
            Assert.DoesNotContain(prompt, logText, StringComparison.Ordinal);
            Assert.DoesNotContain(secret, logText, StringComparison.Ordinal);
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED", oldEnabled);
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", oldKey);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL", oldModel);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E", oldE2e);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE", oldFake);
            try { Directory.Delete(dir, true); } catch { }
        }
    }

    [Fact]
    public async Task DisabledAiKeepsLocalCampaignApiUsableAndDoesNotChangePersistentOrPublicState()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-disabled-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        var oldEnabled = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED");
        var oldKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        var oldModel = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL");
        var oldE2e = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E");
        var oldFake = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43139");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "ai-disabled-test-token");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED", null);
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", null);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL", null);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E", null);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE", null);
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "ai-disabled-test-token");
            Assert.Contains("disabled", await client.GetStringAsync("/api/ai/status"));
            var mapBefore = await client.GetStringAsync("/api/map");
            var encounterBefore = await client.GetStringAsync("/api/encounter");
            var publicBefore = await client.GetStringAsync("/api/presentation");
            var response = await client.PostAsJsonAsync("/api/ai/geometry", new { prompt = "Local tavern geometry", consent = true, selectedSrdRecordIds = Array.Empty<string>() });
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            Assert.DoesNotContain("key", (await response.Content.ReadAsStringAsync()).ToLowerInvariant());
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/srd/search?q=Bandit&category=monster")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/characters")).StatusCode);
            Assert.Equal(mapBefore, await client.GetStringAsync("/api/map"));
            Assert.Equal(encounterBefore, await client.GetStringAsync("/api/encounter"));
            Assert.Equal(publicBefore, await client.GetStringAsync("/api/presentation"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED", oldEnabled);
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", oldKey);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL", oldModel);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E", oldE2e);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE", oldFake);
            try { Directory.Delete(dir, true); } catch { }
        }
    }

    [Fact]
    public async Task StatusIsLocalAndSafeAndNpcRouteRequiresDmAuthenticationAndFreshConsent()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-api-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        var oldEnabled = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED");
        var oldKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        var oldModel = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43132");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "ai-test-token");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED", "1");
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", "never-return-this-key");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL", "private-model-name");
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/ai/status")).StatusCode);
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "ai-test-token");
            var status = await client.GetStringAsync("/api/ai/status");
            Assert.Contains("configured", status);
            Assert.DoesNotContain("never-return-this-key", status);
            Assert.DoesNotContain("private-model-name", status);
            var response = await client.PostAsJsonAsync("/api/ai/npc", new { prompt = "Make a guide", consent = false, selectedSrdRecordIds = Array.Empty<string>() });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.DoesNotContain("never-return-this-key", await response.Content.ReadAsStringAsync());
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/map")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/encounter")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/presentation")).StatusCode);
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_ENABLED", oldEnabled);
            Environment.SetEnvironmentVariable("OPENAI_API_KEY", oldKey);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_AI_MODEL", oldModel);
            try { Directory.Delete(dir, true); } catch { }
        }
    }

    private static async Task<(string Map, string Encounter, string Presentation)> Snapshot(HttpClient client) => (
        await client.GetStringAsync("/api/map"),
        await client.GetStringAsync("/api/encounter"),
        await client.GetStringAsync("/api/presentation"));

    private sealed class CapturingAiPreparationService : IAiPreparationService
    {
        public AiGenerationRequest? LastRequest { get; private set; }
        public IReadOnlyList<AiSelectedSrdRecord> LastRecords { get; private set; } = [];
        public AiPreparationStatus GetStatus() => new("configured");
        public Task<AiPreparationResult> GenerateAsync(AiGenerationRequest request, IReadOnlyList<AiSelectedSrdRecord> records, CancellationToken cancellationToken)
        {
            LastRequest = request;
            LastRecords = records;
            var proposal = new AiProposal(request.Kind,
                new GeometryProposalContent([new GeometryPrimitive("rectangle", 10, 10, 20, 20, "Private test shape")], records.Select(record => record.Id).ToArray()), records);
            return Task.FromResult(new AiPreparationResult(null, null, "Proposal ready for private review.", proposal));
        }
    }

    private sealed class CapturedLogs : ILoggerProvider
    {
        private readonly List<string> messages = [];
        public IReadOnlyList<string> Messages { get { lock (messages) return messages.ToArray(); } }
        public ILogger CreateLogger(string categoryName) => new CapturedLogger(categoryName, messages);
        public void Dispose() { }
    }

    private sealed class CapturedLogger(string category, List<string> messages) : ILogger
    {
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (messages) messages.Add($"{category} {logLevel}: {formatter(state, exception)}");
        }
        private sealed class NullScope : IDisposable
        {
            public static NullScope Instance { get; } = new();
            public void Dispose() { }
        }
    }
}
