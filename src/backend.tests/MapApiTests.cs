using DungeonDeputy.Api.Maps;
using DungeonDeputy.Api;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Json;
using Microsoft.Data.Sqlite;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class MapApiTests : IDisposable
{
    private static string Png() { var bytes = new byte[33]; new byte[] {137,80,78,71,13,10,26,10}.CopyTo(bytes,0); System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(8,4),13); "IHDR"u8.CopyTo(bytes.AsSpan(12,4)); System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(16,4),1200); System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(20,4),760); return "data:image/png;base64,"+Convert.ToBase64String(bytes); }
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "dungeon-map-test-" + Guid.NewGuid().ToString("N"));
    private MapService Open() { var settings = new Dictionary<string,string?> { ["DUNGEON_DEPUTY_DATA_DIR"] = _directory }; return new MapService(new ConfigurationBuilder().AddInMemoryCollection(settings).Build()); }
    [Fact]
    public void DraftAndApprovedSnapshotRemainIndependentAcrossDatabaseReopen()
    {
        var service=Open(); var original=service.Get();
        Assert.Equal(7,original.Draft.Tokens.Count); Assert.Null(original.Approved);
        service.Publish(Png()); var published=service.Get().Approved!;
        var changed=original.Draft with { Name="Private revision", GridVisible=false, Tokens=original.Draft.Tokens.Select(t=>t with { X=t.X+23 }).ToList() };
        Assert.True(service.Save(changed));
        var reopened=Open().Get();
        Assert.Equal("Private revision",reopened.Draft.Name); Assert.Equal("The Crooked Tankard",reopened.Approved!.Name);
        Assert.NotEqual(reopened.Draft.Tokens[0].X,reopened.Approved.Tokens[0].X);
    }
    [Fact]
    public void PublicMapShowSnapshotsDraftAndBlackoutSurvivesMapRefresh()
    {
        var service=Open(); var presentation=new PresentationState();
        var draft=service.Get().Draft;
        Assert.Null(service.GetPublic());
        service.Publish(Png()); presentation.ShowMap(service.GetPublic()!);
        var approved=service.GetPublic()!;
        Assert.Equal("map", approved.Mode); Assert.Equal(draft.Id, approved.Id); Assert.Equal(Png(),approved.ImageData); Assert.Equal(7, approved.Tokens.Count);
        Assert.True(service.Save(draft with { Id="private-change", Image="", Tokens=[] }));
        var afterDraftEdit=service.GetPublic()!;
        Assert.Equal((approved.Id,approved.ImageData,approved.Tokens[0]),(afterDraftEdit.Id,afterDraftEdit.ImageData,afterDraftEdit.Tokens[0]));
        presentation.Blackout();
        _=service.Get();
        Assert.Equal("black", ((PublicPresentation)presentation.PublicPresentation).Mode);
    }
    [Fact]
    public void BlankMapCanBeSavedAndReopened()
    {
        var service=Open(); var map=service.Get().Draft with { Id="blank",Name="Blank",Image="",GridVisible=false,Tokens=[] };
        Assert.True(service.Save(map)); Assert.Equal("blank",Open().Get().Draft.Id);
    }
    [Fact]
    public void DraftValidationRejectsInvalidTokenColorAndUnboundedCoordinates()
    {
        var service=Open(); var draft=service.Get().Draft;
        Assert.False(service.Save(draft with { Tokens=[draft.Tokens[0] with { Color="url(javascript:alert(1))" }] }));
        Assert.False(service.Save(draft with { Tokens=[draft.Tokens[0] with { X=double.PositiveInfinity }] }));
        Assert.False(service.Save(draft with { ImageData = "data:image/jpeg;base64," + Png().Split(',')[1] }));
        Assert.False(service.Save(draft with { ImageData = "data:image/png;base64," + new string('A', 5_600_000) }));
    }
    [Fact]
    public void TokenTransitionsPersistAndRejectUncataloguedArtwork()
    {
        var service=Open(); var token=service.Get().Draft.Tokens[0];
        Assert.True(service.ChangeToken(token.Id,new TokenCommand("Mira the Bold","hero","#123456","goblin.svg",71,92)));
        var moved=Open().Get().Draft.Tokens[0];
        Assert.Equal(("Mira the Bold","#123456","goblin.svg",71d,92d),(moved.Name,moved.Color,moved.Artwork,moved.X,moved.Y));
        Assert.False(service.ChangeToken(token.Id,new TokenCommand(null,null,null,"../../secret.svg",null,null)));
        Assert.True(service.RemoveToken(token.Id)); Assert.DoesNotContain(service.Get().Draft.Tokens,t=>t.Id==token.Id);
        Assert.True(service.AddToken(new MapToken("extra","New hero","hero","#123456",0,0)));
    }

    [Fact]
    public void FogStrokesAndTokenVisibilityPersistWhileProjectionOmitsHiddenValues()
    {
        var service = Open(); var draft = service.Get().Draft with { ImageData = Png() }; Assert.True(service.Save(draft));
        Assert.All(draft.Tokens, token => Assert.True(token.Visible));
        Assert.True(service.EnableFog());
        Assert.True(service.ApplyFog(new FogCommand("reveal", [new FogStamp(25, 40, 10)])));
        Assert.True(service.ChangeTokenVisibility(draft.Tokens[0].Id, false));
        var reopened = Open(); var saved = reopened.Get().Draft;
        Assert.True(saved.FogEnabled);
        Assert.Single(saved.FogStrokes!);
        Assert.False(saved.Tokens[0].Visible);
        var projection = reopened.ProjectDraft();
         Assert.Equal(Png(), projection.ImageData);
        Assert.DoesNotContain(projection.Tokens, token => token.Id == draft.Tokens[0].Id);
         Assert.DoesNotContain("FogStrokes", System.Text.Json.JsonSerializer.Serialize(projection));
        Assert.DoesNotContain("\"Visible\"", System.Text.Json.JsonSerializer.Serialize(projection));
    }

    [Fact]
    public void FogRejectsUnboundedCoordinatesAndStrokeGrowth()
    {
        var service = Open(); Assert.True(service.EnableFog());
        Assert.False(service.ApplyFog(new FogCommand("reveal", [new FogStamp(double.NaN, 0, 10)])));
        Assert.False(service.ApplyFog(new FogCommand("erase", [new FogStamp(0, 0, 10)])));
        Assert.False(service.ApplyFog(new FogCommand("reveal", [new FogStamp(0, 0, 5001)])));
    }

    [Fact]
    public async Task ConcurrentPartialTokenEditsPreserveEveryFieldChange()
    {
        var service=Open(); var token=service.Get().Draft.Tokens[0];
        var results=await Task.WhenAll(
            Task.Run(()=>service.ChangeToken(token.Id,new TokenCommand("Mira E2E",null,null,null,null,null))),
            Task.Run(()=>service.ChangeToken(token.Id,new TokenCommand(null,null,"#229944",null,null,null))),
            Task.Run(()=>service.ChangeToken(token.Id,new TokenCommand(null,null,null,"goblin.svg",null,null))),
            Task.Run(()=>service.ChangeToken(token.Id,new TokenCommand(null,null,null,null,300,400))));
        Assert.All(results,Assert.True);
        var saved=Open().Get().Draft.Tokens[0];
        Assert.Equal("Mira E2E",saved.Name);
        Assert.Equal("#229944",saved.Color);
        Assert.Equal("goblin.svg",saved.Artwork);
        Assert.Equal((300d,400d),(saved.X,saved.Y));
    }
    public void Dispose() { try { Directory.Delete(_directory,true); } catch {} }

    [Fact]
    public async Task AuthenticatedHttpMapShowKeepsColdStartBlackAndPublishesOnlyAfterPersistedFogUpdate()
    {
        var directory=Path.Combine(Path.GetTempPath(),"dungeon-map-http-"+Guid.NewGuid().ToString("N"));
        var factory=new MapHttpFactory(directory);
        try
        {
            using var client=factory.CreateClient();
            Assert.Equal(HttpStatusCode.Unauthorized,(await client.PostAsJsonAsync("/api/map/show-encounter",new MapPublication(Png()))).StatusCode);
            client.DefaultRequestHeaders.Add("X-Dungeon-Token","invalid-token");
            Assert.Equal(HttpStatusCode.Unauthorized,(await client.PostAsync("/api/map/fog/enable",null)).StatusCode);
            client.DefaultRequestHeaders.Remove("X-Dungeon-Token"); client.DefaultRequestHeaders.Add("X-Dungeon-Token",factory.Token);
            Assert.Equal("black",(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation"))!.Mode);
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PostAsJsonAsync("/api/map/show",new MapPublication("data:image/jpeg;base64,AAAA"))).StatusCode);
            Assert.Equal("black",(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation"))!.Mode);
            Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/map/fog/enable",new FogEnableCommand(Png()))).StatusCode);
            var afterEnable=await client.PostAsJsonAsync("/api/map/show-encounter",new MapPublication(Png())); Assert.Equal(HttpStatusCode.OK,afterEnable.StatusCode);
            var before=await afterEnable.Content.ReadFromJsonAsync<PublicPresentation>(); Assert.Equal("map",before!.Mode);
            var bad=await client.PostAsJsonAsync("/api/map/fog/strokes",new FogCommand("erase",[new FogStamp(10,10,20)],Png())); Assert.Equal(HttpStatusCode.BadRequest,bad.StatusCode);
            Assert.Equal(System.Text.Json.JsonSerializer.Serialize(before),System.Text.Json.JsonSerializer.Serialize(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation")));
            using(var db=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=Path.Combine(directory,"dungeon-deputy.sqlite3")}.ToString()))
            { db.Open(); using var fail=db.CreateCommand(); fail.CommandText="CREATE TRIGGER fail_map_update BEFORE UPDATE ON map_draft BEGIN SELECT RAISE(ABORT, 'injected persistence failure'); END;"; fail.ExecuteNonQuery(); }
            var failedSave=await client.PostAsJsonAsync("/api/map/fog/strokes",new FogCommand("reveal",[new FogStamp(25,40,10)],Png())); Assert.Equal(HttpStatusCode.InternalServerError,failedSave.StatusCode);
            Assert.Equal(System.Text.Json.JsonSerializer.Serialize(before),System.Text.Json.JsonSerializer.Serialize(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation")));
            var unchanged=await client.GetFromJsonAsync<MapState>("/api/map"); Assert.Empty(unchanged!.Draft.FogStrokes!); Assert.Equal(before.ImageData,unchanged.Draft.ImageData);
            using(var db=new SqliteConnection(new SqliteConnectionStringBuilder{DataSource=Path.Combine(directory,"dungeon-deputy.sqlite3")}.ToString()))
            { db.Open(); using var drop=db.CreateCommand(); drop.CommandText="DROP TRIGGER fail_map_update;"; drop.ExecuteNonQuery(); }
            var pngBytes=Convert.FromBase64String(Png().Split(',')[1]); pngBytes[^1]^=1;
            var supplied="data:image/png;base64,"+Convert.ToBase64String(pngBytes);
            var saved=await client.PostAsJsonAsync("/api/map/fog/strokes",new FogCommand("reveal",[new FogStamp(25,40,10)],supplied)); Assert.Equal(HttpStatusCode.OK,saved.StatusCode);
            Assert.Equal(supplied,(await client.GetFromJsonAsync<MapState>("/api/map"))!.Draft.ImageData);
            var current=await client.GetFromJsonAsync<PublicPresentation>("/api/presentation");
            Assert.Equal(supplied,current!.ImageData);
            var token=(await client.GetFromJsonAsync<MapState>("/api/map"))!.Draft.Tokens[0];
            var hidden=await client.PatchAsJsonAsync($"/api/map/token/{token.Id}/visibility",new VisibilityCommand(false,Png()));
            Assert.Equal(HttpStatusCode.OK,hidden.StatusCode);
            Assert.Equal(Png(),(await client.GetFromJsonAsync<MapState>("/api/map"))!.Draft.ImageData);
            Assert.Equal(Png(),(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation"))!.ImageData);
            Assert.DoesNotContain(token.Id,(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation"))!.Tokens!.Select(t=>t.Id));
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PatchAsJsonAsync($"/api/map/token/{token.Id}/visibility",new VisibilityCommand(true,"not-a-png"))).StatusCode);
            var enabled=await client.PostAsJsonAsync("/api/map/fog/enable",new FogEnableCommand(Png())); Assert.Equal(HttpStatusCode.OK,enabled.StatusCode);
            Assert.Equal(Png(),(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation"))!.ImageData);
            var scene=await client.PostAsync("/api/show/ashen-road",null); Assert.Equal(HttpStatusCode.OK,scene.StatusCode);
            var sceneBefore=System.Text.Json.JsonSerializer.Serialize(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation"));
            Assert.Equal(HttpStatusCode.OK,(await client.PatchAsJsonAsync($"/api/map/token/{token.Id}/visibility",new VisibilityCommand(true,Png()))).StatusCode);
            Assert.Equal(sceneBefore,System.Text.Json.JsonSerializer.Serialize(await client.GetFromJsonAsync<PublicPresentation>("/api/presentation")));
            Assert.DoesNotContain("\"Visible\":",System.Text.Json.JsonSerializer.Serialize(current));
            Assert.DoesNotContain("tavern.svg",System.Text.Json.JsonSerializer.Serialize(current));
            Assert.DoesNotContain("FogStrokes",System.Text.Json.JsonSerializer.Serialize(current));
        }
        finally { factory.Dispose(); try{Directory.Delete(directory,true);}catch{} }
    }

    private sealed class MapHttpFactory : WebApplicationFactory<Program>
    {
        public string Token { get; } = "http-test-token-"+Guid.NewGuid().ToString("N");
        private readonly string? _oldDirectory=Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
        private readonly string? _oldPort=Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
        private readonly string? _oldToken=Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
        public MapHttpFactory(string directory)
        {
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR",directory);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT","43129");
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN",Token);
        }
        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR",_oldDirectory);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT",_oldPort);
            Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN",_oldToken);
        }
    }
}
