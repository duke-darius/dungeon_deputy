export const characterRuleAvailability = {
  inventory: 'Starting packages only; no shopping, encumbrance, or custom items.',
  spells: 'Wizard entries are name/ID bookkeeping only; spell descriptions and effects are not implemented.',
  resources: 'Rage, Stonecunning, spell slots, rests, and level-1 Arcane Recovery are tracked.',
  level: 'Barbarian levels 1–20 derive from XP; Wizard is bounded to level 1.',
} as const;

export function formatAbilityModifier(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}
