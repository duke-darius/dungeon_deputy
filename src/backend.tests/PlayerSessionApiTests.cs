using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PlayerSessionApiTests
{
    [Fact]
    public async Task PlayerRoutesAreNotAvailableOnTheLoopbackDesktopApiAndDesktopTokenIsStillRequired()
    {
        var data = Path.Combine(Path.GetTempPath(), "dd-player-api-" + Guid.NewGuid().ToString("N"));
        var oldData = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        try
        {
            Directory.CreateDirectory(data);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", data);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43131");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "player-api-test-token");
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/player-session")).StatusCode);
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "player-api-test-token");
            using var state = await client.GetFromJsonAsync<JsonDocument>("/api/player-session");
            Assert.False(state!.RootElement.GetProperty("listener").GetProperty("enabled").GetBoolean());
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/player-session/start", new { address = "127.0.0.1" })).StatusCode);
            Assert.NotEqual(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/player-exchange", new { invite = "guess" })).StatusCode);
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldData);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            try { Directory.Delete(data, true); } catch { }
        }
    }
}
