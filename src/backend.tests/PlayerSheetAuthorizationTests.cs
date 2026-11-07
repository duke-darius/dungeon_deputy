using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DungeonDeputy.Api.Characters;
using DungeonDeputy.Api.PlayerSessions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Data.Sqlite;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PlayerSheetAuthorizationTests
{
    [Fact]
    public async Task EachBearerReadsOnlyItsCurrentAssignmentAndRevocationClearsNextResponse()
    {
        using var fixture = new PlayerApiFixture();
        var factory = fixture.Factory;
        var characters = factory.Services.GetRequiredService<CharacterService>();
        var first = characters.Create(Input("Aster"))!;
        var second = characters.Create(Input("Briar"))!;
        var sessions = factory.Services.GetRequiredService<PlayerSessionService>();
        var session = sessions.Start();
        var grantA = sessions.Exchange(sessions.CreateInvite(session.Id, first.Id)!.Secret, DateTimeOffset.UtcNow)!;
        var grantB = sessions.Exchange(sessions.CreateInvite(session.Id, second.Id)!.Secret, DateTimeOffset.UtcNow)!;
        var listener = factory.Services.GetRequiredService<PlayerListenerService>();
        var address = PlayerListenerService.GetPrivateAddresses().First();
        await listener.StartAsync(address.Address);
        try
        {
            using var client = new HttpClient { BaseAddress = new Uri(listener.Status.Origin!) };
            using var authA = Authorized(client, grantA.Token);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/player/sheet")).StatusCode);
            using var sheetA = await GetSheet(client, grantA.Token, $"?characterId={second.Id}");
            using var sheetB = await GetSheet(client, grantB.Token);
            Assert.Equal("Aster", sheetA.RootElement.GetProperty("name").GetString());
            Assert.Equal("Briar", sheetB.RootElement.GetProperty("name").GetString());
            Assert.Equal(new[] { "abilityModifiers", "armorClass", "class", "currentHitPoints", "hitPointMaximum", "inventory", "level", "name", "proficiencyBonus", "resources", "species", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "rulesetVersion" }.Order(),
                sheetA.RootElement.EnumerateObject().Select(p => p.Name).Order());
            Assert.Equal(15, sheetA.RootElement.GetProperty("currentHitPoints").GetInt32());
            Assert.DoesNotContain(grantB.Token, sheetA.RootElement.GetRawText(), StringComparison.Ordinal);
            Assert.DoesNotContain("initiative", sheetA.RootElement.GetRawText(), StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("conditionIds", sheetA.RootElement.GetRawText(), StringComparison.OrdinalIgnoreCase);
            Assert.Equal(HttpStatusCode.NotFound, (await authA.GetAsync($"/api/player/sheet/{second.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await authA.GetAsync("/api/encounter")).StatusCode);

            using var add = await authA.PostAsJsonAsync("/api/player/commands", new { type = "addInventory", name = "Rope", quantity = 2 });
            Assert.Equal(HttpStatusCode.OK, add.StatusCode);
            using var refreshedA = await GetSheet(client, grantA.Token);
            using var refreshedB = await GetSheet(client, grantB.Token);
            Assert.Equal("Rope", refreshedA.RootElement.GetProperty("inventory")[0].GetProperty("name").GetString());
            Assert.Empty(refreshedB.RootElement.GetProperty("inventory").EnumerateArray());
            using var dmClient = factory.CreateClient();
            dmClient.DefaultRequestHeaders.Add("X-Dungeon-Token", "player-sheet-api-test-token");
            using var hpUpdate = await dmClient.PutAsJsonAsync($"/api/player-session/players/{grantA.PlayerId}/hp", new { currentHitPoints = 7 });
            Assert.Equal(HttpStatusCode.OK, hpUpdate.StatusCode);
            using var hpOutOfBounds = await dmClient.PutAsJsonAsync($"/api/player-session/players/{grantA.PlayerId}/hp", new { currentHitPoints = 16 });
            Assert.Equal(HttpStatusCode.BadRequest, hpOutOfBounds.StatusCode);
            using var hpA = await GetSheet(client, grantA.Token);
            using var hpB = await GetSheet(client, grantB.Token);
            Assert.Equal(7, hpA.RootElement.GetProperty("currentHitPoints").GetInt32());
            Assert.Equal(15, hpB.RootElement.GetProperty("currentHitPoints").GetInt32());
            using var dmPlayers = JsonDocument.Parse(await (await dmClient.GetAsync("/api/player-session/players")).Content.ReadAsStringAsync());
            Assert.Equal(2, dmPlayers.RootElement.GetArrayLength());
            var dmA = dmPlayers.RootElement.EnumerateArray().Single(player => player.GetProperty("characterId").GetString() == first.Id);
            Assert.Equal("Rope", dmA.GetProperty("inventory")[0].GetProperty("name").GetString());
            Assert.Equal(7, dmA.GetProperty("currentHitPoints").GetInt32());

            Assert.Equal(HttpStatusCode.BadRequest, (await authA.PostAsJsonAsync("/api/player/commands", new { type = "useResource", resourceId = "unknown" })).StatusCode);
            using var forbidden = new StringContent("{\"type\":\"addInventory\",\"name\":\"Sword\",\"quantity\":1,\"currentHp\":999}", System.Text.Encoding.UTF8, "application/json");
            Assert.Equal(HttpStatusCode.BadRequest, (await authA.PostAsync("/api/player/commands", forbidden)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await authA.PutAsJsonAsync("/api/encounter/actors/a/hp", new { current = 1, maximum = 1 })).StatusCode);

            Assert.True(sessions.Revoke(session.Id, grantA.PlayerId));
            using var revoked = await authA.GetAsync("/api/player/sheet");
            Assert.Equal(HttpStatusCode.Gone, revoked.StatusCode);
            using var stillAssigned = await GetSheet(client, grantB.Token);
            Assert.Equal("Briar", stillAssigned.RootElement.GetProperty("name").GetString());
        }
        finally
        {
            await listener.StopAsync(); sessions.Stop(session.Id); SqliteConnection.ClearAllPools();
        }
    }

    private static HttpClient Authorized(HttpClient client, string token)
    {
        var request = new HttpClient { BaseAddress = client.BaseAddress };
        request.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token); return request;
    }
    private static async Task<JsonDocument> GetSheet(HttpClient client, string token, string query = "")
    {
        using var authorized = Authorized(client, token);
        return JsonDocument.Parse(await authorized.GetStringAsync("/api/player/sheet" + query));
    }
    private static CharacterInput Input(string name) => new(name, "barbarian", "dwarf", 1, 15, 14, 14, 10, 12, 8);

    private sealed class PlayerApiFixture : IDisposable
    {
        private readonly string _data = Path.Combine(Path.GetTempPath(), "dd-sheet-api-" + Guid.NewGuid().ToString("N"));
        private readonly string? _oldData = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        private readonly string? _oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        private readonly string? _oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        public WebApplicationFactory<Program> Factory { get; }
        public PlayerApiFixture()
        {
            Directory.CreateDirectory(_data);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", _data);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43134");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "player-sheet-api-test-token");
            Factory = new WebApplicationFactory<Program>();
        }
        public void Dispose()
        {
            Factory.Dispose();
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", _oldData);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", _oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", _oldToken);
            SqliteConnection.ClearAllPools();
            try { Directory.Delete(_data, true); } catch { }
        }
    }

}
