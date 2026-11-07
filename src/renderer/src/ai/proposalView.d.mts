export type Proposal = { kind: 'npc' | 'encounter' | 'adventure' | 'scene' | 'geometry'; content: Record<string, any>; references: Array<{ id: string; name: string; excerpt: string; source: string }> };
export function createGenerationPayload(kind: Proposal['kind'], prompt: string, selectedSrdRecordIds: string[], freshConsent: boolean): { kind: Proposal['kind']; prompt: string; consent: true; selectedSrdRecordIds: string[] } | null;
export function describeProposal(proposal: Proposal): { privateLabel: string; narrativeLabel: string; referenceLabel: string; noReference: string; kind: string };
export function proposalFields(proposal: Proposal): Array<{ section: string; key: string; label: string; value: any }>;
export function updateField(proposal: Proposal, key: string, value: any): Proposal;
