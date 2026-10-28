using System.Text.Json;
using DungeonDeputy.Api;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PresentationStateTests
{
    [Fact]
    public void SelectingSceneDoesNotPublishIt()
    {
        var state = new PresentationState();
        Assert.True(state.Select("ashen-road"));
        Assert.Equal("ashen-road", state.SelectedSceneId);
        Assert.Equal("black", state.PublicPresentation.Mode);
    }

    [Fact]
    public void ShowPublishesAllowlistedSceneAndBlackoutClearsIt()
    {
        var state = new PresentationState();
        Assert.True(state.Select("moonlit-fen"));
        Assert.True(state.Show());
        Assert.Equal("moonlit-fen", state.PublicPresentation.SceneId);
        Assert.Contains("Title", JsonSerializer.Serialize(state.PublicPresentation));
        Assert.DoesNotContain("SelectedSceneId", JsonSerializer.Serialize(state.PublicPresentation));
        state.Blackout();
        Assert.Equal("black", state.PublicPresentation.Mode);
        Assert.Null(state.PublicPresentation.SceneId);
    }

    [Fact]
    public void UnknownSceneCannotBeSelectedOrShown()
    {
        var state = new PresentationState();
        Assert.False(state.Select("../../private"));
        Assert.False(state.Show("../../private"));
    }
}
