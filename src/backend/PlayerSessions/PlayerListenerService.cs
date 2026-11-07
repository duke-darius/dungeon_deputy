using System.Net;
using System.Net.NetworkInformation;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text.RegularExpressions;
using System.Text.Json.Serialization;
using DungeonDeputy.Api.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authentication;

namespace DungeonDeputy.Api.PlayerSessions;

public sealed record PlayerHostAddress(string Address, string InterfaceName);
public sealed record PlayerListenerStatus(bool Enabled, string? Address, string? Origin);
public sealed record StartPlayerSessionCommand(string? Address);
public sealed record CreatePlayerInviteCommand(string? CharacterId);
public sealed record ExchangeInviteCommand(string? Invite);
public sealed record RevokePlayerCommand(string? PlayerId);
public sealed record SetAssignedHitPointsCommand(int CurrentHitPoints);

/// <summary>Owns a second, explicitly started HTTP host bound to one chosen private interface address.</summary>
public sealed class PlayerListenerService(PlayerSessionService sessions, PlayerSheetService? sheets = null, PresentationState? presentation = null, PublicDisplayCredentialService? displayCredentials = null) : IAsyncDisposable
{
    private readonly PresentationState _presentation = presentation ?? new();
    private readonly PublicDisplayCredentialService _displayCredentials = displayCredentials ?? new();
    private readonly SemaphoreSlim _gate = new(1, 1);
    private WebApplication? _host;
    private string? _origin;
    private string? _boundAddress;
    private bool _networkChangeSubscribed;
    private PresentationPublisher? _publisher;

    private static bool E2ELoopbackOnly =>
        Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E") == "1" &&
        Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_E2E_AI_FAKE") == "1";

