/**
 * Scheduling API — mirrors mern/client/src/lib/api/scheduling.ts
 */

import { apiClient } from './client';
import type { StaffCardLike } from './care';

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface CareSession {
  id: string;
  episodeId?: string | null;
  providerId: string;
  clientId: string;
  type: string;
  status: string;
  scheduledAt: string;
  livekitRoomId?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  checkInLat?: number | string | null;
  checkInLng?: number | string | null;
  geofenceStatus?: string | null;
  isGeofenced?: boolean;
  provider?: StaffCardLike;
  client?: { id: string; name: string };
}

export type ScheduleStaffOption = StaffCardLike & {
  role: string;
  languages?: string[];
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayOfWeekLabel(day: number): string {
  return DAY_LABELS[day] ?? String(day);
}

export async function listAvailability(providerId?: string) {
  const { data } = await apiClient.get('/api/availability', {
    params: providerId ? { providerId } : undefined,
  });
  return data as { providerId: string; slots: AvailabilitySlot[] };
}

export async function replaceAvailability(
  providerId: string,
  slots: Omit<AvailabilitySlot, 'id' | 'providerId'>[],
) {
  const { data } = await apiClient.put(`/api/availability/${providerId}`, { slots });
  return data as { providerId: string; slots: AvailabilitySlot[] };
}

export async function listSessions(params?: { episodeId?: string; providerId?: string }) {
  const { data } = await apiClient.get('/api/scheduling/sessions', { params });
  return (data.sessions ?? data.data ?? []) as CareSession[];
}

export async function getSession(id: string) {
  const { data } = await apiClient.get(`/api/scheduling/sessions/${id}`);
  return (data.session ?? data.data ?? data) as CareSession;
}

export async function bookSession(payload: {
  episodeId: string;
  providerId: string;
  scheduledAt: string;
  durationMinutes?: number;
  type?: 'in_person' | 'telehealth' | 'home_visit';
  notes?: string;
  assignPendingTasks?: boolean;
}) {
  const { data } = await apiClient.post('/api/scheduling/sessions', payload);
  return (data.session ?? data.data ?? data) as CareSession;
}

export async function bookRecurringSessions(payload: {
  episodeId: string;
  providerId: string;
  scheduledAt: string;
  durationMinutes?: number;
  type?: 'in_person' | 'telehealth' | 'home_visit';
  notes?: string;
  assignPendingTasks?: boolean;
  recurrence: { frequency: 'daily' | 'weekly'; count: number; interval?: number };
}) {
  const { data } = await apiClient.post('/api/scheduling/sessions/recurring', payload);
  return data as {
    sessions: CareSession[];
    created: number;
    skipped: { scheduledAt: string; reason: string }[];
  };
}

export async function cancelSession(id: string) {
  const { data } = await apiClient.delete(`/api/scheduling/sessions/${id}`);
  return data as { message: string; session: CareSession };
}

export async function listScheduleStaff() {
  const { data } = await apiClient.get('/api/scheduling/staff');
  return (data.data ?? []) as ScheduleStaffOption[];
}

export function scheduleStaffRoleLabel(role: string): string {
  return role.replace(/_/g, ' ');
}
