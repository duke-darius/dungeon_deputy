using System.Net;
using DungeonDeputy.Api;
using DungeonDeputy.Api.Maps;

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
builder.Services.AddSingleton(new MapService(builder.Configuration));
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
app.MapPost("/api/map/show", (MapService maps, PresentationState presentation) => { var approved = maps.Publish(); var publicMap = maps.GetPublic()!; presentation.ShowMap(publicMap); return Results.Ok(new MapState(maps.Get().Draft, approved)); });

app.Run();

public partial class Program;
