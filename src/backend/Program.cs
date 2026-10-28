using System.Net;
using DungeonDeputy.Api;

var builder = WebApplication.CreateBuilder(args);
var portValue = Environment.GetEnvironmentVariable("DUNGEON_DEPUTY_PORT");
if (!int.TryParse(portValue, out var port) || port is < 1 or > 65535)
    throw new InvalidOperationException("DUNGEON_DEPUTY_PORT must be a valid TCP port.");

builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, port));
builder.Services.AddSingleton<PresentationState>();
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

app.Run();

public partial class Program;