    public static IReadOnlyList<PlayerHostAddress> GetPrivateAddresses()
    {
        // Automated LAN-flow tests must not bind a private NIC: every E2E run uses
        // a fresh backend executable path, which can make Windows Firewall prompt
        // again for the same scenario. Production keeps the explicit private-NIC
        // opt-in and never exposes this test-only loopback option.
        if (E2ELoopbackOnly) return [new PlayerHostAddress(IPAddress.Loopback.ToString(), "E2E loopback only")];
        return NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType is not NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses.Select(a => (Nic: n, Address: a.Address)))
            .Where(a => IsPrivateLanAddress(a.Address))
            .Select(a => new PlayerHostAddress(a.Address.ToString(), a.Nic.Name))
            .DistinctBy(a => a.Address).OrderBy(a => a.InterfaceName, StringComparer.Ordinal).ThenBy(a => a.Address, StringComparer.Ordinal).ToArray();
    }

    public static bool IsPrivateLanAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address) || address.IsIPv4MappedToIPv6 || address.IsIPv6LinkLocal) return false;
        var b = address.GetAddressBytes();
        return address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
            ? b[0] == 10 || b[0] == 172 && b[1] is >= 16 and <= 31 || b[0] == 192 && b[1] == 168
            : address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6 && (b[0] & 0xfe) == 0xfc;
    }

    public PlayerListenerStatus Status => _host is not null && _origin is not null
        ? new PlayerListenerStatus(true, _boundAddress, _origin)
        : new PlayerListenerStatus(false, null, null);

    public async Task<PlayerListenerStatus> StartAsync(string address, CancellationToken cancellationToken = default)
    {
        if (!IPAddress.TryParse(address, out var ip) || !(IsPrivateLanAddress(ip) || E2ELoopbackOnly && IPAddress.IsLoopback(ip)) || !GetPrivateAddresses().Any(candidate => candidate.Address == ip.ToString()))
            throw new InvalidOperationException("Select an active private LAN interface address.");
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_host is not null) throw new InvalidOperationException("LAN access is already enabled.");
            var builder = WebApplication.CreateSlimBuilder();
            builder.Logging.ClearProviders(); // Prevent invite-bearing request URLs from entering framework logs.
            builder.WebHost.ConfigureKestrel(options => options.Listen(ip, 0, listen => listen.Protocols = HttpProtocols.Http1));
            builder.Services.Configure<JsonOptions>(options => { options.SerializerOptions.PropertyNameCaseInsensitive = false; options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow; });
            if (sheets is not null)
            {
                builder.Services.AddSignalR(options => options.MaximumReceiveMessageSize = 8 * 1024);
                builder.Services.AddAuthentication(PlayerCapabilityAuthenticationHandler.SchemeName)
                    .AddScheme<AuthenticationSchemeOptions, PlayerCapabilityAuthenticationHandler>(PlayerCapabilityAuthenticationHandler.SchemeName, _ => { });
                builder.Services.AddAuthorization();
                builder.Services.AddSingleton(sessions);
                builder.Services.AddSingleton(sheets);
                builder.Services.AddSingleton(new PlayerAuthorization(sessions));
                builder.Services.AddSingleton(_presentation);
                builder.Services.AddSingleton(_displayCredentials);
                builder.Services.AddSingleton<PlayerHubConnections>();
                builder.Services.AddSingleton<PresentationPublisher>();
            }
            var host = builder.Build();
            string? expectedOrigin = null;
            host.Use(async (context, next) =>
            {
                context.Response.Headers.CacheControl = "no-store";
                var websocketOrigin = expectedOrigin?.Replace("http://", "ws://", StringComparison.Ordinal);
                context.Response.Headers.ContentSecurityPolicy = $"default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' {websocketOrigin}";
                if (context.Request.Method == "OPTIONS") { context.Response.StatusCode = StatusCodes.Status405MethodNotAllowed; return; }
                var origin = context.Request.Headers.Origin.ToString();
                if (!string.IsNullOrEmpty(origin) && (expectedOrigin is null || !string.Equals(origin, expectedOrigin, StringComparison.OrdinalIgnoreCase))) { context.Response.StatusCode = StatusCodes.Status403Forbidden; return; }
                await next();
            });
            host.MapGet("/api/player/health", () => Results.Ok(new { status = "ready" }));
            host.MapGet("/join", (HttpContext context) =>
            {
                var root = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_RENDERER_DIR");
                var page = string.IsNullOrWhiteSpace(root) ? null : Path.Combine(Path.GetFullPath(root), "player.html");
                return page is not null && File.Exists(page) ? Results.File(page, "text/html; charset=utf-8") : Results.NotFound();
            });
            host.MapGet("/assets/{name}", async (string name, HttpContext context) =>
            {
                if (!Regex.IsMatch(name, "^(?:player|jsx-runtime|HubConnectionBuilder)-[A-Za-z0-9_-]+\\.(?:js|css)$", RegexOptions.CultureInvariant)) return Results.NotFound();
                var root = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_RENDERER_DIR");
                var file = string.IsNullOrWhiteSpace(root) ? null : Path.Combine(Path.GetFullPath(root), "assets", name);
                return file is not null && File.Exists(file)
                    ? Results.File(file, name.EndsWith(".css", StringComparison.Ordinal) ? "text/css" : "text/javascript")
                    : Results.NotFound();
            });
            host.MapPost("/api/player/exchange", async (HttpRequest request) =>
            {
                ExchangeInviteCommand? body;
                try { body = await request.ReadFromJsonAsync<ExchangeInviteCommand>(cancellationToken); }
                catch (JsonException) { return Results.BadRequest(); }
                if (body is null || string.IsNullOrWhiteSpace(body.Invite) || body.Invite.Length > 64) return Results.BadRequest();
                var result = sessions.ExchangeDetailed(body.Invite, DateTimeOffset.UtcNow, request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
                if (result.Grant is { } grant) return Results.Ok(new { grant.Token, grant.CharacterId, grant.ExpiresAt });
                return result.Failure switch
                {
                    "used" => Results.Json(new { error = "used" }, statusCode: StatusCodes.Status410Gone),
                    "expired" => Results.Json(new { error = "expired" }, statusCode: StatusCodes.Status410Gone),
                    "ended" => Results.Json(new { error = "ended" }, statusCode: StatusCodes.Status410Gone),
                    "throttled" => Results.Json(new { error = "throttled" }, statusCode: StatusCodes.Status429TooManyRequests),
                    _ => Results.Unauthorized()
                };
            }).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(2048));
            if (sheets is not null)
            {
                host.MapGet("/api/player/sheet", (HttpRequest request) => ToHttpResult(sheets.Get(Bearer(request))));
                host.MapPost("/api/player/commands", async (HttpRequest request, PresentationPublisher publisher, PlayerAuthorization authorization) =>
                {
                    PlayerCommand? command;
                    try { command = await request.ReadFromJsonAsync<PlayerCommand>(cancellationToken); }
                    catch (JsonException) { return Results.BadRequest(); }
                    if (command is null) return Results.BadRequest();
                    var token = Bearer(request);
                    var result = sheets.Execute(token, command);
                    if (result.Sheet is not null && authorization.Resolve(token) is { } identity)
                        await publisher.PublishSheetAsync(identity.PlayerId, cancellationToken);
                    return ToCommandResult(result);
                }).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(8192));
                host.MapHub<PlayerHub>(PlayerHub.HubPath, options => options.CloseOnAuthenticationExpiration = true).RequireAuthorization();
            }

            try { await host.StartAsync(cancellationToken); }
            catch { await host.DisposeAsync(); throw; }
            var server = host.Services.GetRequiredService<IServer>();
            var addresses = server.Features.Get<IServerAddressesFeature>()?.Addresses;
            var actual = addresses?.Select(value => Uri.TryCreate(value, UriKind.Absolute, out var uri) ? uri : null).FirstOrDefault(uri => uri is not null);
            if (actual is null) { await host.StopAsync(cancellationToken); await host.DisposeAsync(); throw new InvalidOperationException("LAN listener did not report its bound address."); }
            _host = host; _boundAddress = ip.ToString(); _origin = $"http://{(ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6 ? $"[{ip}]" : ip.ToString())}:{actual.Port}"; expectedOrigin = _origin;
            _publisher = sheets is null ? null : host.Services.GetRequiredService<PresentationPublisher>();
            if (_publisher is not null) _presentation.Changed += OnPresentationChanged;
            NetworkChange.NetworkAddressChanged += OnNetworkAddressChanged; _networkChangeSubscribed = true;
            return Status;
        }
        finally { _gate.Release(); }
    }

    private void OnPresentationChanged(PublicPresentation value)
    {
        var publisher = _publisher;
        if (publisher is not null) _ = publisher.PublishAsync(value);
    }

    public async Task RevokePlayerAsync(string playerId, CancellationToken cancellationToken = default)
    {
        if (_host is null) return;
        var publisher = _host.Services.GetService<PresentationPublisher>();
        if (publisher is not null) await publisher.RevokePlayerAsync(playerId, cancellationToken);
    }

    public async Task PublishSheetAsync(string playerId, CancellationToken cancellationToken = default)
    {
        if (_host is null) return;
        var publisher = _host.Services.GetService<PresentationPublisher>();
        if (publisher is not null) await publisher.PublishSheetAsync(playerId, cancellationToken);
    }

    private static string? Bearer(HttpRequest request)
    {
        var header = request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? header[7..].Trim() : null;
    }
    private static IResult ToHttpResult(PlayerSheetResult result) => result.Sheet is not null ? Results.Ok(result.Sheet) : result.Error switch
    {
        "revoked" or "ended" or "expired" => Results.Json(new { error = result.Error }, statusCode: StatusCodes.Status410Gone),
        _ => Results.Unauthorized()
    };
    private static IResult ToCommandResult(PlayerSheetResult result) => result.Sheet is not null ? Results.Ok(result.Sheet) : result.Error switch
    {
        "invalid-command" => Results.BadRequest(),
        "too-many-requests" => Results.Json(new { error = "too-many-requests" }, statusCode: StatusCodes.Status429TooManyRequests),
        "revoked" or "ended" or "expired" => Results.Json(new { error = result.Error }, statusCode: StatusCodes.Status410Gone),
        _ => Results.Unauthorized()
    };

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (_publisher is not null)
            {
                await _publisher.EndSessionAsync(cancellationToken);
                await Task.Delay(TimeSpan.FromMilliseconds(75), cancellationToken);
            }
            _presentation.Changed -= OnPresentationChanged;
            _displayCredentials.RevokeAll();
            _publisher = null;
            if (_networkChangeSubscribed) { NetworkChange.NetworkAddressChanged -= OnNetworkAddressChanged; _networkChangeSubscribed = false; }
            if (_host is not null) { await _host.StopAsync(cancellationToken); await _host.DisposeAsync(); _host = null; }
            _origin = null; _boundAddress = null;
        }
        finally { _gate.Release(); }
    }

    private void OnNetworkAddressChanged(object? sender, EventArgs args) => _ = FailClosedAfterNetworkChangeAsync();
    private async Task FailClosedAfterNetworkChangeAsync()
    {
        var active = sessions.GetActiveSession();
        if (active is not null) sessions.Stop(active.Id);
        await StopAsync();
    }

    public async ValueTask DisposeAsync() { await StopAsync(); _gate.Dispose(); }
}
