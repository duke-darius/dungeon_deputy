import type { PublicPresentation } from './contracts.mjs';
declare global { interface Window { dungeonDeputy: { command(path: string, method?: string): Promise<unknown>; getPresentation(): Promise<PublicPresentation>; preferences?: (value?: unknown) => Promise<{ sceneId: string; displayId: number | null }>; displays?: () => Promise<Array<{id: number; label: string}>> } } }

export async function command(path: string, method = 'GET'): Promise<unknown> {
  if (!window.dungeonDeputy || typeof window.dungeonDeputy.command !== 'function') {
    throw new Error('The local presentation service is unavailable.');
  }
  return window.dungeonDeputy.command(path, method);
}

export const getPresentation = () => {
  if (!window.dungeonDeputy || typeof window.dungeonDeputy.getPresentation !== 'function') {
    throw new Error('The local presentation service is unavailable.');
  }
  return window.dungeonDeputy.getPresentation();
};
