using System.Text.Json;
using DungeonDeputy.Api;
using DungeonDeputy.Api.Realtime;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PlayerHubAuthorizationTests
{
    [Theory]
    [InlineData("/api/player/hub", "opaque", true)]
    [InlineData("/api/player/hub/negotiate", "opaque", true)]
    [InlineData("/api/player/sheet", "opaque", false)]
    [InlineData("/api/player/hubx", "opaque", false)]
    public void QueryTokenIsAcceptedOnlyOnHubPath(string path, string token, bool expected) =>
        Assert.Equal(expected, PlayerHub.TryGetHubQueryToken(path, token, out _));

    [Fact]
    public void PlayerPresentationProjectionContainsOnlySceneOrBlackoutFields()
    {
        var scene = PlayerHub.ToPlayerPresentation(new PublicPresentation("scene", "ashen-road", "The Ashen Road", "A road winds.", "map-id", "secret-image", []));
        Assert.Equal("scene", scene.Mode);
        Assert.Equal("ashen-road", scene.SceneId);
        Assert.Equal("The Ashen Road", scene.Title);
        var json = JsonSerializer.Serialize(scene);
        Assert.DoesNotContain("secret-image", json);
        Assert.DoesNotContain("map-id", json);
        Assert.DoesNotContain("tokens", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("imageData", json, StringComparison.OrdinalIgnoreCase);

        var black = PlayerHub.ToPlayerPresentation(new PublicPresentation("black", null, null, null));
        Assert.Equal("black", black.Mode);
        Assert.Null(black.Title);
    }

    [Fact]
    public void DisplayCapabilitiesAreReadOnlyBoundedAndRevocable()
    {
        var capabilities = new PublicDisplayCredentialService();
        var grants = Enumerable.Range(0, 4).Select(_ => capabilities.Issue()).ToArray();
        Assert.All(grants, grant => Assert.True(capabilities.IsValid(grant)));
        Assert.DoesNotContain("shared-desktop-token", grants);
        Assert.Throws<InvalidOperationException>(() => capabilities.Issue());
        capabilities.RevokeAll();
        Assert.All(grants, grant => Assert.False(capabilities.IsValid(grant)));
    }
}
