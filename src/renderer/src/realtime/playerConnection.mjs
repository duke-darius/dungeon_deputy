import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

/** Owns one in-memory player capability and its authorized snapshot lifecycle. */
export function createPlayerConnection({ token, onSnapshot = () => {}, onPresentation = () => {}, onState = () => {}, onAccessEnded = () => {}, builder = HubConnectionBuilder }) {
  let disposed = false;
  let lastSnapshot = '';
  const connection = new builder()
    .withUrl('/api/player/hub', { accessTokenFactory: () => token })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();

  const publishSnapshot = snapshot => {
    if (disposed || !snapshot?.sheet || !snapshot?.presentation) return false;
    const fingerprint = JSON.stringify(snapshot);
    if (fingerprint !== lastSnapshot) {
      lastSnapshot = fingerprint;
      onSnapshot(snapshot);
    }
    onState('connected');
    return true;
  };
  const refreshSnapshot = async () => publishSnapshot(await connection.invoke('GetSnapshot'));

  connection.on('Snapshot', publishSnapshot);
  connection.on('SheetUpdated', sheet => {
    if (!disposed && sheet && typeof sheet.name === 'string') onSnapshot({ sheet, presentation: undefined, type: 'sheet' });
  });
  connection.on('Presentation', presentation => { if (!disposed) onPresentation(presentation); });
  connection.on('AccessRevoked', () => { if (!disposed) onAccessEnded('revoked'); });
  connection.on('SessionEnded', () => { if (!disposed) onAccessEnded('ended'); });
  connection.onreconnecting(() => { if (!disposed) onState('reconnecting'); });
  connection.onreconnected(async () => {
    if (disposed) return;
    onState('reconnecting');
    try { await refreshSnapshot(); }
    catch { if (!disposed) onState('disconnected'); }
  });
  connection.onclose(() => { if (!disposed) onState('disconnected'); });

  const start = async () => {
    if (disposed) return false;
    onState('connecting');
    try {
      if (connection.state === 'Disconnected') await connection.start();
      await refreshSnapshot();
      return true;
    } catch {
      if (!disposed) onState('disconnected');
      return false;
    }
  };
  const stop = async () => {
    if (disposed) return;
    disposed = true;
    await connection.stop();
  };
  return { connection, start, retry: start, stop, connectionOptions: { url: '/api/player/hub', reconnect: true, accessTokenFactory: () => token } };
}
