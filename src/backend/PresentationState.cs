using DungeonDeputy.Api.Maps;
using System.Text.Json.Serialization;

namespace DungeonDeputy.Api;

public sealed record PublicPresentation(string Mode,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SceneId,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Title,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Description,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Id = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ImageData = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] List<PublicToken>? Tokens = null);

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
    public event Action<PublicPresentation>? Changed;

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
        Changed?.Invoke(_active);
        return true;
    }

    public void ShowMap(PublicMap map) { _active = new PublicPresentation(map.Mode, null, null, null, map.Id, map.ImageData, map.Tokens); Changed?.Invoke(_active); }
    public void RefreshMap(PublicMap map) { if (_active.Mode == "map") ShowMap(map); }

    public void Blackout() { _public = new PublicPresentation("black", null, null, null); _active = _public; Changed?.Invoke(_active); }
}
