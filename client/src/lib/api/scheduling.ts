import { client } from './client';

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
  durationMinutes?: number | null;
  notes?: string | null;
  provider?: { id: string; name: string; role?: string };
  client?: { id: string; name: string };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayOfWeekLabel(day: number): string {
  return DAY_LABELS[day] ?? String(day);
}

export async function listAvailability(providerId?: string) {
  const { data } = await client.get<{
    providerId: string;
    slots: AvailabilitySlot[];
  }>('/availability', { params: providerId ? { providerId } : undefined });
  return data;
}

export async function replaceAvailability(
  providerId: string,
  slots: Omit<AvailabilitySlot, 'id' | 'providerId'>[],
) {
  const { data } = await client.put<{ providerId: string; slots: AvailabilitySlot[] }>(
    `/availability/${providerId}`,
    { slots },
  );
  return data;
}

export async function listSessions(params?: { episodeId?: string; providerId?: string }) {
  const { data } = await client.get<{ sessions: CareSession[] }>('/scheduling/sessions', {
    params,
  });
  return data.sessions;
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
  const { data } = await client.post<{ session: CareSession }>('/scheduling/sessions', payload);
  return data.session;
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
  const { data } = await client.post<{
    sessions: CareSession[];
    created: number;
    skipped: { scheduledAt: string; reason: string }[];
  }>('/scheduling/sessions/recurring', payload);
  return data;
}

export async function cancelSession(id: string) {
  const { data } = await client.delete<{ message: string; session: CareSession }>(
    `/scheduling/sessions/${id}`,
  );
  return data;
}

export interface ScheduleStaffOption {
  id: string;
  name: string;
  email?: string;
  role: string;
}

export async function listScheduleStaff() {
  const { data } = await client.get<{ data: ScheduleStaffOption[] }>('/scheduling/staff');
  return data.data;
}

export function scheduleStaffRoleLabel(role: string): string {
  return role.replace(/_/g, ' ');
}
