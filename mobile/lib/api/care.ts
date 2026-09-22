/**
 * Care platform API surface for the family portal.
 * Mirrors mern/client/src/lib/api/{episodes,assessments,carePlans,intake}.ts —
 * paths are prefixed with `/api` because the mobile axios base URL is origin-only.
 */

import { apiClient } from './client';
import i18n from '../../i18n/config';

/* ------------------------------------------------------------------ episodes */

export type CareEpisodeStatus =
  | 'intake_submitted'
  | 'under_review'
  | 'validated'
  | 'active'
  | 'on_hold'
  | 'closed';

export interface StaffCardLike {
  id: string;
  name: string;
  role?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  languages?: string[];
  specialties?: string[];
}

export interface CareEpisode {
  id: string;
  title?: string;
  status?: CareEpisodeStatus | string;
  urgencyLevel?: string | null;
  reasonForCare?: string | null;
  medicalHistory?: string | null;
  currentMeds?: string | null;
  diagnoses?: string[];
  serviceInterests?: string[];
  intakeReviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  careUnitId?: string | null;
  patient?: { id: string; name: string; email?: string } | null;
  coordinator?: { id: string; name: string } | null;
  careRecipient?: { id: string; name: string } | null;
  assessments?: {
    id: string;
    status?: string;
    type?: string;
    scheduledAt?: string;
    assessor?: StaffCardLike | null;
  }[];
  sessions?: {
    id: string;
    scheduledAt?: string;
    status?: string;
    durationMinutes?: number | null;
    provider?: StaffCardLike | null;
  }[];
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

export const STAFF_EPISODE_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'intake_submitted', label: 'Intake submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'validated', label: 'Validated' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'closed', label: 'Closed' },
];

export function allowedEpisodeTransitions(status: string): string[] {
  return [...(EPISODE_TRANSITIONS[status] ?? [])];
}

export function episodeStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export async function updateEpisodeStatus(id: string, status: string) {
  const { data } = await apiClient.patch(`/api/episodes/${id}`, { status });
  return (data.data ?? data.episode ?? data) as CareEpisode;
}

export async function listEpisodes(params?: { status?: string; limit?: number }) {
  const { data } = await apiClient.get('/api/episodes', { params });
  return {
    data: (data.data ?? data.episodes ?? []) as CareEpisode[],
    total: (data.total ?? data.data?.length ?? 0) as number,
  };
}

export async function getEpisode(id: string) {
  const { data } = await apiClient.get(`/api/episodes/${id}`);
  return (data.data ?? data.episode ?? data) as CareEpisode;
}

/* --------------------------------------------------------------- assessments */

export type AssessmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Assessment {
  id: string;
  episodeId: string;
  assessorId?: string;
  patientId?: string;
  type: string;
  status: AssessmentStatus | string;
  scheduledAt: string;
  completedAt?: string | null;
  findings?: Record<string, unknown> | null;
  recommendations?: string | null;
  reportUrl?: string | null;
  notes?: string | null;
  episode?: { id: string; title?: string; status?: string; patientId?: string } | null;
  assessor?: StaffCardLike | null;
  patient?: { id: string; name: string; email?: string } | null;
}

export async function listAssessments(params?: {
  status?: string;
  episodeId?: string;
  limit?: number;
}) {
  const { data } = await apiClient.get('/api/assessments', { params });
  return {
    data: (data.data ?? data.assessments ?? []) as Assessment[],
    total: (data.total ?? data.data?.length ?? 0) as number,
  };
}

export async function listClinicians() {
  const { data } = await apiClient.get('/api/assessments/clinicians');
  return (data.data ?? data.clinicians ?? []) as StaffCardLike[];
}

export async function scheduleAssessment(payload: {
  episodeId: string;
  assessorId: string;
  type?: string;
  scheduledAt: string;
  notes?: string;
}) {
  const { data } = await apiClient.post('/api/assessments', payload);
  return (data.data ?? data) as Assessment;
}

