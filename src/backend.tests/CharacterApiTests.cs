using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class CharacterApiTests
{
    [Fact]
    public async Task WizardResourcesAreServerBoundedPersistAndRecoverAfterRests()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-character-resources-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CharacterFactory(dir);
            using var client = factory.CreateClient(); client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            var input = new { name="Ira", @class="wizard", species="dwarf", level=1, strength=10, dexterity=14,
                constitution=14, intelligence=16, wisdom=12, charisma=8, currentSpellSlots=0,
                cantrips=new[]{"acid-splash","fire-bolt","light"},
                spells=new string[0], spellbook=new[]{"alarm","burning-hands","detect-magic","disguise-self","magic-missile","shield"},
                preparedSpells=new[]{"alarm","burning-hands","detect-magic","disguise-self"} };
            using var created = await client.PostAsJsonAsync("/api/characters", input);
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
            using var createdJson = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
            var id = createdJson.RootElement.GetProperty("id").GetString()!;
            Assert.Equal(2, createdJson.RootElement.GetProperty("currentSpellSlots").GetInt32());
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { resourceAction="spell-slot" })).StatusCode);
            using var shortRest = await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { longRest=false });
            Assert.Equal(HttpStatusCode.OK, shortRest.StatusCode);
            using var shortRestJson = JsonDocument.Parse(await shortRest.Content.ReadAsStringAsync());
            Assert.True(shortRestJson.RootElement.GetProperty("arcaneRecoveryAvailable").GetBoolean());
            using var recovered = await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { arcaneRecovery=true });
            Assert.Equal(HttpStatusCode.OK, recovered.StatusCode);
            using var restoredJson = JsonDocument.Parse(await recovered.Content.ReadAsStringAsync());
            Assert.Equal(2, restoredJson.RootElement.GetProperty("currentSpellSlots").GetInt32());
            Assert.True(restoredJson.RootElement.GetProperty("arcaneRecoveryUsed").GetBoolean());
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { arcaneRecovery=true })).StatusCode);
            using var persisted = JsonDocument.Parse(await (await client.GetAsync($"/api/characters/{id}")).Content.ReadAsStringAsync());
            Assert.Equal(2, persisted.RootElement.GetProperty("currentSpellSlots").GetInt32());
            Assert.Equal(13, persisted.RootElement.GetProperty("spellSaveDc").GetInt32());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task BarbarianRageAndStonecunningRemainBoundedAcrossPersistedRestActions()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-character-barbarian-resources-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CharacterFactory(dir);
            using var client = factory.CreateClient(); client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            var input = new { name="Kara", @class="barbarian", species="dwarf", level=1, strength=15, dexterity=14,
                constitution=14, intelligence=10, wisdom=12, charisma=8 };
            using var response = await client.PostAsJsonAsync("/api/characters", input);
            using var created = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var id = created.RootElement.GetProperty("id").GetString()!;
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { resourceAction="rage" })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { resourceAction="stonecunning" })).StatusCode);
            using var spent = JsonDocument.Parse(await (await client.GetAsync($"/api/characters/{id}")).Content.ReadAsStringAsync());
            Assert.Equal(1, spent.RootElement.GetProperty("currentRageUses").GetInt32());
            Assert.Equal(1, spent.RootElement.GetProperty("currentStonecunningUses").GetInt32());
            await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { longRest=false });
            using var shortRest = JsonDocument.Parse(await (await client.GetAsync($"/api/characters/{id}")).Content.ReadAsStringAsync());
            Assert.Equal(2, shortRest.RootElement.GetProperty("currentRageUses").GetInt32());
            Assert.Equal(1, shortRest.RootElement.GetProperty("currentStonecunningUses").GetInt32());
            await client.PostAsJsonAsync($"/api/characters/{id}/rest", new { longRest=true });
            using var longRest = JsonDocument.Parse(await (await client.GetAsync($"/api/characters/{id}")).Content.ReadAsStringAsync());
            Assert.Equal(2, longRest.RootElement.GetProperty("currentRageUses").GetInt32());
            Assert.Equal(2, longRest.RootElement.GetProperty("currentStonecunningUses").GetInt32());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task ExperienceDerivesBarbarianLevelProficiencyAndCanonicalEquipment()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-character-xp-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CharacterFactory(dir);
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            var body = new { name = "Kara", @class = "barbarian", species = "dwarf", level = 5,
                totalExperiencePoints = 6500, strength = 15, dexterity = 14, constitution = 14,
                intelligence = 10, wisdom = 12, charisma = 8, equipmentPackage = "A" };
            using var response = await client.PostAsJsonAsync("/api/characters", body);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal(5, json.RootElement.GetProperty("level").GetInt32());
            Assert.Equal(6500, json.RootElement.GetProperty("totalExperiencePoints").GetInt32());
            Assert.Equal(3, json.RootElement.GetProperty("proficiencyBonus").GetInt32());
            Assert.Equal("A", json.RootElement.GetProperty("equipmentPackage").GetString());
            Assert.Equal("greataxe", json.RootElement.GetProperty("inventory")[0].GetProperty("itemId").GetString());
            Assert.Equal(1, json.RootElement.GetProperty("inventory")[0].GetProperty("quantity").GetInt32());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task AuthenticatedDmCanCreateEditListAndDeleteOneSourceBackedDwarfBarbarian()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-character-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CharacterFactory(dir);
            using var client = factory.CreateClient();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/characters")).StatusCode);
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);

            var input = new { name = "Mira Vale", @class = "barbarian", species = "dwarf", level = 1,
                strength = 15, dexterity = 14, constitution = 14, intelligence = 10, wisdom = 12, charisma = 8 };
            using var createdResponse = await client.PostAsJsonAsync("/api/characters", input);
            Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
            using var created = JsonDocument.Parse(await createdResponse.Content.ReadAsStringAsync());
            var root = created.RootElement;
            var id = root.GetProperty("id").GetString();
            Assert.False(string.IsNullOrWhiteSpace(id));
            Assert.Contains("barbarian/dwarf 1-20", root.GetProperty("rulesetVersion").GetString());
            Assert.Equal(2, root.GetProperty("proficiencyBonus").GetInt32());
            Assert.Equal(2, root.GetProperty("abilityModifiers").GetProperty("strength").GetInt32());
            Assert.Equal(15, root.GetProperty("hitPointMaximum").GetInt32());
            Assert.Equal(14, root.GetProperty("armorClass").GetInt32());
            var source = root.GetProperty("support");
            Assert.Equal("sha256:8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87", source.GetProperty("pdfSha256").GetString());
            Assert.Contains("Barbarian", source.GetProperty("citations").GetProperty("class").GetString());
            Assert.Contains("Dwarf", source.GetProperty("citations").GetProperty("species").GetString());
            Assert.Contains("Supported", source.GetProperty("categoryStatus").GetProperty("inventory").GetString());
            Assert.Contains("Supported", source.GetProperty("categoryStatus").GetProperty("spells").GetString());

            var edit = await client.PutAsJsonAsync($"/api/characters/{id}", input with { name = "Mira Vale II", constitution = 16 });
            Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
            using var edited = JsonDocument.Parse(await edit.Content.ReadAsStringAsync());
            Assert.Equal("Mira Vale II", edited.RootElement.GetProperty("name").GetString());
            Assert.Equal(16, edited.RootElement.GetProperty("hitPointMaximum").GetInt32());
            using var listed = JsonDocument.Parse(await (await client.GetAsync("/api/characters")).Content.ReadAsStringAsync());
            Assert.Single(listed.RootElement.EnumerateArray());
            using var reloaded = JsonDocument.Parse(await (await client.GetAsync($"/api/characters/{id}")).Content.ReadAsStringAsync());
            Assert.Equal(16, reloaded.RootElement.GetProperty("constitution").GetInt32());
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/characters/{id}")).StatusCode);
            Assert.Empty((await client.GetFromJsonAsync<JsonElement>("/api/characters")).EnumerateArray());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task UnsupportedMalformedAndOversizedCharacterWritesAreRejectedWithoutPersistence()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-character-invalid-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CharacterFactory(dir);
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            var valid = new { name = "Mira", @class = "barbarian", species = "dwarf", level = 1,
                strength = 15, dexterity = 14, constitution = 14, intelligence = 10, wisdom = 12, charisma = 8 };
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/characters", valid with { @class = "wizard" })).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/characters", valid with { strength = 31 })).StatusCode);
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/characters", valid with { level = 2 })).StatusCode);
            using var forged = new StringContent("{\"name\":\"Mira\",\"class\":\"barbarian\",\"species\":\"dwarf\",\"level\":1,\"strength\":15,\"dexterity\":14,\"constitution\":14,\"intelligence\":10,\"wisdom\":12,\"charisma\":8,\"hitPointMaximum\":999,\"armorClass\":999}", System.Text.Encoding.UTF8, "application/json");
            using var recalculated = await client.PostAsync("/api/characters", forged);
            Assert.Equal(HttpStatusCode.Created, recalculated.StatusCode);
            using var canonical = JsonDocument.Parse(await recalculated.Content.ReadAsStringAsync());
            Assert.Equal(15, canonical.RootElement.GetProperty("hitPointMaximum").GetInt32());
            Assert.Equal(14, canonical.RootElement.GetProperty("armorClass").GetInt32());
            using var huge = new StringContent("{\"name\":\"" + new string('x', 20_000) + "\"}", System.Text.Encoding.UTF8, "application/json");
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/characters", huge)).StatusCode);
            Assert.Equal(3, (await client.GetFromJsonAsync<JsonElement>("/api/characters")).EnumerateArray().Count());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public async Task CollectionOrderingIsStableAndUnknownOrInvalidUpdatesLeaveRecordsUntouched()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-character-collection-" + Guid.NewGuid().ToString("N"));
        try
        {
            using var factory = new CharacterFactory(dir);
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", factory.Token);
            var input = new { name = "Zed", @class = "barbarian", species = "dwarf", level = 1,
                strength = 12, dexterity = 12, constitution = 12, intelligence = 12, wisdom = 12, charisma = 12 };
            var first = await client.PostAsJsonAsync("/api/characters", input);
            var zed = await first.Content.ReadFromJsonAsync<JsonElement>();
            var second = await client.PostAsJsonAsync("/api/characters", input with { name = "Mira" });
            var mira = await second.Content.ReadFromJsonAsync<JsonElement>();
            using var list = JsonDocument.Parse(await (await client.GetAsync("/api/characters")).Content.ReadAsStringAsync());
            Assert.Equal(new[] { "Mira", "Zed" }, list.RootElement.EnumerateArray().Select(item => item.GetProperty("name").GetString()));
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/characters/not-an-id", input)).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/characters/{zed.GetProperty("id").GetString()}", input with { @class = "wizard", level = 2 })).StatusCode);
            using var after = JsonDocument.Parse(await (await client.GetAsync("/api/characters")).Content.ReadAsStringAsync());
            Assert.Equal(2, after.RootElement.GetArrayLength());
            Assert.Equal("Zed", after.RootElement.EnumerateArray().Single(item => item.GetProperty("id").GetString() == zed.GetProperty("id").GetString()).GetProperty("name").GetString());
            Assert.NotEqual(zed.GetProperty("id").GetString(), mira.GetProperty("id").GetString());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    private sealed class CharacterFactory : WebApplicationFactory<Program>
    {
        public string Token { get; } = "character-test-" + Guid.NewGuid().ToString("N");
        private readonly string? oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        private readonly string? oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        private readonly string? oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        public CharacterFactory(string directory)
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
