import type { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import type { PlayerSheet } from '../player/playerApi';

export type PlayerSnapshot = { sheet: PlayerSheet; presentation: { mode: string; title?: string | null } };
export type PlayerConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export declare function createPlayerConnection(options: {
  token: string;
  onSnapshot?: (snapshot: PlayerSnapshot | { sheet: PlayerSheet; presentation?: undefined; type: 'sheet' }) => void;
  onPresentation?: (presentation: { mode: string; title?: string | null }) => void;
  onState?: (state: PlayerConnectionState) => void;
  onAccessEnded?: (reason: 'revoked' | 'ended') => void;
  builder?: typeof HubConnectionBuilder;
}): {
  connection: HubConnection;
  start(): Promise<boolean>;
  retry(): Promise<boolean>;
  stop(): Promise<void>;
  connectionOptions: { url: string; reconnect: boolean; accessTokenFactory(): string };
};
