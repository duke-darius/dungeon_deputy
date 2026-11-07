using DungeonDeputy.Api.PlayerSessions;
using Microsoft.Data.Sqlite;
using Xunit;

namespace DungeonDeputy.Api.Tests;

public sealed class PlayerSessionTests
{
    [Fact]
    public void InviteIsSingleUseAndOnlyHashOfIssuedCapabilityIsPersisted()
    {
        using var fixture = new SessionFixture();
        var session = fixture.Service.Start();
        var invite = fixture.Service.CreateInvite(session.Id, "character-1");
        Assert.NotNull(invite);
        var first = fixture.Service.Exchange(invite!.Secret, DateTimeOffset.UtcNow);
        Assert.NotNull(first);
        Assert.Equal("character-1", fixture.Service.Authorize(first!.Token)?.CharacterId);
        Assert.Equal("used", fixture.Service.ExchangeDetailed(invite.Secret, DateTimeOffset.UtcNow).Failure);
        SqliteConnection.ClearAllPools();
        Assert.DoesNotContain(first.Token, Convert.ToHexString(File.ReadAllBytes(fixture.DatabasePath)), StringComparison.Ordinal);
    }

    [Fact]
    public void ExpiredInvitesAreRejectedAndGuessesAreThrottled()
    {
        using var fixture = new SessionFixture();
        var session = fixture.Service.Start();
        var invite = fixture.Service.CreateInvite(session.Id, "character-1")!;
        Assert.Equal("expired", fixture.Service.ExchangeDetailed(invite.Secret, invite.ExpiresAt.AddSeconds(1)).Failure);
        for (var i = 0; i < PlayerSessionService.MaxFailedInviteAttempts - 1; i++)
            Assert.Equal("invalid", fixture.Service.ExchangeDetailed("not-a-valid-invite", DateTimeOffset.UtcNow).Failure);
        Assert.True(fixture.Service.IsInviteExchangeThrottled(DateTimeOffset.UtcNow));
        Assert.Equal("throttled", fixture.Service.ExchangeDetailed("another-invalid", DateTimeOffset.UtcNow).Failure);
        Assert.False(fixture.Service.IsInviteExchangeThrottled("another-client", DateTimeOffset.UtcNow));
    }

    [Fact]
    public void ExpiredPlayerCapabilityIsRejectedByCurrentAssignmentAuthorization()
    {
        using var fixture = new SessionFixture();
        var session = fixture.Service.Start();
        var now = DateTimeOffset.UtcNow;
        var invite = fixture.Service.CreateInvite(session.Id, "character-1", now)!;
        var grant = fixture.Service.ExchangeDetailed(invite.Secret, now).Grant!;
        Assert.NotNull(fixture.Service.Authorize(grant.Token, now: grant.ExpiresAt.AddTicks(-1)));
        Assert.Null(fixture.Service.Authorize(grant.Token, now: grant.ExpiresAt.AddTicks(1)));
        Assert.Equal("expired", fixture.Service.AuthorizationFailure(grant.Token, grant.ExpiresAt.AddTicks(1)));
    }

    [Fact]
    public void RevocationSessionStopAndProcessRestartInvalidateAllIssuedCredentials()
    {
        using var fixture = new SessionFixture();
        var session = fixture.Service.Start();
        var invite = fixture.Service.CreateInvite(session.Id, "character-1")!;
        var grant = fixture.Service.Exchange(invite.Secret, DateTimeOffset.UtcNow)!;
        Assert.True(fixture.Service.Revoke(session.Id, grant.PlayerId));
        Assert.Null(fixture.Service.Authorize(grant.Token));

        var next = fixture.Service.Start();
        var invite2 = fixture.Service.CreateInvite(next.Id, "character-2")!;
        var grant2 = fixture.Service.Exchange(invite2.Secret, DateTimeOffset.UtcNow)!;
        Assert.True(fixture.Service.Stop(next.Id));
        Assert.Null(fixture.Service.Authorize(grant2.Token));
        fixture.Reopen();
        Assert.Null(fixture.Service.Authorize(grant2.Token));
        Assert.Null(fixture.Service.GetActiveSession());
    }

    [Fact]
    public void TokensAreIndependentAndAssignmentsAreServerResolved()
    {
        using var fixture = new SessionFixture();
        var session = fixture.Service.Start();
        var firstInvite = fixture.Service.CreateInvite(session.Id, "character-1")!;
        var first = fixture.Service.Exchange(firstInvite.Secret, DateTimeOffset.UtcNow)!;
        var secondInvite = fixture.Service.CreateInvite(session.Id, "character-2")!;
        var second = fixture.Service.Exchange(secondInvite.Secret, DateTimeOffset.UtcNow)!;
        Assert.NotEqual(first.Token, second.Token);
        Assert.NotEqual(first.PlayerId, second.PlayerId);
        Assert.Equal("character-1", fixture.Service.Authorize(first.Token)?.CharacterId);
        Assert.Equal("character-2", fixture.Service.Authorize(second.Token)?.CharacterId);
        Assert.Null(fixture.Service.Authorize("malformed"));
        Assert.Null(fixture.Service.Authorize(first.Token, "character-2"));
    }

    [Fact]
    public void SessionAllowsOnlyTwoDistinctCharacterAssignments()
    {
        using var fixture = new SessionFixture();
        var session = fixture.Service.Start();
        Assert.NotNull(fixture.Service.CreateInvite(session.Id, "character-1"));
        Assert.NotNull(fixture.Service.CreateInvite(session.Id, "character-2"));
        Assert.Null(fixture.Service.CreateInvite(session.Id, "character-3"));
        Assert.Null(fixture.Service.CreateInvite(session.Id, "character-1"));
    }

    private sealed class SessionFixture : IDisposable
    {
        private readonly string _directory = Path.Combine(Path.GetTempPath(), "dd-player-" + Guid.NewGuid().ToString("N"));
        public string DatabasePath => Path.Combine(_directory, "dungeon-deputy.sqlite3");
        public PlayerSessionService Service { get; private set; }
        public SessionFixture() { Directory.CreateDirectory(_directory); Service = new PlayerSessionService(_directory); }
        public void Reopen() => Service = new PlayerSessionService(_directory);
        public void Dispose() { Service.Dispose(); try { Directory.Delete(_directory, true); } catch { } }
    }
}
