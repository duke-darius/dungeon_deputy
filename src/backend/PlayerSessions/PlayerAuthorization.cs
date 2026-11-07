namespace DungeonDeputy.Api.PlayerSessions;

/// <summary>Default-deny current-assignment resolver; callers never supply entitlement identity.</summary>
public sealed class PlayerAuthorization(PlayerSessionService sessions)
{
    public PlayerIdentity? Resolve(string? bearerToken, string? claimedCharacterId = null) =>
        sessions.Authorize(bearerToken, claimedCharacterId);

    public string? Failure(string? bearerToken) => sessions.AuthorizationFailure(bearerToken);
}
