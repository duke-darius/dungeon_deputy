import type { PublicPresentation } from './contracts.mjs';
declare global { interface Window { dungeonDeputy: { command(path: string, method?: string, body?: unknown): Promise<unknown>; getPresentation(): Promise<PublicPresentation>; connectRealtime(): Promise<void>; onPresentationUpdated(callback: (value: unknown) => void): () => void; preferences?: (value?: unknown) => Promise<{ sceneId: string; displayId: number | null }>; displays?: () => Promise<Array<{id: number; label: string}>>; audioConfig?: (value?: unknown) => Promise<any>; audioImport?: () => Promise<any>; audioBytes?: (id: string) => Promise<Uint8Array>; audioDiscard?: (id: string) => Promise<boolean> } } }

export async function command(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  if (!window.dungeonDeputy || typeof window.dungeonDeputy.command !== 'function') {
    throw new Error('The local presentation service is unavailable.');
  }
  return window.dungeonDeputy.command(path, method, body);
}

export type SanitizedMapRaster = { imageData: string };
export const publishMapRaster = (raster: SanitizedMapRaster, activeDraft = false) =>
  command(activeDraft ? '/api/map/show-encounter' : '/api/map/show', 'POST', raster);

export type InitiativeActor = { tokenId: string; initiative: number | null; tieBreakOrder: number };
export const reorderInitiative = (actorIds: string[]): Promise<{ actors: InitiativeActor[] }> =>
  command('/api/encounter/initiative/order', 'POST', { actorIds }) as Promise<{ actors: InitiativeActor[] }>;

export type SrdCategory = 'spell' | 'condition' | 'action' | 'monster' | 'equipment' | 'class' | 'species';
export type SrdRecord = {
  id: string; category: SrdCategory; name: string; summary: string; details: Record<string, unknown>;
  stats?: { size: string; armorClass: number; hitPoints: number; speed: number; strength: number; dexterity: number; constitution: number; challengeRatingNumerator: number; challengeRatingDenominator: number; attacks: string[] };
  provenance: { dataset: string; license: string; sourceHash: string; recordHash: string; page: number; section: string; modifications: string };
};
export type SrdMetadata = {
  release: string; language: string; license: string; attribution: string; modifications: string;
  source: { url: string; sha256: string }; knownGaps: string[];
};
export type SrdCoverage = {
  release: string; verifiedRecords: Partial<Record<SrdCategory, number>>;
  categories: Partial<Record<SrdCategory, { available: boolean; reviewedSubsetOnly: boolean }>>;
  gaps: string[]; completenessClaim: boolean;
};
export const searchSrdRecords = (query: string, category?: SrdCategory) =>
  command(`/api/srd/search?q=${encodeURIComponent(query.slice(0, 100))}${category ? `&category=${category}` : ''}`) as Promise<{ records: SrdRecord[]; total: number }>;
export const getSrdMetadata = () => command('/api/srd/metadata') as Promise<SrdMetadata>;
export const getSrdCoverage = () => command('/api/srd/coverage') as Promise<SrdCoverage>;
export const addSrdMonsterToEncounter = (monsterId: string) =>
  command('/api/encounter/monsters', 'POST', { monsterId });

export type PlayerHostAddress = { address: string; interfaceName: string };
export type PlayerSessionState = { session: null | { id: string; startedAt: string; active: boolean; pairedCount: number }; listener: { enabled: boolean; address: string | null; origin: string | null } };
export type PlayerAssignment = { playerId: string; characterId: string; expiresAt: string; inventory: Array<{ id: string; name: string; quantity: number }>; resources: Record<string, number>; currentHitPoints: number | null };
export const getPlayerSession = () => command('/api/player-session') as Promise<PlayerSessionState>;
export const getPlayerHostAddresses = () => command('/api/player-session/interfaces') as Promise<PlayerHostAddress[]>;
export const getPlayerAssignments = () => command('/api/player-session/players') as Promise<PlayerAssignment[]>;
export const startPlayerSession = (address: string) => command('/api/player-session/start', 'POST', { address });
export const stopPlayerSession = () => command('/api/player-session/stop', 'POST');
export const createPlayerInvite = (characterId: string) => command('/api/player-session/invites', 'POST', { characterId }) as Promise<{ id: string; characterId: string; secret: string; expiresAt: string; url: string; warning: string }>;
export const revokePlayer = (playerId: string) => command('/api/player-session/revoke', 'POST', { playerId });
export const setAssignedHitPoints = (playerId: string, currentHitPoints: number) => command(`/api/player-session/players/${encodeURIComponent(playerId)}/hp`, 'PUT', { currentHitPoints });

export const getPresentation = () => {
  if (!window.dungeonDeputy || typeof window.dungeonDeputy.getPresentation !== 'function') {
    throw new Error('The local presentation service is unavailable.');
  }
  return window.dungeonDeputy.getPresentation();
};
