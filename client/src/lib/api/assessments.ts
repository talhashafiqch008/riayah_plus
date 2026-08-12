import { client } from './client';
import type { PublicStaffCard } from './staffProfile';

export type AssessmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Assessment {
  id: string;
  episodeId: string;
  assessorId: string;
  patientId: string;
  type: string;
  status: AssessmentStatus | string;
  scheduledAt: string;
  completedAt?: string | null;
  findings?: Record<string, unknown> | null;
  recommendations?: string | null;
  reportUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  episode?: { id: string; title: string; status: string; patientId: string };
  assessor?: PublicStaffCard;
  patient?: { id: string; name: string; email?: string };
}

export type ClinicianOption = PublicStaffCard;

export async function listAssessments(params?: {
  status?: string;
  episodeId?: string;
  limit?: number;
}) {
  const { data } = await client.get<{ data: Assessment[]; total: number }>('/assessments', {
    params,
  });
  return data;
}

export async function getAssessment(id: string) {
  const { data } = await client.get<{ data: Assessment }>(`/assessments/${id}`);
  return data.data;
}

export async function listClinicians() {
  const { data } = await client.get<{ data: ClinicianOption[] }>('/assessments/clinicians');
  return data.data;
}

export async function scheduleAssessment(payload: {
  episodeId: string;
  assessorId: string;
  type?: string;
  scheduledAt: string;
  notes?: string;
}) {
  const { data } = await client.post<{ data: Assessment }>('/assessments', payload);
  return data.data;
}

export async function updateAssessment(
  id: string,
  payload: Partial<{
    status: AssessmentStatus | string;
    scheduledAt: string;
    assessorId: string;
    type: string;
    notes: string | null;
    findings: Record<string, unknown>;
    recommendations: string | null;
    reportUrl: string | null;
  }>,
) {
  const { data } = await client.patch<{ data: Assessment }>(`/assessments/${id}`, payload);
  return data.data;
}
