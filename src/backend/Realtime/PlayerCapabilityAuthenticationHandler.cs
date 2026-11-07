using System.Security.Claims;
using System.Text.Encodings.Web;
using DungeonDeputy.Api.PlayerSessions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace DungeonDeputy.Api.Realtime;

public sealed class PlayerCapabilityAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "PlayerCapability";
    private readonly PlayerAuthorization _authorization;
    private readonly PublicDisplayCredentialService _displays;

    public PlayerCapabilityAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
        UrlEncoder encoder, PlayerAuthorization authorization, PublicDisplayCredentialService displays)
        : base(options, logger, encoder) { _authorization = authorization; _displays = displays; }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var request = Request;
        var header = request.Headers.Authorization.ToString();
        var token = header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? header[7..].Trim()
            : PlayerHub.TryGetHubQueryToken(request.Path.Value, request.Query["access_token"].ToString(), out var queryToken) ? queryToken : null;
        if (token is null) return Task.FromResult(AuthenticateResult.NoResult());

        ClaimsIdentity identity;
        DateTimeOffset expiry;
        if (_authorization.Resolve(token) is { } player)
        {
            identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, player.PlayerId), new Claim(ClaimTypes.Role, "Player")], SchemeName);
            expiry = player.ExpiresAt;
        }
        else if (_displays.TryGetExpiry(token, out expiry))
            identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "public-display"), new Claim(ClaimTypes.Role, "PublicDisplay")], SchemeName);
        else return Task.FromResult(AuthenticateResult.Fail("Invalid or expired capability."));

        var properties = new AuthenticationProperties { ExpiresUtc = expiry };
        var principal = new ClaimsPrincipal(identity);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, properties, SchemeName)));
    }
}
