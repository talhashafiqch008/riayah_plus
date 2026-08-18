/**
 * Clinical session notes — mirrors mern/client/src/lib/api/clinicalNotes.ts.
 */

import { apiClient } from './client';

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
  const { data } = await apiClient.get('/api/clinical-notes', { params });
  return (data.data ?? data.notes ?? []) as ClinicalNote[];
}

export async function getClinicalNote(id: string) {
  const { data } = await apiClient.get(`/api/clinical-notes/${id}`);
  return (data.data ?? data.note ?? data) as ClinicalNote;
}

export async function createClinicalNote(payload: CreateClinicalNotePayload) {
  const { data } = await apiClient.post('/api/clinical-notes', payload);
  return (data.data ?? data) as ClinicalNote;
}
