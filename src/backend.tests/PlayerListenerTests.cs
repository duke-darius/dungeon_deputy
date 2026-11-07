using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DungeonDeputy.Api.PlayerSessions;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PlayerSessionListenerTests
{
    [Fact]
    public async Task ListenerUsesTestOnlyLoopbackAndStopClosesIt()
    {
        Assert.False(PlayerListenerService.IsPrivateLanAddress(IPAddress.Loopback));
        Assert.False(PlayerListenerService.IsPrivateLanAddress(IPAddress.Parse("169.254.1.2")));
        Assert.True(PlayerListenerService.IsPrivateLanAddress(IPAddress.Parse("192.168.1.5")));
        var previousE2E = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E");
        var previousFake = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE");
        Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E", "1");
        Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE", "1");
        var data = Path.Combine(Path.GetTempPath(), "dd-player-listener-" + Guid.NewGuid().ToString("N"));
        try
        {
            var address = PlayerListenerService.GetPrivateAddresses().FirstOrDefault();
            Assert.NotNull(address);
            Assert.Equal(IPAddress.Loopback.ToString(), address!.Address);
            Directory.CreateDirectory(data);
            using var sessions = new PlayerSessionService(data);
            var active = sessions.Start();
            var invite = sessions.CreateInvite(active.Id, "character-1")!;
            var listener = new PlayerListenerService(sessions);
            try
            {
            var status = await listener.StartAsync(address!.Address);
            Assert.True(status.Enabled);
            using var client = new HttpClient { BaseAddress = new Uri(status.Origin!) };
            Assert.True((await client.GetAsync("/api/player/health")).IsSuccessStatusCode);
            using (var hostileOrigin = new HttpClient { BaseAddress = new Uri(status.Origin!) })
            {
                hostileOrigin.DefaultRequestHeaders.Add("Origin", "http://untrusted.example");
                Assert.Equal(HttpStatusCode.Forbidden, (await hostileOrigin.GetAsync("/api/player/health")).StatusCode);
            }
            using var paired = await client.PostAsJsonAsync("/api/player/exchange", new { invite = invite.Secret });
            Assert.Equal(HttpStatusCode.OK, paired.StatusCode);
            using var document = JsonDocument.Parse(await paired.Content.ReadAsStringAsync());
            var token = document.RootElement.GetProperty("token").GetString();
            Assert.Equal("character-1", sessions.Authorize(token)?.CharacterId);
            using var replay = await client.PostAsJsonAsync("/api/player/exchange", new { invite = invite.Secret });
            Assert.Equal(HttpStatusCode.Gone, replay.StatusCode);
            using var replayBody = JsonDocument.Parse(await replay.Content.ReadAsStringAsync());
            Assert.Equal("used", replayBody.RootElement.GetProperty("error").GetString());
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/characters")).StatusCode);
            await listener.StopAsync();
            Assert.False(listener.Status.Enabled);
            await Assert.ThrowsAnyAsync<HttpRequestException>(async () => await client.GetAsync("/api/player/health"));
            }
            finally
            {
                await listener.DisposeAsync();
                sessions.Stop(active.Id);
                SqliteCleanup();
            }
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E", previousE2E);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE", previousFake);
            try { Directory.Delete(data, true); } catch { }
        }
    }

    private static void SqliteCleanup() => Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
}
