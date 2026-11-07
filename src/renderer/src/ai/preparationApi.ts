import { command, searchSrdRecords, type SrdRecord } from '../api';
import type { Proposal } from './proposalView.mjs';

export type ProviderStatus = { state: 'disabled' | 'unconfigured' | 'configured' };
export type ProposalKind = Proposal['kind'];
export type NarrativeKind = Exclude<ProposalKind, 'geometry'>;
export type AcceptedPreparation = { id: string; kind: NarrativeKind; content: Record<string, unknown>; references: Array<{ id: string; name: string; excerpt: string; source: string }>; createdAt: string; updatedAt: string };
export async function getPreparationStatus(): Promise<ProviderStatus> {
  return await command('/api/ai/status') as ProviderStatus;
}
export async function findLocalRecords(query: string): Promise<SrdRecord[]> {
  const result = await searchSrdRecords(query);
  return result.records;
}
export async function generateProposal(payload: { kind: ProposalKind; prompt: string; consent: true; selectedSrdRecordIds: string[] }): Promise<Proposal> {
  return await command(`/api/ai/${payload.kind}`, 'POST', payload) as Proposal;
}
export async function acceptProposal(proposal: Proposal, selectedMonsterIds: string[]): Promise<{ accepted: boolean; message: string }> {
  return await command('/api/ai/accept', 'POST', { kind: proposal.kind, proposalJson: JSON.stringify(proposal.content), selectedMonsterIds }) as { accepted: boolean; message: string };
}
export async function listAcceptedPreparations(): Promise<AcceptedPreparation[]> {
  return await command('/api/ai/accepted') as AcceptedPreparation[];
}
export async function updateAcceptedPreparation(item: AcceptedPreparation): Promise<AcceptedPreparation> {
  return await command(`/api/ai/accepted/${encodeURIComponent(item.id)}`, 'PUT', { kind: item.kind, contentJson: JSON.stringify(item.content) }) as AcceptedPreparation;
}
export async function deleteAcceptedPreparation(id: string): Promise<void> {
  await command(`/api/ai/accepted/${encodeURIComponent(id)}`, 'DELETE');
}
