using System.Text.Json;
using DungeonDeputy.Api.AiPreparation;
using DungeonDeputy.Api.Srd;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class ProposalValidatorTests
{
    [Theory]
    [InlineData("npc", "{\"npcs\":[{\"name\":\"Mira\",\"description\":\"Guide\"}],\"referenceIds\":[]}")]
    [InlineData("encounter", "{\"actors\":[{\"name\":\"Bandit\",\"rationale\":\"At the gate\",\"srdRecordId\":null}],\"referenceIds\":[]}")]
    [InlineData("adventure", "{\"title\":\"Ambush\",\"scenes\":[{\"title\":\"Road\",\"description\":\"A road\"}],\"referenceIds\":[]}")]
    [InlineData("scene", "{\"description\":\"A quiet room\",\"referenceIds\":[]}")]
    [InlineData("geometry", "{\"primitives\":[{\"kind\":\"rectangle\",\"x\":10,\"y\":20,\"width\":100,\"height\":80,\"label\":\"Room\"}],\"referenceIds\":[]}")]
    public void AcceptsBoundedTypedProposalKinds(string kind, string json)
    {
        Assert.True(ProposalValidator.TryValidate(kind, json, out var proposal));
        Assert.NotNull(proposal);
        Assert.Equal(kind, proposal.Kind);
    }

    [Theory]
    [InlineData("npc", "{\"npcs\":[{\"name\":\"Mira\",\"description\":\"ok\",\"extra\":true}]}")]
    [InlineData("scene", "{\"description\":\"ok\",\"url\":\"javascript:alert(1)\"}")]
    [InlineData("geometry", "{\"primitives\":[{\"kind\":\"svg\",\"x\":0,\"y\":0,\"width\":1,\"height\":1,\"label\":\"x\"}]}")]
    [InlineData("geometry", "{\"primitives\":[{\"kind\":\"line\",\"x\":1001,\"y\":0,\"width\":1,\"height\":1,\"label\":\"x\"}]}")]
    [InlineData("scene", "{\"description\":\"ok\",\"description\":\"duplicate\"}")]
    public void RejectsUnknownDuplicateAndOutOfRangeContent(string kind, string json) =>
        Assert.False(ProposalValidator.TryValidate(kind, json, out _));

    [Fact]
    public void ReferencesAreResolvedOnlyFromCatalogAndNarrativeIsNotProvenance()
    {
        var record = new SrdRecord("srd:monster:bandit", "monster", "Bandit", "Canonical summary", null, JsonDocument.Parse("{}").RootElement.Clone(), new SrdProvenance("SRD 5.2.1", "CC-BY-4.0", "hash", 1, "Creatures", "", "hash"));
        Assert.True(ProposalValidator.TryResolveReferences([record], ["srd:monster:bandit"], out var resolved));
        Assert.Equal("Canonical summary", Assert.Single(resolved).Excerpt);
        Assert.False(ProposalValidator.TryResolveReferences([record], ["srd:monster:made-up"], out _));
        Assert.False(ProposalValidator.TryResolveReferences([record], ["srd:monster:bandit", "srd:monster:bandit"], out _));
    }

    [Fact]
    public void EditedGeometryProposalIsRevalidatedBeforeAcceptance() =>
        Assert.False(ProposalValidator.TryValidate("geometry", "{\"primitives\":[],\"referenceIds\":[]}", out _));
}
