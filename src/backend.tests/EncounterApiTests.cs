using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class EncounterApiTests
{
    [Fact]
    public async Task EncounterStateAndCommandsArePrivateAuthenticatedAndDurable()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-encounter-" + Guid.NewGuid().ToString("N"));
        using var factory = new EncounterFactory(dir);
        try
        {
            using var client = factory.CreateClient();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/encounter")).StatusCode);
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            var response = await client.GetAsync("/api/encounter");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var state = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var actorId = state.RootElement.GetProperty("actors")[0].GetProperty("tokenId").GetString()!;
            Assert.False(state.RootElement.GetProperty("actors")[0].TryGetProperty("currentHp", out _));
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/encounter/actors/{actorId}/hp", new { current = 8, maximum = 12 })).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/encounter/actors/{actorId}/hp", new { current = 13, maximum = 12 })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/encounter/actors/{actorId}/initiative", new { value = 15 })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync($"/api/encounter/actors/{actorId}/initiative/roll", new { })).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/encounter/actors/{actorId}/conditions", new { conditionIds = new[] { "unknown" } })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/encounter/actors/{actorId}/conditions", new { conditionIds = new[] { "blinded" } })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/encounter/turn/end", new { })).StatusCode);
            var dice = await client.PostAsJsonAsync("/api/encounter/dice", new { sides = 20, modifier = -2 });
            Assert.Equal(HttpStatusCode.OK, dice.StatusCode);
            var result = JsonDocument.Parse(await dice.Content.ReadAsStringAsync()).RootElement;
            Assert.InRange(result.GetProperty("total").GetInt32(), -1, 18);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/encounter/dice", new { sides = 3, modifier = 0 })).StatusCode);
            Assert.DoesNotContain("initiative", (await client.GetStringAsync("/api/presentation")), StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("currentHp", (await client.GetStringAsync("/api/presentation")), StringComparison.OrdinalIgnoreCase);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    private sealed class EncounterFactory : WebApplicationFactory<Program>
    {
        public string Token { get; } = "encounter-test-" + Guid.NewGuid().ToString("N");
        private readonly string? oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        private readonly string? oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        private readonly string? oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        public EncounterFactory(string directory)
        {
            Directory.CreateDirectory(directory);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", directory);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43129");
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
