import type { PublicPresentation } from './contracts.mjs';
declare global { interface Window { dungeonDeputy: { command(path: string, method?: string, body?: unknown): Promise<unknown>; getPresentation(): Promise<PublicPresentation>; preferences?: (value?: unknown) => Promise<{ sceneId: string; displayId: number | null }>; displays?: () => Promise<Array<{id: number; label: string}>> } } }

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

export const getPresentation = () => {
  if (!window.dungeonDeputy || typeof window.dungeonDeputy.getPresentation !== 'function') {
    throw new Error('The local presentation service is unavailable.');
  }
  return window.dungeonDeputy.getPresentation();
};
