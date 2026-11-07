export const characterRuleAvailability = {
  inventory: 'Unavailable: no equipment options have been enabled in this audited rules subset.',
  spells: 'Unavailable: no spellcasting options are enabled in this audited rules subset.',
  resources: 'Unavailable: resource tracking is not enabled in this audited rules subset.',
  level: 'Only level 1 is supported; other levels are unavailable.',
} as const;

export function formatAbilityModifier(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}
