using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class AiProposalAcceptanceTests
{
    [Fact]
    public async Task AcceptedNarrativeIsPrivateDurableEditableAndDeletedThroughDmApi()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-narrative-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43139");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "narrative-test-token");
            var dbPath = Path.Combine(dir, "dungeon-deputy.sqlite3");
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "narrative-test-token");
            using (var unauthenticated = factory.CreateClient())
                Assert.Equal(HttpStatusCode.Unauthorized, (await unauthenticated.GetAsync("/api/ai/accepted")).StatusCode);
            var mapBefore = await client.GetStringAsync("/api/map");
            var encounterBefore = await client.GetStringAsync("/api/encounter");
            var publicBefore = await client.GetStringAsync("/api/presentation");
            const string promptSentinel = "RAW-PROMPT-SENTINEL";
            const string secretSentinel = "PROVIDER-KEY-SENTINEL";
            const string responseSentinel = "FULL-PROVIDER-RESPONSE-SENTINEL";
            var accepted = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "npc", proposalJson = "{\"npcs\":[{\"name\":\"Mira\",\"description\":\"A local innkeeper\"}],\"referenceIds\":[\"srd521:monster:bandit\"]}", selectedMonsterIds = Array.Empty<string>(), rawPrompt = promptSentinel, apiKey = secretSentinel, providerResponse = responseSentinel });
            Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
            var staleAccept = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "scene", proposalJson = "{\"description\":\"Do not save\",\"referenceIds\":[\"srd521:monster:removed\"]}", selectedMonsterIds = Array.Empty<string>() });
            Assert.Equal(HttpStatusCode.BadRequest, staleAccept.StatusCode);
            var wrongCategoryAccept = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "encounter", proposalJson = "{\"actors\":[{\"name\":\"Bad citation\",\"rationale\":\"Wrong category\",\"srdRecordId\":\"srd521:spell:light\"}],\"referenceIds\":[\"srd521:spell:light\"]}", selectedMonsterIds = Array.Empty<string>() });
            Assert.Equal(HttpStatusCode.BadRequest, wrongCategoryAccept.StatusCode);
            foreach (var (kind, json) in new[] {
                ("encounter", "{\"actors\":[{\"name\":\"Lookout\",\"rationale\":\"Keeps watch\",\"srdRecordId\":null}],\"referenceIds\":[]}"),
                ("adventure", "{\"title\":\"Lost courier\",\"scenes\":[{\"title\":\"Crossroads\",\"description\":\"A fork in the road\"}],\"referenceIds\":[]}"),
                ("scene", "{\"description\":\"Rain on the old road\",\"referenceIds\":[]}") })
                Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/ai/accept", new { kind, proposalJson = json, selectedMonsterIds = Array.Empty<string>() })).StatusCode);
            using var list = await client.GetFromJsonAsync<JsonDocument>("/api/ai/accepted");
            Assert.Equal(4, list!.RootElement.GetArrayLength());
            var id = list.RootElement[0].GetProperty("id").GetString()!;
            foreach (var (kind, json) in new[] {
                ("encounter", "{\"actors\":[{\"name\":\"Edited lookout\",\"rationale\":\"Updated note\",\"srdRecordId\":null}],\"referenceIds\":[]}"),
                ("adventure", "{\"title\":\"Edited courier\",\"scenes\":[{\"title\":\"Bridge\",\"description\":\"Updated scene\"}],\"referenceIds\":[]}"),
                ("scene", "{\"description\":\"Edited rain on the road\",\"referenceIds\":[]}") })
            {
                var acceptedId = list.RootElement.EnumerateArray().Single(item => item.GetProperty("kind").GetString() == kind).GetProperty("id").GetString();
                Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/ai/accepted/{acceptedId}", new { kind, contentJson = json })).StatusCode);
                using var edited = await client.GetFromJsonAsync<JsonDocument>($"/api/ai/accepted/{acceptedId}");
                Assert.Contains("Edited", edited!.RootElement.GetProperty("content").ToString());
            }
            var encounterId = list.RootElement.EnumerateArray().Single(item => item.GetProperty("kind").GetString() == "encounter").GetProperty("id").GetString();
            var forgedEdit = await client.PutAsJsonAsync($"/api/ai/accepted/{encounterId}", new { kind = "encounter", contentJson = "{\"actors\":[{\"name\":\"Forged\",\"rationale\":\"Wrong category\",\"srdRecordId\":\"srd521:spell:light\"}],\"referenceIds\":[\"srd521:spell:light\"]}" });
            Assert.Equal(HttpStatusCode.BadRequest, forgedEdit.StatusCode);
            using (var preserved = await client.GetFromJsonAsync<JsonDocument>($"/api/ai/accepted/{encounterId}"))
                Assert.Contains("Edited lookout", preserved!.RootElement.GetProperty("content").ToString());
            using var db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = dbPath }.ToString());
            db.Open();
            using (var read = db.CreateCommand())
            {
                read.CommandText = "SELECT group_concat(id||kind||content||references_json||campaign_id||session_id||created_at||updated_at) FROM accepted_preparation";
                var stored = (string)read.ExecuteScalar()!;
                Assert.DoesNotContain(promptSentinel, stored);
                Assert.DoesNotContain(secretSentinel, stored);
                Assert.DoesNotContain(responseSentinel, stored);
                Assert.DoesNotContain("provider-envelope", stored);
            }
            Assert.Equal(mapBefore, await client.GetStringAsync("/api/map"));
            Assert.Equal(encounterBefore, await client.GetStringAsync("/api/encounter"));
            Assert.Equal(publicBefore, await client.GetStringAsync("/api/presentation"));
            var edit = await client.PutAsJsonAsync($"/api/ai/accepted/{id}", new { kind = "npc", contentJson = "{\"npcs\":[{\"name\":\"Mira\",\"description\":\"Edited safely\"}],\"referenceIds\":[\"srd521:monster:bandit\"]}" });
            Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
            var stale = await client.PutAsJsonAsync($"/api/ai/accepted/{id}", new { kind = "npc", contentJson = "{\"npcs\":[{\"name\":\"Mira\",\"description\":\"Must not replace\"}],\"referenceIds\":[\"srd:monster:missing\"]}" });
            Assert.Equal(HttpStatusCode.BadRequest, stale.StatusCode);
            using var detail = await client.GetFromJsonAsync<JsonDocument>($"/api/ai/accepted/{id}");
            Assert.Contains("Edited safely", detail!.RootElement.GetProperty("content").ToString());
            using var restartedFactory = new WebApplicationFactory<Program>();
            using var restarted = restartedFactory.CreateClient();
            restarted.DefaultRequestHeaders.Add("X-Dungeon-Token", "narrative-test-token");
            using var afterRestart = await restarted.GetFromJsonAsync<JsonDocument>($"/api/ai/accepted/{id}");
            Assert.Contains("Edited safely", afterRestart!.RootElement.GetProperty("content").ToString());
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/ai/accepted/{id}")).StatusCode);
            using var empty = await client.GetFromJsonAsync<JsonDocument>("/api/ai/accepted");
            Assert.Equal(3, empty!.RootElement.GetArrayLength());
            Assert.DoesNotContain(empty.RootElement.EnumerateArray(), item => item.GetProperty("id").GetString() == id);
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            try { Directory.Delete(dir, true); } catch { }
        }
    }

    [Fact]
    public async Task InvalidSelectedMonsterRejectsEntireRequestAndValidGeometryStaysPrivate()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-accept-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43136");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "accept-test-token");
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "accept-test-token");
            var beforeMap = await client.GetStringAsync("/api/map");
            var beforeEncounter = await client.GetStringAsync("/api/encounter");
            var beforePublic = await client.GetStringAsync("/api/presentation");
            var invalid = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "geometry", proposalJson = "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":1,\"y\":1,\"width\":2,\"height\":2,\"label\":\"Room\"}],\"referenceIds\":[]}", selectedMonsterIds = new[] { "srd521:monster:bandit", "srd:monster:stale" } });
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
            Assert.Equal(beforeMap, await client.GetStringAsync("/api/map"));
            Assert.Equal(beforeEncounter, await client.GetStringAsync("/api/encounter"));
            var nullId = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "geometry", proposalJson = "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":1,\"y\":1,\"width\":2,\"height\":2,\"label\":\"Room\"}],\"referenceIds\":[]}", selectedMonsterIds = new[] { "srd521:monster:bandit", (string)null! } });
            Assert.Equal(HttpStatusCode.BadRequest, nullId.StatusCode);
            Assert.Equal(beforeMap, await client.GetStringAsync("/api/map"));
            Assert.Equal(beforeEncounter, await client.GetStringAsync("/api/encounter"));

            var accepted = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "geometry", proposalJson = "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":1,\"y\":1,\"width\":2,\"height\":2,\"label\":\"Room\"}],\"referenceIds\":[]}", selectedMonsterIds = Array.Empty<string>() });
            Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
            var map = await accepted.Content.ReadAsStringAsync();
            Assert.Contains("Room", map);
            Assert.Contains("rectangle", map);
            var repeated = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "geometry", proposalJson = "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":1,\"y\":1,\"width\":2,\"height\":2,\"label\":\"Room\"}],\"referenceIds\":[]}", selectedMonsterIds = Array.Empty<string>() });
            Assert.Equal(HttpStatusCode.OK, repeated.StatusCode);
            Assert.Equal(1, System.Text.Json.JsonDocument.Parse(await client.GetStringAsync("/api/map")).RootElement.GetProperty("draft").GetProperty("geometry").GetArrayLength());
            Assert.Equal(beforePublic, await client.GetStringAsync("/api/presentation"));

            var monsterAccept = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "geometry", proposalJson = "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":10,\"y\":10,\"width\":20,\"height\":20,\"label\":\"Ambush\"}],\"referenceIds\":[]}", selectedMonsterIds = new[] { "srd521:monster:bandit" } });
            Assert.Equal(HttpStatusCode.OK, monsterAccept.StatusCode);
            var encounterResponse = await client.GetAsync("/api/encounter");
            var encounterJson = await encounterResponse.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, encounterResponse.StatusCode);
            using var encounter = JsonDocument.Parse(encounterJson);
            var actor = encounter.RootElement.GetProperty("actors").EnumerateArray().Single(x => x.TryGetProperty("sourceMonsterId", out var source) && source.GetString() == "srd521:monster:bandit");
            var tokenId = actor.GetProperty("tokenId").GetString()!;
            var savedMap = await client.GetFromJsonAsync<JsonDocument>("/api/map");
            var token = savedMap!.RootElement.GetProperty("draft").GetProperty("tokens").EnumerateArray().Single(x => x.GetProperty("id").GetString() == tokenId);
            Assert.Equal("monster", token.GetProperty("kind").GetString());
            var tokenEdit = await client.PatchAsJsonAsync($"/api/map/token/{tokenId}", new { name = "Ambush Bandit" });
            Assert.Equal(HttpStatusCode.OK, tokenEdit.StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/encounter/actors/{tokenId}/initiative", new { value = 12 })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/encounter/turn/end", null)).StatusCode);
            Assert.Equal(beforePublic, await client.GetStringAsync("/api/presentation"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            try { Directory.Delete(dir, true); } catch { }
        }
    }

    [Fact]
    public async Task MapWriteFailureRollsBackMonsterActorWrittenEarlierInSameImmediateTransaction()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-rollback-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43137");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "rollback-test-token");
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "rollback-test-token");
            var beforeMap = await client.GetStringAsync("/api/map");
            var beforeEncounter = await client.GetStringAsync("/api/encounter");
            using (var db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(dir, "dungeon-deputy.sqlite3") }.ToString()))
            {
                db.Open();
                using var trigger = db.CreateCommand();
                trigger.CommandText = "CREATE TRIGGER reject_map_accept BEFORE UPDATE ON map_draft BEGIN SELECT RAISE(ABORT, 'injected map failure'); END";
                trigger.ExecuteNonQuery();
            }
            var failed = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "npc", proposalJson = "{\"npcs\":[{\"name\":\"Scout\",\"description\":\"Private narrative\"}],\"referenceIds\":[\"srd521:monster:bandit\"]}", selectedMonsterIds = new[] { "srd521:monster:bandit" } });
            Assert.Equal(HttpStatusCode.BadRequest, failed.StatusCode);
            Assert.Equal(beforeMap, await client.GetStringAsync("/api/map"));
            Assert.Equal(beforeEncounter, await client.GetStringAsync("/api/encounter"));
            using var acceptedAfterRollback = await client.GetFromJsonAsync<JsonDocument>("/api/ai/accepted");
            Assert.Empty(acceptedAfterRollback!.RootElement.EnumerateArray());
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            try { Directory.Delete(dir, true); } catch { }
        }
    }

    [Fact]
    public async Task EncounterWriteFailureLeavesMapAndPublicPresentationUnchanged()
    {
        var dir = Path.Combine(Path.GetTempPath(), "dd-ai-encounter-rollback-" + Guid.NewGuid().ToString("N"));
        var oldDir = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        var oldPort = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        var oldToken = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        try
        {
            Directory.CreateDirectory(dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", dir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43138");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", "encounter-rollback-test-token");
            using var factory = new WebApplicationFactory<Program>();
            using var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Dungeon-Token", "encounter-rollback-test-token");
            var beforeMap = await client.GetStringAsync("/api/map");
            var beforeEncounter = await client.GetStringAsync("/api/encounter");
            var beforePublic = await client.GetStringAsync("/api/presentation");
            using (var db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(dir, "dungeon-deputy.sqlite3") }.ToString()))
            {
                db.Open();
                using var trigger = db.CreateCommand();
                trigger.CommandText = "CREATE TRIGGER reject_encounter_accept BEFORE UPDATE ON private_encounter BEGIN SELECT RAISE(ABORT, 'injected encounter failure'); END";
                trigger.ExecuteNonQuery();
            }
            var failed = await client.PostAsJsonAsync("/api/ai/accept", new { kind = "geometry", proposalJson = "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":10,\"y\":10,\"width\":20,\"height\":20,\"label\":\"Fail\"}],\"referenceIds\":[]}", selectedMonsterIds = new[] { "srd521:monster:bandit" } });
            Assert.Equal(HttpStatusCode.BadRequest, failed.StatusCode);
            using (var db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(dir, "dungeon-deputy.sqlite3") }.ToString()))
            {
                db.Open(); using var drop = db.CreateCommand(); drop.CommandText = "DROP TRIGGER reject_encounter_accept"; drop.ExecuteNonQuery();
            }
            Assert.Equal(beforeMap, await client.GetStringAsync("/api/map"));
            Assert.Equal(beforeEncounter, await client.GetStringAsync("/api/encounter"));
            Assert.Equal(beforePublic, await client.GetStringAsync("/api/presentation"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR", oldDir);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN", oldToken);
            try { Directory.Delete(dir, true); } catch { }
        }
    }
}
