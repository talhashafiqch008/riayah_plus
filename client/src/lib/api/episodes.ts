import { client } from './client';

export type CareEpisodeStatus =
  | 'intake_submitted'
  | 'under_review'
  | 'validated'
  | 'active'
  | 'on_hold'
  | 'closed';

export interface CareEpisode {
  id: string;
  title: string;
  status: CareEpisodeStatus | string;
  urgencyLevel?: string | null;
  reasonForCare?: string | null;
  medicalHistory?: string | null;
  currentMeds?: string | null;
  diagnoses?: string[];
  serviceInterests?: string[];
  intakeSummary?: Record<string, unknown> | null;
  intakeReviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patientId?: string;
  careRecipientId?: string | null;
  careUnitId?: string | null;
  patient?: { id: string; name: string; email?: string };
  coordinator?: { id: string; name: string } | null;
  careRecipient?: { id: string; name: string; externalRef?: string | null } | null;
  assessments?: { id: string; status?: string; type?: string; scheduledAt?: string }[];
}

/** Mirror of server stateMachine CARE_EPISODE_TRANSITIONS for UI buttons. */
export const EPISODE_TRANSITIONS: Record<string, readonly string[]> = {
  intake_submitted: ['under_review', 'validated', 'closed'],
  under_review: ['validated', 'on_hold', 'closed'],
  validated: ['active', 'on_hold', 'closed'],
  active: ['on_hold', 'closed'],
  on_hold: ['active', 'closed'],
  closed: [],
};

export const EPISODE_STATUS_STEPS = [
  'intake_submitted',
  'under_review',
  'validated',
  'active',
] as const;

export function allowedEpisodeTransitions(status: string): string[] {
  return [...(EPISODE_TRANSITIONS[status] ?? [])];
}

export async function listEpisodes(params?: { status?: string; page?: number; limit?: number }) {
  const { data } = await client.get<{ data: CareEpisode[]; total: number }>(
    '/episodes',
    { params },
  );
  return data;
}

export async function getEpisode(id: string) {
  const { data } = await client.get<{ data: CareEpisode }>(`/episodes/${id}`);
  return data.data;
}

export async function updateEpisodeStatus(id: string, status: string) {
  const { data } = await client.patch<{ data: CareEpisode }>(`/episodes/${id}`, { status });
  return data.data;
}
