import { client } from './client';

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

export async function getOrgDashboard() {
  const { data } = await client.get('/org/dashboard');
  return data.data ?? data;
}

export async function listOrgCoordinators() {
  const { data } = await client.get<{ data: OrgCoordinator[] }>('/org/coordinators');
  return data.data ?? [];
}

export async function createOrgCoordinator(payload: {
  name: string;
  email: string;
  phone?: string;
}) {
  const { data } = await client.post('/org/coordinators', payload);
  return data;
}

export async function updateOrgCoordinator(
  id: string,
  payload: { name?: string; phone?: string | null; isActive?: boolean },
) {
  const { data } = await client.patch(`/org/coordinators/${id}`, payload);
  return data;
}

export async function resendOrgCoordinatorInvite(id: string) {
  const { data } = await client.post(`/org/coordinators/${id}/resend-invite`);
  return data;
}

export async function listOrgFamilies() {
  const { data } = await client.get<{ data: OrgFamily[] }>('/org/families');
  return data.data ?? [];
}

export async function assignOrgFamilyCoordinator(
  familyId: string,
  coordinatorId: string | null,
) {
  const { data } = await client.patch(`/org/families/${familyId}/coordinator`, {
    coordinatorId,
  });
  return data;
}

export async function listOrgPendingIntakes() {
  const { data } = await client.get<{ data: OrgPendingIntake[]; total: number }>(
    '/org/pending-intakes',
  );
  return data;
}

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

export async function listOrgStaff() {
  const { data } = await client.get<{ data: OrgStaff[] }>('/org/staff');
  return data.data ?? [];
}

export async function createOrgStaff(payload: {
  name: string;
  email: string;
  phone?: string;
  role: OrgStaffRole;
}) {
  const { data } = await client.post('/org/staff', payload);
  return data;
}

export async function updateOrgStaff(
  id: string,
  payload: { name?: string; phone?: string | null; isActive?: boolean },
) {
  const { data } = await client.patch(`/org/staff/${id}`, payload);
  return data;
}

export async function resendOrgStaffInvite(id: string) {
  const { data } = await client.post(`/org/staff/${id}/resend-invite`);
  return data;
}
