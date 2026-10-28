import type { PublicPresentation } from './contracts.mjs';
declare global { interface Window { dungeonDeputy: { command(path: string, method?: string): Promise<unknown>; getPresentation(): Promise<PublicPresentation>; preferences?: (value?: unknown) => Promise<{ sceneId: string; displayId: number | null }>; displays?: () => Promise<Array<{id: number; label: string}>> } } }

export async function command(path: string, method = 'GET'): Promise<unknown> {
  return window.dungeonDeputy.command(path, method);
}

export const getPresentation = () => window.dungeonDeputy.getPresentation();
