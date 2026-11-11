import { useCallback, useState } from 'react';
import PlayerWorkspace from './PlayerWorkspace';

type ExchangeResult = { token: string; characterId: string; expiresAt: string };

export default function JoinPage({ initialInvite }: { initialInvite: string }) {
  const [invite, setInvite] = useState(initialInvite);
  const [grant, setGrant] = useState<ExchangeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Enter the one-time invitation from your DM.');

  const exchange = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('Connecting to the session…');
    try {
      const response = await fetch('/api/player/exchange', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ invite: invite.trim() }), cache: 'no-store',
      });
      if (!response.ok) {
        const failure = response.status === 410 ? (await response.json() as { error?: string }).error : undefined;
        if (failure === 'expired') setMessage('This invite has expired. Ask the DM for a new invite.');
        else if (failure === 'used') setMessage('This invite has already been used. Ask the DM for a new invite, then enter its code here.');
        else if (failure === 'ended') setMessage('This session has ended. Contact the DM to join a new session.');
        else if (response.status === 429) setMessage('Too many invite attempts. Wait a minute, then ask the DM for a new invite.');
        else if (response.status === 401) setMessage("We couldn't find an active invite with that code. Check the code and try again, or ask the DM for a new invite.");
        else setMessage('Dungeon Deputy couldn’t complete that request. Check your connection and try again.');
        return;
      }
      const result = await response.json() as ExchangeResult;
      setGrant(result); setInvite(''); setMessage('Invite accepted. Access is scoped to the assigned character and expires when the session or grant ends.');
    } catch { setMessage('The session could not be reached. Check that Dungeon Deputy is running on the same Wi-Fi, then retry.'); }
    finally { setBusy(false); }
  };

  const accessEnded = useCallback((failure: 'revoked' | 'ended' | 'expired' | 'invalid') => {
    setGrant(null); setInvite('');
    history.replaceState(null, '', '/join');
    if (failure === 'ended') setMessage('This session has ended. Your private sheet has been cleared. Contact the DM to join a new session.');
    else if (failure === 'revoked') setMessage('Your access to this character was revoked. Your private sheet has been cleared. Contact the DM for a new invite.');
    else if (failure === 'expired') setMessage('This access expired. Your private sheet has been cleared. Ask the DM for a new invite.');
    else setMessage('This invite is no longer active. Your private sheet has been cleared. Ask the DM for a new invite.');
  }, []);

  if (grant) return <main className="player-join player-joined">
    <p className="player-warning player-warning-compact" role="note">This session uses unencrypted HTTP. Other people on this Wi-Fi may observe or interfere with traffic. Join only a trusted private LAN.</p>
    <p className="player-paired-status" role="status">Paired · access expires {new Date(grant.expiresAt).toLocaleString()} or when the DM ends the session.</p>
    <PlayerWorkspace token={grant.token} onAccessEnded={accessEnded} />
  </main>;

  return <div className="player-join" aria-labelledby="join-heading">
    <header><p className="player-kicker">Dungeon Deputy · Player access</p><h1 id="join-heading">Join a local session</h1></header>
    <p className="player-warning" role="note">This session uses unencrypted HTTP. Other people on this Wi-Fi may observe or interfere with traffic. Join only a trusted private LAN.</p>
    <form onSubmit={exchange}>
      <p>This invite can be used once and is for the character selected by your DM.</p>
      <label htmlFor="player-invite">One-time invite code</label>
      <input id="player-invite" required maxLength={64} autoComplete="off" value={invite} onChange={event => setInvite(event.target.value)} />
      <button type="submit" disabled={busy || invite.trim().length < 32}>{busy ? 'Connecting…' : 'Use this invite'}</button>
    </form>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
