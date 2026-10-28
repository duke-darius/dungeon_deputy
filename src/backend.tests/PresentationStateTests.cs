using System.Text.Json;
using DungeonDeputy.Api;
using Microsoft.AspNetCore.Mvc.Testing;
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

public sealed class PresentationApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public PresentationApiTests(WebApplicationFactory<Program> factory)
    {
        Environment.SetEnvironmentVariable("DUNGEON_DEPUTY_PORT", "43128");
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SelectionRemainsPrivateUntilShowThenBlackoutReturnsBlack()
    {
        Assert.Equal(System.Net.HttpStatusCode.NoContent,
            (await _client.PostAsync("/api/selection/ashen-road", null)).StatusCode);
        var privateProjection = await _client.GetStringAsync("/api/presentation");
        Assert.Contains("black", privateProjection);

        Assert.Equal(System.Net.HttpStatusCode.OK,
            (await _client.PostAsync("/api/show", null)).StatusCode);
        var published = await _client.GetStringAsync("/api/presentation");
        Assert.Contains("ashen-road", published);
        Assert.DoesNotContain("selectedScene", published, StringComparison.OrdinalIgnoreCase);

        Assert.Equal(System.Net.HttpStatusCode.OK,
            (await _client.PostAsync("/api/blackout", null)).StatusCode);
        Assert.Contains("black", await _client.GetStringAsync("/api/presentation"));
    }

    [Fact]
    public async Task InvalidSceneIdentifierIsRejected()
    {
        var response = await _client.PostAsync("/api/selection/%2e%2e%2fprivate", null);
        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }
}
