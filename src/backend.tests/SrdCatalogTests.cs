using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class SrdCatalogTests
{
    [Fact]
    public async Task SearchAndAddArePrivateDurableAndDoNotPublishEncounterData()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-srd-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new SrdFactory(dir);
            using var client = factory.CreateClient();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/srd/search?q=bandit")).StatusCode);
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            using var search = JsonDocument.Parse(await (await client.GetAsync("/api/srd/search?q=bandit")).Content.ReadAsStringAsync());
            var record = search.RootElement.GetProperty("records").EnumerateArray().Single();
            Assert.Equal("Bandit", record.GetProperty("name").GetString());
            var id = record.GetProperty("id").GetString();
            var added = await client.PostAsJsonAsync("/api/encounter/monsters", new { monsterId = id });
            Assert.Equal(HttpStatusCode.OK, added.StatusCode);
            using var state = JsonDocument.Parse(await added.Content.ReadAsStringAsync());
            var actor = state.RootElement.GetProperty("actors").EnumerateArray().Single(a => a.TryGetProperty("sourceMonsterId", out var source) && source.GetString() == id);
            Assert.Equal(11, actor.GetProperty("maximumHp").GetInt32());
            Assert.Equal(11, actor.GetProperty("currentHp").GetInt32());
            Assert.Equal("5.2.1", actor.GetProperty("sourceRulesetVersion").GetString());
            Assert.Equal(12, actor.GetProperty("armorClassSnapshot").GetInt32());
            Assert.False(actor.TryGetProperty("mapTokenId", out _));
            var publicBefore = await client.GetStringAsync("/api/presentation");
            Assert.DoesNotContain("sourceMonsterId", publicBefore, StringComparison.OrdinalIgnoreCase);
            var mapBefore = await client.GetStringAsync("/api/map");
            using var duplicate = JsonDocument.Parse(await (await client.PostAsJsonAsync("/api/encounter/monsters", new { monsterId = id })).Content.ReadAsStringAsync());
            Assert.Single(duplicate.RootElement.GetProperty("actors").EnumerateArray(), a => a.TryGetProperty("sourceMonsterId", out var source) && source.GetString() == id);
            Assert.Equal(mapBefore, await client.GetStringAsync("/api/map"));
            Assert.Equal(publicBefore, await client.GetStringAsync("/api/presentation"));
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/encounter/monsters", new { monsterId = "not-a-record" })).StatusCode);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task EveryReviewedCategoryIsSearchableWithPdfProvenance()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-srd-categories-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new SrdFactory(dir);
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            foreach (var category in new[] { "spell", "condition", "action", "monster", "equipment", "class", "species" })
            {
                using var response = JsonDocument.Parse(await (await client.GetAsync($"/api/srd/search?category={category}")).Content.ReadAsStringAsync());
                var records = response.RootElement.GetProperty("records").EnumerateArray().ToArray();
                Assert.NotEmpty(records);
                var record = records[0];
                Assert.Equal(category, record.GetProperty("category").GetString());
                Assert.StartsWith("sha256:", record.GetProperty("provenance").GetProperty("sourceHash").GetString());
                Assert.StartsWith("sha256:", record.GetProperty("provenance").GetProperty("recordHash").GetString());
                Assert.True(record.GetProperty("provenance").GetProperty("page").GetInt32() > 0);
            }
            Assert.Empty((await client.GetFromJsonAsync<JsonElement>("/api/srd/search?category=unsupported")).GetProperty("records").EnumerateArray());
            using var coverage = JsonDocument.Parse(await client.GetStringAsync("/api/srd/coverage"));
            Assert.Equal("met", coverage.RootElement.GetProperty("requirements").GetProperty("SRD-01").GetString());
            using var metadata = JsonDocument.Parse(await client.GetStringAsync("/api/srd/metadata"));
            Assert.Equal("5.2.1", metadata.RootElement.GetProperty("release").GetString());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    private sealed class SrdFactory : WebApplicationFactory<Program>
    {
        public string Token { get; } = "srd-test-" + Guid.NewGuid().ToString("N");
        private readonly string? oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        private readonly string? oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        private readonly string? oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        public SrdFactory(string directory)
        {
            Directory.CreateDirectory(directory);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", directory);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43130");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", Token);
        }
        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
        }
    }
}
