using System.Net;
using DungeonDeputy.Api;
using DungeonDeputy.Api.Encounters;
using DungeonDeputy.Api.Maps;
using DungeonDeputy.Api.Srd;
using DungeonDeputy.Api.Characters;
using DungeonDeputy.Api.PlayerSessions;
using DungeonDeputy.Api.Realtime;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);
var dataDirectory = builder.Configuration["DUNGEON_DEPUTY_DATA_DIR"] ?? Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_DATA_DIR");
if (string.IsNullOrWhiteSpace(dataDirectory))
    throw new InvalidOperationException("DUNGEON_DEPUTY_DATA_DIR is required; launch the backend through Dungeon Deputy so it can use your per-user data folder.");
Directory.CreateDirectory(Path.GetFullPath(dataDirectory));
var portValue = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
if (!int.TryParse(portValue, out var port) || port is < 1 or > 65535)
    throw new InvalidOperationException("DUNGEON_DEPUTY_PORT must be a valid TCP port.");

builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));
builder.Services.AddSingleton<PresentationState>();
builder.Services.AddSingleton<PublicDisplayCredentialService>();
builder.Services.AddSingleton(new MapService(builder.Configuration));
builder.Services.AddSingleton<MapVisualMutationGate>();
builder.Services.AddSingleton<IConditionCatalog, BuiltInConditionCatalog>();
builder.Services.AddSingleton<SrdCatalog>();
builder.Services.AddSingleton<CharacterService>();
builder.Services.AddSingleton(sp => new PlayerSessionService(Path.GetFullPath(dataDirectory)));
builder.Services.AddSingleton<PlayerAuthorization>();
builder.Services.AddSingleton<PlayerSheetService>();
builder.Services.AddSingleton<PlayerListenerService>();
builder.Services.AddSingleton(sp => new EncounterService(builder.Configuration, sp.GetRequiredService<MapService>(), sp.GetRequiredService<IConditionCatalog>()));
var app = builder.Build();

app.Use(async (context, next) =>
{
    var token = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_TOKEN");
    var supplied = context.Request.Headers["X-Dungeon-Token"].ToString();
    if (string.IsNullOrEmpty(token) || !System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
        System.Text.Encoding.UTF8.GetBytes(token), System.Text.Encoding.UTF8.GetBytes(supplied)))
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }
    await next();
});

app.MapGet("/health", () => Results.Ok(new { status = "ready" }));
app.MapGet("/api/scenes", (PresentationState state) => Results.Ok(state.SceneIds));
app.MapGet("/api/presentation", (PresentationState state) => Results.Ok(state.PublicPresentation));
app.MapPost("/api/selection/{sceneId}", (string sceneId, PresentationState state) =>
    state.Select(sceneId) ? Results.NoContent() : Results.NotFound());
app.MapPost("/api/show/{sceneId?}", (string? sceneId, PresentationState state) =>
    state.Show(sceneId) ? Results.Ok(state.PublicPresentation) : Results.BadRequest());
