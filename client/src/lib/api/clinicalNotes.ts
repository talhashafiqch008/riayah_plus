import { client } from './client';

export interface ClinicalNote {
  id: string;
  sessionId?: string | null;
  episodeId?: string | null;
  authorId: string;
  content: string;
  noteType: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt?: string;
  author?: { id: string; name: string; role?: string };
}

export interface CreateClinicalNotePayload {
  episodeId?: string;
  sessionId?: string;
  content: string;
  noteType?: string;
  isPrivate?: boolean;
}

export async function listClinicalNotes(params: { episodeId?: string; sessionId?: string }) {
  const { data } = await client.get<{ data: ClinicalNote[] }>('/clinical-notes', { params });
  return data.data;
}

export async function getClinicalNote(id: string) {
  const { data } = await client.get<{ data: ClinicalNote }>(`/clinical-notes/${id}`);
  return data.data;
}

export async function createClinicalNote(payload: CreateClinicalNotePayload) {
  const { data } = await client.post<{ data: ClinicalNote }>('/clinical-notes', payload);
  return data.data;
}

export interface AiIntakeSummary {
  id: string;
  careEpisodeId: string;
  model?: string | null;
  keyConcerns?: string[];
  urgencyIndicators?: string[];
  suggestedServiceCategories?: string[];
  flaggedRiskFactors?: unknown;
  clinicalImpressions?: string | null;
  confidence?: number | null;
  status: string;
  approvedById?: string | null;
  approvedAt?: string | null;
}

export async function getAiIntakeSummary(episodeId: string) {
  const { data } = await client.get<{ data?: AiIntakeSummary; summary?: AiIntakeSummary }>(
    `/episodes/${episodeId}/ai-intake-summary`,
  );
  return data.data ?? data.summary ?? null;
}

export async function approveAiIntakeSummary(episodeId: string) {
  const { data } = await client.post<{ data?: AiIntakeSummary; summary?: AiIntakeSummary }>(
    `/episodes/${episodeId}/ai-intake-summary/approve`,
  );
  return data.data ?? data.summary!;
}

export async function triggerAiCarePlanDraft(episodeId: string) {
  const { data } = await client.post<{
    message?: string;
    data?: unknown;
    carePlan?: unknown;
  }>(`/episodes/${episodeId}/ai-care-plan-draft`);
  return data;
}
