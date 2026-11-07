export type PlayerInventoryItem = { id: string; name: string; quantity: number };
export type PlayerResourceItem = { id: string; remaining: number };
export type PlayerSheet = {
  name: string; class: string; species: string; level: number;
  strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number;
  abilityModifiers: Record<string, number>; proficiencyBonus: number; hitPointMaximum: number; armorClass: number;
  rulesetVersion: string; inventory: PlayerInventoryItem[]; resources: PlayerResourceItem[];
};
export type PlayerCommand =
  | { type: 'addInventory'; name: string; quantity: number }
  | { type: 'removeInventory'; itemId: string; quantity: number }
  | { type: 'useResource'; resourceId: string };

export class PlayerApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

async function request<T>(token: string, path: string, method = 'GET', body?: PlayerCommand): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({})) as { error?: string };
    throw new PlayerApiError(response.status, failure.error ?? (response.status === 401 ? 'invalid' : 'request-failed'));
  }
  return response.json() as Promise<T>;
}

export const getPlayerSheet = (token: string) => request<PlayerSheet>(token, '/api/player/sheet');
export const sendPlayerCommand = (token: string, command: PlayerCommand) => request<PlayerSheet>(token, '/api/player/commands', 'POST', command);
