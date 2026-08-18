/**
 * Org Admin API — mirrors mern/client/src/lib/api/org.ts
 * Paths are prefixed with `/api` because the mobile axios base URL is origin-only.
 */

import { apiClient } from './client';
import { normalizeEmail } from '../format';

export type OrgCoordinator = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  mustSetPassword: boolean;
  createdAt?: string;
};

export type OrgFamily = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  onboardingStatus?: string;
  assignedCoordinatorId?: string | null;
  assignedCoordinator?: { id: string; name: string; email: string } | null;
  createdAt: string;
  _count?: { submittedIntakes: number; careUnitsOwned: number };
};

export type OrgPendingIntake = {
  id: string;
  status: string;
  urgencyLevel?: string | null;
  reasonForCare?: string | null;
  submittedAt?: string | null;
  careUnit?: { id: string; name: string };
  careRecipient?: { id: string; name: string };
  familyUser: {
    id: string;
    name: string;
    email: string;
    assignedCoordinatorId?: string | null;
  };
};

export type OrgDashboard = {
  organizationId: string;
  stats: {
    families: number;
    coordinators: number;
    pendingIntakes: number;
  };
};

export type OrgStaffRole =
  | 'clinical_staff'
  | 'doctor'
  | 'nurse'
  | 'physiotherapist'
  | 'occupational_therapist'
  | 'speech_therapist'
  | 'psychologist'
  | 'dietitian'
  | 'therapist'
  | 'support_worker';

export type OrgStaff = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: OrgStaffRole | string;
  isActive: boolean;
  mustSetPassword: boolean;
  createdAt?: string;
};

export const ORG_STAFF_ROLE_OPTIONS: { value: OrgStaffRole; label: string }[] = [
  { value: 'clinical_staff', label: 'Clinical staff' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'occupational_therapist', label: 'Occupational therapist' },
  { value: 'speech_therapist', label: 'Speech therapist' },
  { value: 'psychologist', label: 'Psychologist' },
  { value: 'dietitian', label: 'Dietitian' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'support_worker', label: 'Support worker' },
];

export async function getOrgDashboard() {
  const { data } = await apiClient.get('/api/org/dashboard');
  return (data.data ?? data) as OrgDashboard;
}

export async function listOrgCoordinators() {
  const { data } = await apiClient.get('/api/org/coordinators');
  return (data.data ?? []) as OrgCoordinator[];
}

export async function createOrgCoordinator(payload: {
  name: string;
  email: string;
  phone?: string;
}) {
  const { data } = await apiClient.post('/api/org/coordinators', {
    ...payload,
    email: normalizeEmail(payload.email),
  });
  return data;
}

export async function updateOrgCoordinator(
  id: string,
  payload: { name?: string; phone?: string | null; isActive?: boolean },
) {
  const { data } = await apiClient.patch(`/api/org/coordinators/${id}`, payload);
  return data;
}

export async function resendOrgCoordinatorInvite(id: string) {
  const { data } = await apiClient.post(`/api/org/coordinators/${id}/resend-invite`);
  return data;
}

export async function listOrgFamilies() {
  const { data } = await apiClient.get('/api/org/families');
  return (data.data ?? []) as OrgFamily[];
}

export async function assignOrgFamilyCoordinator(
  familyId: string,
  coordinatorId: string | null,
) {
  const { data } = await apiClient.patch(`/api/org/families/${familyId}/coordinator`, {
    coordinatorId,
  });
  return data;
}

export async function listOrgPendingIntakes() {
  const { data } = await apiClient.get('/api/org/pending-intakes');
  return data as { data: OrgPendingIntake[]; total: number };
}

export async function listOrgStaff() {
  const { data } = await apiClient.get('/api/org/staff');
  return (data.data ?? []) as OrgStaff[];
}

export async function createOrgStaff(payload: {
  name: string;
  email: string;
  phone?: string;
  role: OrgStaffRole;
}) {
  const { data } = await apiClient.post('/api/org/staff', {
    ...payload,
    email: normalizeEmail(payload.email),
  });
  return data;
}

export async function updateOrgStaff(
  id: string,
  payload: { name?: string; phone?: string | null; isActive?: boolean },
) {
  const { data } = await apiClient.patch(`/api/org/staff/${id}`, payload);
  return data;
}

export async function resendOrgStaffInvite(id: string) {
  const { data } = await apiClient.post(`/api/org/staff/${id}/resend-invite`);
  return data;
}
