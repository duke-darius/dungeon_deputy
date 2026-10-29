using DungeonDeputy.Api.Maps;

namespace DungeonDeputy.Api;

public sealed record PublicPresentation(string Mode, string? SceneId, string? Title, string? Description, string? Id = null, string? Image = null, bool? GridVisible = null, double? Scale = null, List<PublicToken>? Tokens = null, List<FogStroke>? RevealedTerrain = null);

public sealed class PresentationState
{
    private static readonly IReadOnlyDictionary<string, (string Title, string Description)> Scenes =
        new Dictionary<string, (string, string)>(StringComparer.Ordinal)
        {
            ["ashen-road"] = ("The Ashen Road", "A road winds beneath a smoke-darkened sky."),
            ["moonlit-fen"] = ("Moonlit Fen", "Still water catches the light between reeds."),
            ["old-bridge"] = ("Old Bridge", "A weathered crossing spans a deep ravine.")
        };

    private string? _selectedScene;
    private PublicPresentation _public = new("black", null, null, null);
    private PublicPresentation _active = new("black", null, null, null);

    public string? SelectedSceneId => _selectedScene;
    public IReadOnlyCollection<string> SceneIds => Scenes.Keys.ToArray();
    public PublicPresentation PublicPresentation => _active;

    public bool Select(string sceneId)
    {
        if (!Scenes.ContainsKey(sceneId)) return false;
        _selectedScene = sceneId;
        return true;
    }

    public bool Show(string? sceneId = null)
    {
        var candidate = sceneId ?? _selectedScene;
        if (candidate is null || !Scenes.TryGetValue(candidate, out var scene)) return false;
        _selectedScene = candidate;
        _public = new PublicPresentation("scene", candidate, scene.Title, scene.Description);
        _active = _public;
        return true;
    }

    public void ShowMap(PublicMap map) => _active = new PublicPresentation(map.Mode, null, null, null, map.Id, map.Image, map.GridVisible, map.Scale, map.Tokens, map.RevealedTerrain);
    public void RefreshMap(PublicMap map) { if (_active.Mode == "map") ShowMap(map); }

    public void Blackout() { _public = new PublicPresentation("black", null, null, null); _active = _public; }
}