export async function getAssessment(id: string) {
  const { data } = await apiClient.get(`/api/assessments/${id}`);
  return (data.data ?? data.assessment ?? data) as Assessment;
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
  const { data } = await apiClient.patch(`/api/assessments/${id}`, payload);
  return (data.data ?? data) as Assessment;
}

/* ---------------------------------------------------------------- care plans */

export type CarePlanStatus =
  | 'draft'
  | 'submitted_for_approval'
  | 'approved'
  | 'active'
  | 'revision_requested'
  | 'rejected'
  | 'completed';

export interface CarePlanGoal {
  id: string;
  title: string;
  description?: string | null;
  measurableOutcome?: string | null;
  measurement?: string | null;
  targetDate?: string | null;
  status?: string;
}

export interface CarePlanItem {
  id: string;
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
  carePlanId?: string;
  action: string;
  actorId?: string;
  notes?: string | null;
  createdAt: string;
}

export interface CarePlan {
  id: string;
  episodeId: string;
  version: number;
  status: CarePlanStatus | string;
  title: string;
  notes?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectionNotes?: string | null;
  isCurrentVersion?: boolean;
  goals?: CarePlanGoal[];
  items?: CarePlanItem[];
  approvalLogs?: CarePlanApprovalLog[];
  episode?: { id: string; title?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Map demo / legacy labels → product enum (display only — never POST demo strings). */
export function normalizeCarePlanStatus(status: string): CarePlanStatus | string {
  if (status === 'pending_approval') return 'submitted_for_approval';
  return status;
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

export function carePlanStatusLabel(
  status: string,
  variant: 'family' | 'staff' = 'family',
): string {
  const normalized = normalizeCarePlanStatus(status);
  if (normalized === 'submitted_for_approval' && variant === 'family') {
    return i18n.t('mobile.common.awaitingYourApproval', { ns: 'family' });
  }
  const key = `status.carePlan.${normalized}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  return status.replace(/_/g, ' ');
}

export async function listCarePlans(params?: { episodeId?: string }) {
  const { data } = await apiClient.get('/api/care-plans', { params });
  return (data.data ?? data.carePlans ?? []) as CarePlan[];
}

export async function getCarePlan(id: string) {
  const { data } = await apiClient.get(`/api/care-plans/${id}`);
  return (data.data ?? data.carePlan ?? data) as CarePlan;
}

export async function createCarePlan(payload: CreateCarePlanPayload) {
  const { data } = await apiClient.post('/api/care-plans', payload);
  return (data.data ?? data) as CarePlan;
}

export async function updateCarePlan(id: string, payload: UpdateCarePlanPayload) {
  const { data } = await apiClient.patch(`/api/care-plans/${id}`, payload);
  return (data.data ?? data) as CarePlan;
}

export async function submitCarePlan(id: string, changeNotes?: string) {
  const { data } = await apiClient.post(
    `/api/care-plans/${id}/submit`,
    changeNotes ? { changeNotes } : {},
  );
  return data as { message?: string };
}

export async function updateCarePlanGoal(
  planId: string,
  goalId: string,
  payload: { status?: string; notes?: string | null },
) {
  const { data } = await apiClient.patch(`/api/care-plans/${planId}/goals/${goalId}`, payload);
  return (data.goal ?? data.data ?? data) as CarePlanGoal;
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
  const { data } = await apiClient.get(`/api/episodes/${episodeId}/ai-intake-summary`);
  return (data.data ?? data.summary ?? null) as AiIntakeSummary | null;
}

export async function approveAiIntakeSummary(episodeId: string) {
  const { data } = await apiClient.post(`/api/episodes/${episodeId}/ai-intake-summary/approve`);
  return (data.data ?? data.summary ?? data) as AiIntakeSummary;
}

export async function triggerAiCarePlanDraft(episodeId: string) {
  const { data } = await apiClient.post(`/api/episodes/${episodeId}/ai-care-plan-draft`);
  return data as { message?: string; data?: unknown; carePlan?: unknown };
}

export async function listIntakeQueue(params?: {
  status?: string;
  urgency?: string;
  limit?: number;
  page?: number;
}) {
  const { data } = await apiClient.get('/api/intake/queue', { params });
  return {
    data: (data.data ?? []) as {
      id: string;
      status?: string;
      urgencyLevel?: string | null;
      reasonForCare?: string | null;
      serviceInterests?: string[];
      submittedAt?: string | null;
      createdAt?: string;
      careUnit?: { id: string; name: string } | null;
      careRecipient?: { id: string; name: string } | null;
      familyUser?: { id: string; name: string; email: string } | null;
      careEpisode?: { id: string; title?: string; status?: string } | null;
    }[],
    total: (data.total ?? data.data?.length ?? 0) as number,
  };
}

export type ServiceCategory =
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'behavioral_support'
  | 'physiotherapy'
  | 'nursing'
  | 'companion_care';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface IntakeRecord {
  id: string;
  status: string;
  urgencyLevel?: UrgencyLevel | string | null;
  reasonForCare: string;
  medicalHistory?: string | null;
  currentMeds?: string | null;
  diagnoses: string[];
  serviceInterests?: ServiceCategory[];
  primaryCaregiverName?: string | null;
  primaryCaregiverPhone?: string | null;
  primaryCaregiverRelation?: string | null;
  submittedAt?: string;
  wizardPayload?: Record<string, unknown> | null;
  careUnit?: { id: string; name: string } | null;
  careRecipient?: {
    id: string;
    name: string;
    dateOfBirth?: string | null;
    gender?: string | null;
  } | null;
  familyUser?: { id: string; name: string; email: string } | null;
  careEpisode?: { id: string; title?: string; status?: string } | null;
  documents?: {
    id: string;
    name: string;
    category?: string | null;
    mimeType?: string | null;
    url?: string;
    createdAt?: string;
  }[];
  reviewSummary?: Record<string, unknown> | null;
}

export async function getIntake(id: string) {
  const { data } = await apiClient.get(`/api/intake/${id}`);
  return (data.data ?? data) as IntakeRecord;
}

export async function reviewIntake(
  id: string,
  payload: {
    keyConcerns: string[];
    urgencyIndicators: string[];
    suggestedServiceCategories: ServiceCategory[];
    riskFlags?: string[];
    createEpisode?: boolean;
    episodeTitle?: string;
    notes?: string;
  },
) {
  const { data } = await apiClient.post(`/api/intake/${id}/review`, payload);
  return (data.data ?? data) as {
    intake: IntakeRecord;
    episode: { id: string; title?: string; status?: string } | null;
  };
}

export async function updateIntakeStatus(id: string, status: string, reason?: string) {
  const { data } = await apiClient.patch(`/api/intake/${id}/status`, {
    status,
    ...(reason ? { reason } : {}),
  });
  return (data.data ?? data) as IntakeRecord;
}

export async function updateIntakeUrgency(id: string, urgencyLevel: UrgencyLevel) {
  const { data } = await apiClient.patch(`/api/intake/${id}/urgency`, { urgencyLevel });
  return (data.data ?? data) as IntakeRecord;
}

export async function createCoordinatorDocumentRequest(payload: {
  targetUserId: string;
  documentType: string;
  description?: string;
}) {
  const { data } = await apiClient.post('/api/document-requests', payload);
  return data;
}

export async function approveCarePlan(id: string) {
  const { data } = await apiClient.post(`/api/care-plans/${id}/approve`);
  return data as { message?: string };
}

export async function requestCarePlanRevision(id: string, notes: string) {
  const { data } = await apiClient.post(`/api/care-plans/${id}/request-revision`, { notes });
  return data as { message?: string };
}

export async function rejectCarePlan(id: string, notes?: string) {
  const { data } = await apiClient.post(`/api/care-plans/${id}/reject`, { notes });
  return data as { message?: string };
}

export async function cosignCarePlan(id: string, notes?: string) {
  const { data } = await apiClient.post(`/api/care-plans/${id}/cosign`, notes ? { notes } : {});
  return data as { message?: string; approvalLog?: CarePlanApprovalLog; data: CarePlan };
}

/* --------------------------------------------------------- care units / people */
/* ServiceCategory + UrgencyLevel defined with intake helpers above */

export interface CarePatient {
  id: string;
  careUnitId?: string | null;
  name: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  relationship?: string | null;
  diagnosisCodes?: string[];
  pocName?: string | null;
  pocPhone?: string | null;
  externalRef?: string | null;
  notes?: string | null;
}

export interface CareUnitIntakeRecord {
  id: string;
  status: string;
  careRecipientId: string;
  submittedAt?: string;
  reasonForCare?: string;
  serviceInterests?: ServiceCategory[];
  urgencyLevel?: UrgencyLevel | null;
  wizardPayload?: Record<string, unknown> | null;
}

export interface CareUnit {
  id: string;
  name: string;
  primaryCaregiverName?: string | null;
  primaryCaregiverPhone?: string | null;
  primaryCaregiverRelation?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  careRecipients?: CarePatient[];
  intakeRecords?: CareUnitIntakeRecord[];
  careEpisodes?: {
    id: string;
    title: string;
    status: string;
    careRecipientId?: string | null;
    createdAt?: string;
  }[];
  _count?: { intakeRecords: number; careEpisodes: number };
}

export interface CarePatientRevision {
  id: string;
  careRecipientId: string;
  changeSummary?: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
  changedBy?: { id: string; name: string; email: string } | null;
}

export async function listCareUnits(params?: { search?: string; limit?: number }) {
  const { data } = await apiClient.get('/api/care-units', { params });
  return {
    data: (data.data ?? data.careUnits ?? []) as CareUnit[],
    total: (data.total ?? data.data?.length ?? 0) as number,
  };
}

export async function getCareUnit(id: string) {
  const { data } = await apiClient.get(`/api/care-units/${id}`);
  return (data.data ?? data.careUnit ?? data) as CareUnit;
}

export async function updateCareUnit(
  id: string,
  payload: Partial<{
    name: string;
    primaryCaregiverName: string;
    primaryCaregiverPhone: string;
    primaryCaregiverRelation: string;
    address: string;
    city: string;
  }>,
) {
  const { data } = await apiClient.patch(`/api/care-units/${id}`, payload);
  return (data.data ?? data) as CareUnit;
}

export async function updatePatient(
  careUnitId: string,
  patientId: string,
  payload: Partial<{
    name: string;
    dateOfBirth: string;
    gender: string;
    relationship: string;
    pocName: string;
    pocPhone: string;
    notes: string;
  }>,
) {
  const { data } = await apiClient.patch(
    `/api/care-units/${careUnitId}/patients/${patientId}`,
    payload,
  );
  return (data.data ?? data) as CarePatient;
}

export async function listPatientRevisions(careUnitId: string, patientId: string) {
  const { data } = await apiClient.get(
    `/api/care-units/${careUnitId}/patients/${patientId}/revisions`,
  );
  return (data.data ?? data.revisions ?? []) as CarePatientRevision[];
}

const COUNTRY_LABELS: Record<string, string> = {
  QA: 'Qatar',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  AU: 'Australia',
  QAT: 'Qatar',
  SAU: 'Saudi Arabia',
  EGY: 'Egypt',
  AUS: 'Australia',
};

export function formatCountry(code?: string | null): string | null {
  if (!code) return null;
  return COUNTRY_LABELS[code] ?? code;
}
