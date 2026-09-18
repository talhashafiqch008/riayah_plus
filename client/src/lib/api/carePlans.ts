import i18n from '@/i18n/config';
import { client } from './client';

/** Product care-plan statuses (never persist demo strings). */
export type CarePlanStatus =
  | 'draft'
  | 'submitted_for_approval'
  | 'approved'
  | 'active'
  | 'revision_requested'
  | 'rejected'
  | 'completed';

export type GoalStatus = 'active' | 'achieved' | 'paused' | 'cancelled';

export interface CarePlanGoal {
  id: string;
  carePlanId: string;
  title: string;
  description?: string | null;
  tier?: string;
  category?: string;
  measurableOutcome?: string | null;
  targetDate?: string | null;
  measurement?: string | null;
  status: GoalStatus | string;
  notes?: string | null;
  achievedAt?: string | null;
}

export interface CarePlanItem {
  id: string;
  carePlanId: string;
  serviceType: string;
  frequency?: string | null;
  duration?: string | null;
  unitCost?: string | number | null;
  currency?: string;
  assignedRole?: string | null;
  notes?: string | null;
}

export interface CarePlanApprovalLog {
  id: string;
  carePlanId: string;
  action: string;
  actorId: string;
  notes?: string | null;
  createdAt: string;
}

export interface CarePlan {
  id: string;
  episodeId: string;
  coordinatorId: string;
  version: number;
  status: CarePlanStatus | string;
  title: string;
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  rejectionNotes?: string | null;
  isCurrentVersion: boolean;
  previousVersionId?: string | null;
  goals?: CarePlanGoal[];
  items?: CarePlanItem[];
  approvalLogs?: CarePlanApprovalLog[];
  episode?: { id: string; organizationId?: string | null; patientId?: string; title?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalInput {
  title: string;
  description?: string;
  targetDate?: string;
  measurement?: string;
  measurableOutcome?: string;
  tier?: string;
  category?: string;
}

export interface ItemInput {
  serviceType: string;
  frequency?: string;
  duration?: string;
  unitCost?: number;
  currency?: string;
  assignedRole?: string;
  notes?: string;
}

export interface CreateCarePlanPayload {
  episodeId: string;
  title: string;
  notes?: string;
  goals?: GoalInput[];
  items?: ItemInput[];
}

export interface UpdateCarePlanPayload {
  title?: string;
  notes?: string | null;
  goals?: GoalInput[];
  items?: ItemInput[];
}

/** Map demo / legacy labels → product enum (display only — never POST demo strings). */
export function normalizeCarePlanStatus(status: string): CarePlanStatus | string {
  if (status === 'pending_approval') return 'submitted_for_approval';
  return status;
}

export function carePlanStatusLabel(status: string): string {
  const s = normalizeCarePlanStatus(status);
  const english: Record<string, string> = {
    draft: 'Draft',
    submitted_for_approval: 'Awaiting family approval',
    approved: 'Approved',
    active: 'Active',
    revision_requested: 'Revision requested',
    rejected: 'Rejected',
    completed: 'Completed',
  };
  const fallback = english[s] ?? String(s).replace(/_/g, ' ');
  const key = `status.carePlan.${s}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  return fallback;
}

export function carePlanStatusBadgeClass(status: string): string {
  switch (normalizeCarePlanStatus(status)) {
    case 'draft':
      return 'bg-stone-100 text-stone-700';
    case 'submitted_for_approval':
      return 'bg-amber-50 text-amber-800';
    case 'approved':
    case 'active':
      return 'bg-emerald-50 text-emerald-800';
    case 'revision_requested':
      return 'bg-orange-50 text-orange-800';
    case 'rejected':
      return 'bg-rose-50 text-rose-800';
    case 'completed':
      return 'bg-teal-50 text-teal-800';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

export async function listCarePlans(params?: { episodeId?: string }) {
  const { data } = await client.get<{ data: CarePlan[] }>('/care-plans', { params });
  return data.data;
}

export async function getCarePlan(id: string) {
  const { data } = await client.get<{ data: CarePlan }>(`/care-plans/${id}`);
  return data.data;
}

export async function createCarePlan(payload: CreateCarePlanPayload) {
  const { data } = await client.post<{ data: CarePlan }>('/care-plans', payload);
  return data.data;
}

export async function updateCarePlan(id: string, payload: UpdateCarePlanPayload) {
  const { data } = await client.patch<{ data: CarePlan }>(`/care-plans/${id}`, payload);
  return data.data;
}

export async function submitCarePlan(id: string, changeNotes?: string) {
  const { data } = await client.post<{ message?: string }>(
    `/care-plans/${id}/submit`,
    changeNotes ? { changeNotes } : {},
  );
  return data;
}

export async function approveCarePlan(id: string) {
  const { data } = await client.post<{ message?: string }>(`/care-plans/${id}/approve`);
  return data;
}

export async function requestCarePlanRevision(id: string, notes: string) {
  const { data } = await client.post<{ message?: string }>(`/care-plans/${id}/request-revision`, {
    notes,
  });
  return data;
}

export async function rejectCarePlan(id: string, notes?: string) {
  const { data } = await client.post<{ message?: string }>(`/care-plans/${id}/reject`, { notes });
  return data;
}

export async function cosignCarePlan(id: string, notes?: string) {
  const { data } = await client.post<{
    message: string;
    approvalLog: CarePlanApprovalLog;
    data: CarePlan;
  }>(`/care-plans/${id}/cosign`, { notes });
  return data;
}

export async function listCarePlanGoals(planId: string) {
  const { data } = await client.get<{ goals: CarePlanGoal[] }>(`/care-plans/${planId}/goals`);
  return data.goals;
}

export async function updateCarePlanGoal(
  planId: string,
  goalId: string,
  payload: { status?: GoalStatus; notes?: string | null },
) {
  const { data } = await client.patch<{ goal: CarePlanGoal }>(
    `/care-plans/${planId}/goals/${goalId}`,
    payload,
  );
  return data.goal;
}

export async function listCarePlanItems(planId: string) {
  const { data } = await client.get<{ items: CarePlanItem[] }>(`/care-plans/${planId}/items`);
  return data.items;
}

export async function createCarePlanItem(planId: string, item: ItemInput) {
  const { data } = await client.post<{ item: CarePlanItem }>(`/care-plans/${planId}/items`, item);
  return data.item;
}
