using DungeonDeputy.Api.PlayerSessions;
using Microsoft.AspNetCore.SignalR;

namespace DungeonDeputy.Api.Realtime;

/// <summary>Publishes only to connections whose current assignment is revalidated for every event.</summary>
public sealed class PresentationPublisher(
    IHubContext<PlayerHub> hub,
    PlayerHubConnections connections,
    PlayerAuthorization authorization,
    PlayerSheetService sheets,
    PublicDisplayCredentialService displayCredentials)
{
    public async Task RevokePlayerAsync(string playerId, CancellationToken cancellationToken = default)
    {
        foreach (var entry in connections.All.Where(entry => entry.Value.Identity.PlayerId == playerId))
            await hub.Clients.Client(entry.Key).SendAsync("AccessRevoked", cancellationToken);
    }

    public async Task EndSessionAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in connections.All)
            await hub.Clients.Client(entry.Key).SendAsync("SessionEnded", cancellationToken);
        foreach (var entry in connections.Displays)
            await hub.Clients.Client(entry.Key).SendAsync("AccessRevoked", cancellationToken);
    }

    public async Task PublishSheetAsync(string playerId, CancellationToken cancellationToken = default)
    {
        foreach (var entry in connections.All.Where(entry => entry.Value.Identity.PlayerId == playerId))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var identity = authorization.Resolve(entry.Value.Token);
            var sheet = identity == entry.Value.Identity ? sheets.Get(entry.Value.Token) : null;
            if (sheet?.Sheet is null)
            {
                await hub.Clients.Client(entry.Key).SendAsync("AccessRevoked", cancellationToken);
                continue;
            }
            await hub.Clients.Client(entry.Key).SendAsync("SheetUpdated", sheet.Sheet, cancellationToken);
        }
    }

    public async Task PublishAsync(PublicPresentation presentation, CancellationToken cancellationToken = default)
    {
        var projected = PlayerHub.ToPlayerPresentation(presentation);
        foreach (var entry in connections.All)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var identity = authorization.Resolve(entry.Value.Token);
            if (identity is null || identity != entry.Value.Identity)
            {
                await hub.Clients.Client(entry.Key).SendAsync("AccessRevoked", cancellationToken);
                continue;
            }
            var sheet = sheets.Get(entry.Value.Token);
            if (sheet.Sheet is null)
            {
                await hub.Clients.Client(entry.Key).SendAsync("AccessRevoked", cancellationToken);
                continue;
            }
            await hub.Clients.Client(entry.Key).SendAsync("Presentation", projected, cancellationToken);
            await hub.Clients.Client(entry.Key).SendAsync("SheetUpdated", sheet.Sheet, cancellationToken);
        }
        foreach (var display in connections.Displays)
        {
            if (!displayCredentials.IsValid(display.Value))
                await hub.Clients.Client(display.Key).SendAsync("AccessRevoked", cancellationToken);
            else
                await hub.Clients.Client(display.Key).SendAsync("Presentation", presentation, cancellationToken);
        }
    }
}
