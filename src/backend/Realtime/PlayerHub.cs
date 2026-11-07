using DungeonDeputy.Api.PlayerSessions;
using Microsoft.AspNetCore.SignalR;

namespace DungeonDeputy.Api.Realtime;

public sealed record PlayerPresentation(string Mode, string? SceneId, string? Title, string? Description);
public sealed record PlayerHubSnapshot(PlayerSheetProjection Sheet, PlayerPresentation Presentation);

/// <summary>Tracks only server-authenticated connections; client-selected group names are never accepted.</summary>
public sealed class PlayerHubConnections
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, (string Token, PlayerIdentity Identity)> _connections = new(StringComparer.Ordinal);
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, string> _displays = new(StringComparer.Ordinal);
    public IReadOnlyCollection<KeyValuePair<string, (string Token, PlayerIdentity Identity)>> All => _connections.ToArray();
    public void Add(string id, string token, PlayerIdentity identity) => _connections[id] = (token, identity);
    public void Remove(string id) => _connections.TryRemove(id, out _);
    public IReadOnlyCollection<KeyValuePair<string, string>> Displays => _displays.ToArray();
    public void AddDisplay(string id, string token) => _displays[id] = token;
    public void RemoveDisplay(string id) => _displays.TryRemove(id, out _);
}

public sealed class PlayerHub(
    PlayerAuthorization authorization,
    PlayerSheetService sheets,
    PresentationState presentation,
    PlayerHubConnections connections,
    PublicDisplayCredentialService displayCredentials) : Hub
{
    public const string HubPath = "/api/player/hub";

    /// <summary>Only this exact endpoint may consume SignalR's browser query-string transport token.</summary>
    public static bool TryGetHubQueryToken(string? path, string? candidate, out string token)
    {
        token = string.Empty;
        if (path is not (HubPath or HubPath + "/negotiate") || string.IsNullOrWhiteSpace(candidate) || candidate.Length > 64) return false;
        token = candidate;
        return true;
    }

    public static PlayerPresentation ToPlayerPresentation(PublicPresentation current)
    {
        if (current.Mode == "scene" && !string.IsNullOrWhiteSpace(current.SceneId))
            return new("scene", current.SceneId, current.Title, current.Description);
        return new("black", null, null, null);
    }

    private string? ReadToken()
    {
        var request = Context.GetHttpContext()?.Request;
        if (request is null || !string.Equals(request.Path.Value, HubPath, StringComparison.Ordinal)) return null;
        var authorizationHeader = request.Headers.Authorization.ToString();
        if (authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return authorizationHeader[7..].Trim();
        return TryGetHubQueryToken(request.Path.Value, request.Query["access_token"].ToString(), out var token) ? token : null;
    }

    public override async Task OnConnectedAsync()
    {
        var token = ReadToken();
        var identity = authorization.Resolve(token);
        var result = token is null ? null : sheets.Get(token);
        if (identity is null && token is not null && displayCredentials.IsValid(token))
        {
            connections.AddDisplay(Context.ConnectionId, token);
            await Clients.Caller.SendAsync("DisplaySnapshot", presentation.PublicPresentation);
            await base.OnConnectedAsync();
            return;
        }
        if (identity is null || result?.Sheet is null)
        {
            Context.Abort();
            return;
        }

        connections.Add(Context.ConnectionId, token!, identity);
        await Clients.Caller.SendAsync("Snapshot", new PlayerHubSnapshot(result.Sheet, ToPlayerPresentation(presentation.PublicPresentation)));
        await base.OnConnectedAsync();
    }

    public async Task<PlayerHubSnapshot> GetSnapshot()
    {
        var token = ReadToken();
        var current = token is null ? null : authorization.Resolve(token);
        if (current is null || !connections.All.Any(entry => entry.Key == Context.ConnectionId && entry.Value.Identity == current))
        {
            Context.Abort();
            throw new HubException("Player authorization is no longer active.");
        }
        var sheet = sheets.Get(token!);
        if (sheet.Sheet is null)
        {
            Context.Abort();
            throw new HubException("Player authorization is no longer active.");
        }
        return new PlayerHubSnapshot(sheet.Sheet, ToPlayerPresentation(presentation.PublicPresentation));
    }

    public Task<PublicPresentation> GetDisplaySnapshot()
    {
        var display = connections.Displays.FirstOrDefault(entry => entry.Key == Context.ConnectionId);
        if (display.Key is null || !displayCredentials.IsValid(display.Value))
        {
            Context.Abort();
            throw new HubException("Display authorization is no longer active.");
        }
        return Task.FromResult(presentation.PublicPresentation);
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        connections.Remove(Context.ConnectionId);
        connections.RemoveDisplay(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
