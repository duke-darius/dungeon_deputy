import type { PublicPresentation } from './contracts.mjs';

declare global { interface Window { __DUNGEON_DEPUTY_API__?: string } }

export function apiBase(): string | null {
  const candidate = window.__DUNGEON_DEPUTY_API__ ?? new URLSearchParams(location.search).get('api');
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' ? url.origin : null;
  } catch { return null; }
}

export async function command(path: string, method = 'GET'): Promise<unknown> {
  const base = apiBase();
  if (!base) throw new Error('The local presentation service is unavailable.');
  const response = await fetch(`${base}${path}`, { method, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`The presentation service returned ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

export const getPresentation = () => command('/api/presentation') as Promise<PublicPresentation>;
