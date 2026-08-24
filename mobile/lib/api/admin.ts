import { apiClient } from './client';
import { normalizeEmail } from '../format';

function unwrapList<T = Record<string, unknown>>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw =
    p.data ??
    p.items ??
    p.users ??
    p.families ??
    p.organizations ??
    p.payments ??
    p.payouts ??
    p.documents ??
    p.disputes ??
    p.incidents ??
    p.services ??
    p.logs ??
    p.auditLogs ??
    p.bookings ??
    p.staff ??
    p.providers ??
    p;
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export { unwrapList };

export async function fetchAdminDashboard() {
  const { data } = await apiClient.get('/api/admin/dashboard');
  return data.data ?? data;
}

export async function fetchAdminDashboardFull() {
  try {
    const { data } = await apiClient.get('/api/admin/dashboard/full');
    return data.data ?? data;
  } catch {
    return null;
  }
}

export async function fetchAdminUserAnalytics() {
  try {
    const { data } = await apiClient.get('/api/admin/dashboard/user-analytics');
    return data.data ?? data;
  } catch {
    return null;
  }
}

export async function fetchAdminUsers(params?: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await apiClient.get('/api/admin/users', { params });
  return data;
}

export async function fetchAdminUser(id: string) {
  const { data } = await apiClient.get(`/api/admin/users/${id}`);
  return data.data ?? data;
}

export async function fetchAdminFamilies(params?: {
  search?: string;
  unassigned?: boolean;
  limit?: number;
}) {
  const { data } = await apiClient.get('/api/admin/families', {
    params: {
      search: params?.search,
      limit: params?.limit ?? 100,
      unassigned: params?.unassigned === false ? 'false' : 'true',
    },
  });
  return data;
}

export async function assignFamilyOrganization(familyId: string, organizationId: string) {
  const { data } = await apiClient.patch(`/api/admin/families/${familyId}/organization`, {
    organizationId,
  });
  return data;
}

export async function fetchAdminOrganizations() {
  const { data } = await apiClient.get('/api/admin/organizations');
  return data;
}

export async function fetchAdminOrganization(id: string) {
  const { data } = await apiClient.get(`/api/admin/organizations/${id}`);
  return data.data ?? data;
}

export async function createAdminOrganization(body: {
  name: string;
  email: string;
  adminName?: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
}) {
  const { data } = await apiClient.post('/api/admin/organizations', {
    ...body,
    email: normalizeEmail(body.email),
  });
  return data;
}

export async function updateAdminOrganization(
  id: string,
  body: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    isActive?: boolean;
  },
) {
  const payload = {
    ...body,
    email:
      body.email === null || body.email === undefined
        ? body.email
        : normalizeEmail(body.email),
  };
  const { data } = await apiClient.patch(`/api/admin/organizations/${id}`, payload);
  return data;
}

export async function createAdminClinic(
  orgId: string,
  body: { name: string; phone?: string; address?: string },
) {
  const { data } = await apiClient.post(`/api/admin/organizations/${orgId}/clinics`, body);
  return data;
}

export async function createAdminDepartment(clinicId: string, body: { name: string }) {
  const { data } = await apiClient.post(`/api/admin/clinics/${clinicId}/departments`, body);
  return data;
}

export async function fetchAdminRevenueBreakdown(months = 6) {
  try {
    const { data } = await apiClient.get('/api/admin/dashboard/revenue-breakdown', {
      params: { months },
    });
    return data.data ?? data;
  } catch {
    return null;
  }
}

export async function fetchAdminAuditLogs(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get('/api/admin/audit-logs', { params });
  return data;
}

export async function fetchAdminProvidersPending() {
  const { data } = await apiClient.get('/api/admin/providers/pending');
  return data;
}

export async function fetchAdminStaff() {
  const { data } = await apiClient.get('/api/admin/staff');
  return data;
}

export async function fetchAdminBookings(params?: Record<string, unknown>) {
  const { data } = await apiClient.get('/api/admin/bookings', { params });
  return data;
}

export async function fetchAdminPayments() {
  const { data } = await apiClient.get('/api/admin/payments');
  return data;
}

export async function fetchAdminPayouts() {
  const { data } = await apiClient.get('/api/admin/payouts');
  return data;
}

export async function fetchAdminDocuments(params?: { status?: string }) {
  const { data } = await apiClient.get('/api/admin/documents', { params });
  return data;
}

export async function fetchAdminDocumentsPending() {
  const { data } = await apiClient.get('/api/admin/documents/pending');
  return data;
}

export async function fetchAdminDisputes() {
  const { data } = await apiClient.get('/api/admin/disputes');
  return data;
}

export async function fetchAdminIncidents() {
  const { data } = await apiClient.get('/api/admin/incidents');
  return data;
}

export async function fetchAdminServices() {
  const { data } = await apiClient.get('/api/admin/services');
  return data;
}

export async function fetchAdminSettings() {
  const { data } = await apiClient.get('/api/admin/settings');
  return data;
}

export async function fetchAdminComplianceStats() {
  const { data } = await apiClient.get('/api/admin/compliance/stats');
  return data.data ?? data;
}

export async function fetchAdminVerificationQueue() {
  const { data } = await apiClient.get('/api/admin/verification-queue');
  return data;
}

export async function approveAdminPayout(id: string) {
  const { data } = await apiClient.patch(`/api/admin/payouts/${id}/approve`);
  return data;
}