app.MapPost("/api/blackout", (PresentationState state) =>
{
    state.Blackout();
    return Results.Ok(state.PublicPresentation);
});
app.MapGet("/api/srd/search", (string? q, string? category, SrdCatalog catalog) => Results.Ok(catalog.Search(q, category)));
app.MapGet("/api/srd/records/{id}", (string id, SrdCatalog catalog) => catalog.Find(id) is { } record ? Results.Ok(record) : Results.NotFound());
app.MapGet("/api/srd/coverage", (SrdCatalog catalog) => Results.Ok(catalog.Coverage));
app.MapGet("/api/srd/metadata", (SrdCatalog catalog) => Results.Ok(catalog.Manifest));
app.MapGet("/api/characters", (CharacterService characters) => Results.Ok(characters.List()));
app.MapGet("/api/characters/{id}", (string id, CharacterService characters) => characters.Get(id) is { } record ? Results.Ok(record) : Results.NotFound());
app.MapPost("/api/characters", (CharacterInput? input, CharacterService characters) =>
{
    var record = characters.Create(input);
    return record is null ? Results.BadRequest() : Results.Created($"/api/characters/{record.Id}", record);
}).WithMetadata(new RequestSizeLimitAttribute(16_384));
app.MapPut("/api/characters/{id}", (string id, CharacterInput? input, CharacterService characters) =>
{
    var record = characters.Update(id, input);
    return record is null ? Results.BadRequest() : Results.Ok(record);
}).WithMetadata(new RequestSizeLimitAttribute(16_384));
app.MapDelete("/api/characters/{id}", (string id, CharacterService characters) => characters.Delete(id) ? Results.NoContent() : Results.NotFound());
app.MapGet("/api/player-session", (PlayerSessionService sessions, PlayerListenerService listener) => Results.Ok(new { session = sessions.GetActiveSession(), listener = listener.Status }));
app.MapPost("/api/player-session/display-token", (PlayerSessionService sessions, PlayerListenerService listener, PublicDisplayCredentialService credentials) =>
{
    if (sessions.GetActiveSession() is null || !listener.Status.Enabled) return Results.Conflict();
    try { return Results.Ok(new { token = credentials.Issue(), listener.Status.Origin }); }
    catch (InvalidOperationException) { return Results.StatusCode(StatusCodes.Status429TooManyRequests); }
});
app.MapGet("/api/player-session/interfaces", () => Results.Ok(PlayerListenerService.GetPrivateAddresses()));
app.MapGet("/api/player-session/players", (PlayerSessionService sessions) => { var active = sessions.GetActiveSession(); return Results.Ok(active is null ? Array.Empty<PlayerAssignmentView>() : sessions.GetAssignments(active.Id)); });
app.MapPost("/api/player-session/start", async (StartPlayerSessionCommand? command, PlayerSessionService sessions, PlayerListenerService listener) =>
{
    if (command is null || string.IsNullOrWhiteSpace(command.Address)) return Results.BadRequest();
    if (listener.Status.Enabled) return Results.Conflict();
    var session = sessions.Start();
    try { var status = await listener.StartAsync(command.Address); return Results.Ok(new { session, listener = status, transportWarning = "HTTP is unencrypted. Other users on this Wi-Fi may observe or interfere with traffic; use only a trusted private LAN." }); }
    catch (Exception error) when (error is InvalidOperationException or IOException or System.Net.Sockets.SocketException)
    { sessions.Stop(session.Id); return Results.BadRequest(); }
}).WithMetadata(new RequestSizeLimitAttribute(2048));
app.MapPost("/api/player-session/stop", async (PlayerSessionService sessions, PlayerListenerService listener) =>
{
    var active = sessions.GetActiveSession();
    if (active is not null) sessions.Stop(active.Id);
    await listener.StopAsync();
    return Results.NoContent();
});
app.MapPost("/api/player-session/invites", (CreatePlayerInviteCommand? command, PlayerSessionService sessions, PlayerListenerService listener, CharacterService characters) =>
{
    var session = sessions.GetActiveSession(); var status = listener.Status;
    if (command is null || string.IsNullOrWhiteSpace(command.CharacterId) || session is null || !status.Enabled || characters.Get(command.CharacterId) is null) return Results.BadRequest();
    var invite = sessions.CreateInvite(session.Id, command.CharacterId);
    return invite is null ? Results.Conflict() : Results.Ok(new { invite.Id, invite.CharacterId, invite.Secret, invite.ExpiresAt, Url = $"{status.Origin}/join?invite={Uri.EscapeDataString(invite.Secret)}", warning = "One use only. This HTTP invitation is not encrypted; share only on a trusted private LAN." });
}).WithMetadata(new RequestSizeLimitAttribute(2048));
app.MapPost("/api/player-session/revoke", async (RevokePlayerCommand? command, PlayerSessionService sessions, PlayerListenerService listener) =>
{
    var session = sessions.GetActiveSession();
    if (command is null || string.IsNullOrWhiteSpace(command.PlayerId) || session is null) return Results.BadRequest();
    if (!sessions.Revoke(session.Id, command.PlayerId)) return Results.NotFound();
    await listener.RevokePlayerAsync(command.PlayerId);
    return Results.NoContent();
}).WithMetadata(new RequestSizeLimitAttribute(2048));
app.MapPut("/api/player-session/players/{playerId}/hp", async (string playerId, SetAssignedHitPointsCommand? command, PlayerSessionService sessions, PlayerListenerService listener, CharacterService characters) =>
{
    var session = sessions.GetActiveSession();
    var assignment = session is null ? null : sessions.GetAssignments(session.Id).SingleOrDefault(player => player.PlayerId == playerId);
    var character = assignment is null ? null : characters.Get(assignment.CharacterId);
    if (command is null || assignment is null || character is null || command.CurrentHitPoints < 0 || command.CurrentHitPoints > character.HitPointMaximum) return Results.BadRequest();
    if (!sessions.SetCurrentHitPoints(session!.Id, playerId, command.CurrentHitPoints, character.HitPointMaximum)) return Results.NotFound();
    await listener.PublishSheetAsync(playerId);
    return Results.Ok(new { currentHitPoints = command.CurrentHitPoints });
}).WithMetadata(new RequestSizeLimitAttribute(2048));
app.MapPost("/api/encounter/monsters", (SrdAddMonsterCommand? command, SrdCatalog catalog, EncounterService encounters) =>
{
    if (command is null || string.IsNullOrWhiteSpace(command.MonsterId) || catalog.Find(command.MonsterId) is not { } record) return Results.BadRequest();
    return encounters.AddMonster(record) ? Results.Ok(encounters.Get()) : Results.BadRequest();
});
app.MapGet("/api/map", (MapService maps) => Results.Ok(maps.Get()));
app.MapPut("/api/map/draft", (MapDocument map, MapService maps) => maps.Save(map) ? Results.NoContent() : Results.BadRequest());
app.MapPost("/api/map/token", (MapToken token, MapService maps) => maps.AddToken(token) ? Results.Ok(maps.Get()) : Results.BadRequest());
app.MapPatch("/api/map/token/{id}", (string id, TokenCommand change, MapService maps) => maps.ChangeToken(id, change) ? Results.Ok(maps.Get()) : Results.BadRequest());
app.MapDelete("/api/map/token/{id}", (string id, MapService maps) => maps.RemoveToken(id) ? Results.Ok(maps.Get()) : Results.NotFound());
app.MapPost("/api/map/blank", (MapService maps) =>
{
    var current = maps.Get().Draft;
    return maps.Save(current with { Id = Guid.NewGuid().ToString("N"), Name = "Untitled map", Image = "", Tokens = [] }) ? Results.Ok(maps.Get()) : Results.BadRequest();
});
app.MapPost("/api/map/show", (MapPublication? publication, MapService maps, PresentationState presentation, MapVisualMutationGate visualGate) => visualGate.Run<IResult>(() => { if (publication is null) return Results.BadRequest(); try { var approved = maps.Publish(publication.ImageData); var publicMap = maps.GetPublic()!; presentation.ShowMap(publicMap); return Results.Ok(new MapState(maps.Get().Draft, approved)); } catch (InvalidOperationException) { return Results.BadRequest(); } }));
app.MapPost("/api/map/fog/enable", (FogEnableCommand? command, MapService maps, PresentationState presentation, MapVisualMutationGate visualGate) => visualGate.Run<IResult>(() =>
{
    if (command is null) return Results.BadRequest();
    var committed = maps.EnableFog(command.ImageData);
    if (committed is null) return Results.BadRequest();
    presentation.RefreshMap(MapService.Project(committed));
    return Results.Ok(maps.Get());
}));
app.MapPost("/api/map/fog/strokes", (FogCommand command, MapService maps, PresentationState presentation, MapVisualMutationGate visualGate) => visualGate.Run<IResult>(() =>
{
    var committed = maps.ApplyFogWithImage(command);
    if (committed is null) return Results.BadRequest();
    presentation.RefreshMap(MapService.Project(committed));
    return Results.Ok(maps.Get());
}));
app.MapPatch("/api/map/token/{id}/visibility", (string id, VisibilityCommand? command, MapService maps, PresentationState presentation, MapVisualMutationGate visualGate) => visualGate.Run<IResult>(() =>
{
    if (command is null) return Results.BadRequest();
    var committed = maps.ChangeTokenVisibility(id, command.Visible, command.ImageData);
    if (committed is null) return Results.BadRequest();
    presentation.RefreshMap(MapService.Project(committed));
    return Results.Ok(maps.Get());
}));
app.MapPost("/api/map/show-encounter", (MapPublication? publication, MapService maps, PresentationState presentation, MapVisualMutationGate visualGate) => visualGate.Run<IResult>(() =>
{
    if (publication is null || string.IsNullOrEmpty(publication.ImageData)) return Results.BadRequest();
    var saved = maps.Save(maps.Get().Draft with { ImageData = publication.ImageData });
    if (!saved) return Results.BadRequest();
    presentation.ShowMap(maps.ProjectDraft());
    return Results.Ok(presentation.PublicPresentation);
}));

