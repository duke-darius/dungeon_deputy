export const PRIVATE_LABEL = 'PRIVATE PROPOSAL — NOT IN CAMPAIGN';
export const NARRATIVE_LABEL = 'AI-suggested · Unverified';
export const REFERENCE_LABEL = 'Local SRD reference · verified in this catalog';
export const NO_REFERENCE = 'No matching local SRD reference found. Rules-related suggestions are unverified.';

export function createGenerationPayload(kind, prompt, selectedSrdRecordIds, freshConsent) {
  if (freshConsent !== true) return null;
  return {
    kind,
    prompt: typeof prompt === 'string' ? prompt.slice(0, 2000).trim() : '',
    consent: true,
    selectedSrdRecordIds: Array.isArray(selectedSrdRecordIds) ? selectedSrdRecordIds.slice(0, 3) : [],
  };
}

export function describeProposal(proposal) {
  return { privateLabel: PRIVATE_LABEL, narrativeLabel: NARRATIVE_LABEL, referenceLabel: REFERENCE_LABEL, noReference: NO_REFERENCE, kind: proposal?.kind ?? '' };
}

export function proposalFields(proposal) {
  const c = proposal?.content ?? {};
  const result = [];
  const add = (section, key, label, value) => {
    if (typeof value === 'string' || typeof value === 'number' || (value && typeof value === 'object')) result.push({ section, key, label, value });
  };
  switch (proposal?.kind) {
    case 'npc': (c.npcs ?? []).forEach((npc, i) => { add('NPC', `npcs.${i}.name`, `NPC ${i + 1} name`, npc.name); add('NPC', `npcs.${i}.description`, `NPC ${i + 1} description`, npc.description); }); break;
    case 'encounter': (c.actors ?? []).forEach((actor, i) => { add('Encounter', `actors.${i}.name`, `Actor ${i + 1} name`, actor.name); add('Encounter', `actors.${i}.rationale`, `Actor ${i + 1} rationale`, actor.rationale); }); break;
    case 'adventure': add('Adventure', 'title', 'Title', c.title); (c.scenes ?? []).forEach((scene, i) => { add('Scene', `scenes.${i}.title`, `Scene ${i + 1} title`, scene.title); add('Scene', `scenes.${i}.description`, `Scene ${i + 1} description`, scene.description); }); break;
    case 'scene': add('Scene', 'description', 'Description', c.description); break;
    case 'geometry': (c.primitives ?? []).forEach((shape, i) => add('Geometry', `primitives.${i}`, shape.label || `Shape ${i + 1}`, { ...shape })); break;
  }
  return result;
}

export function updateField(proposal, key, value) {
  const parts = key.split('.');
  const content = structuredClone(proposal.content);
  let cursor = content;
  for (const part of parts.slice(0, -1)) cursor = cursor[Array.isArray(cursor) ? Number(part) : part];
  cursor[Array.isArray(cursor) ? Number(parts.at(-1)) : parts.at(-1)] = value;
  return { ...proposal, content };
}
