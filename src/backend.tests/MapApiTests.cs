using DungeonDeputy.Api.Maps;
using DungeonDeputy.Api;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class MapApiTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "dungeon-map-test-" + Guid.NewGuid().ToString("N"));
    private MapService Open() { var settings = new Dictionary<string,string?> { ["DUNGEON_DEPUTY_DATA_DIR"] = _directory }; return new MapService(new ConfigurationBuilder().AddInMemoryCollection(settings).Build()); }
    [Fact]
    public void DraftAndApprovedSnapshotRemainIndependentAcrossDatabaseReopen()
    {
        var service=Open(); var original=service.Get();
        Assert.Equal(7,original.Draft.Tokens.Count); Assert.Null(original.Approved);
        service.Publish(); var published=service.Get().Approved!;
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
        service.Publish(); presentation.ShowMap(service.GetPublic()!);
        var approved=service.GetPublic()!;
        Assert.Equal("map", approved.Mode); Assert.Equal(draft.Id, approved.Id); Assert.Equal(7, approved.Tokens.Count);
        Assert.True(service.Save(draft with { Id="private-change", Image="", Tokens=[] }));
        var afterDraftEdit=service.GetPublic()!;
        Assert.Equal((approved.Id,approved.Image,approved.GridVisible,approved.Scale,approved.Tokens[0]),(afterDraftEdit.Id,afterDraftEdit.Image,afterDraftEdit.GridVisible,afterDraftEdit.Scale,afterDraftEdit.Tokens[0]));
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
        var service = Open(); var draft = service.Get().Draft;
        Assert.All(draft.Tokens, token => Assert.True(token.Visible));
        Assert.True(service.EnableFog());
        Assert.True(service.ApplyFog(new FogCommand("reveal", [new FogStamp(25, 40, 10)])));
        Assert.True(service.ChangeTokenVisibility(draft.Tokens[0].Id, false));
        var reopened = Open(); var saved = reopened.Get().Draft;
        Assert.True(saved.FogEnabled);
        Assert.Single(saved.FogStrokes!);
        Assert.False(saved.Tokens[0].Visible);
        var projection = reopened.ProjectDraft();
        Assert.Equal("", projection.Image);
        Assert.DoesNotContain(projection.Tokens, token => token.Id == draft.Tokens[0].Id);
        Assert.Single(projection.RevealedTerrain);
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
}
