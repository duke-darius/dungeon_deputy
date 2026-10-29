namespace DungeonDeputy.Api.Maps;

/// <summary>
/// Keeps each persisted map mutation and its matching public-presentation refresh
/// in one ordered critical section. MapService serializes database writes, but
/// without this outer gate post-commit presentation updates could race.
/// </summary>
public sealed class MapVisualMutationGate
{
    private readonly object _sync = new();

    public T Run<T>(Func<T> operation)
    {
        ArgumentNullException.ThrowIfNull(operation);
        lock (_sync) return operation();
    }
}