app.MapGet("/api/encounter", (EncounterService encounters) => Results.Ok(encounters.Get()));
app.MapPut("/api/encounter/actors/{id}/hp", (string id, HpCommand command, EncounterService encounters) => encounters.SetHp(id, command) ? Results.Ok(encounters.Get()) : Results.BadRequest());
app.MapPut("/api/encounter/actors/{id}/conditions", (string id, ConditionsCommand command, EncounterService encounters) => encounters.SetConditions(id, command) ? Results.Ok(encounters.Get()) : Results.BadRequest());
app.MapPut("/api/encounter/actors/{id}/initiative", (string id, InitiativeCommand command, EncounterService encounters) => encounters.SetInitiative(id, command) ? Results.Ok(encounters.Get()) : Results.BadRequest());
app.MapPost("/api/encounter/actors/{id}/initiative/roll", (string id, EncounterService encounters) => encounters.RollInitiative(id) ? Results.Ok(encounters.Get()) : Results.BadRequest());
app.MapPost("/api/encounter/initiative/order", (InitiativeOrderCommand command, EncounterService encounters) => encounters.ReorderInitiative(command) ? Results.Ok(new { actors = encounters.Get().Actors }) : Results.BadRequest());
app.MapPost("/api/encounter/turn/end", (EncounterService encounters) =>
{
    try { return Results.Ok(encounters.EndTurn()); }
    catch (InvalidOperationException) { return Results.BadRequest(); }
});
app.MapPost("/api/encounter/dice", (DiceCommand command, EncounterService encounters) =>
{
    var result = encounters.RollDice(command);
    return result is null ? Results.BadRequest() : Results.Ok(new { result.Sides, result.Face, result.Modifier, result.Total });
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    var sessions = app.Services.GetRequiredService<PlayerSessionService>();
    var active = sessions.GetActiveSession();
    if (active is not null) sessions.Stop(active.Id);
    app.Services.GetRequiredService<PlayerListenerService>().StopAsync().GetAwaiter().GetResult();
});

app.Run();

public partial class Program;
