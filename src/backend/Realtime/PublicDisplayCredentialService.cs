using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace DungeonDeputy.Api.Realtime;

/// <summary>Issues ephemeral, read-only display capabilities; the desktop bearer is never returned.</summary>
public sealed class PublicDisplayCredentialService
{
    private const int MaxActiveDisplayCredentials = 4;
    private readonly ConcurrentDictionary<string, DateTimeOffset> _grants = new(StringComparer.Ordinal);
    private readonly object _gate = new();
    public string Issue()
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var key in _grants.Where(pair => pair.Value <= now).Select(pair => pair.Key).ToArray()) _grants.TryRemove(key, out _);
            if (_grants.Count >= MaxActiveDisplayCredentials) throw new InvalidOperationException("The display connection limit has been reached; stop and reopen a stale display.");
            _grants[Digest(token)] = now.AddHours(8);
        }
        return token;
    }
    public bool IsValid(string token)
    {
        var digest = Digest(token);
        return _grants.TryGetValue(digest, out var expiry) && expiry > DateTimeOffset.UtcNow;
    }
    public bool TryGetExpiry(string token, out DateTimeOffset expiry) =>
        _grants.TryGetValue(Digest(token), out expiry) && expiry > DateTimeOffset.UtcNow;
    public void RevokeAll() => _grants.Clear();
    private static string Digest(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
