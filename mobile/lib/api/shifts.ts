/**
 * Support worker shifts and tasks — mirrors mern/client/src/lib/api/shifts.ts.
 */

import { apiClient } from './client';

export interface Shift {
  id: string;
  workerId: string;
  bookingId?: string | null;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  breakStartAt?: string | null;
  breakEndAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  shiftId?: string | null;
  careEpisodeId?: string | null;
  goalId?: string | null;
  assignerId: string;
  assigneeId: string;
  title: string;
  description?: string | null;
  status: string;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  completionEvidence?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  assignee?: { id: string; name: string; role?: string };
  assigner?: { id: string; name: string };
  goal?: { id: string; title: string; status?: string };
  careEpisode?: {
    id: string;
    title: string;
    status?: string;
    patient?: { id: string; name: string } | null;
    careRecipient?: { id: string; name: string } | null;
    coordinator?: { id: string; name: string } | null;
  } | null;
}

export async function startShift(bookingId?: string) {
  const { data } = await apiClient.post('/api/shifts/start', bookingId ? { bookingId } : {});
  return data as { data: Shift; message?: string };
}

export async function endShift(id: string) {
  const { data } = await apiClient.post(`/api/shifts/${id}/end`);
  return (data.data ?? data) as Shift;
}

export async function getActiveShift() {
  const { data } = await apiClient.get('/api/shifts/active');
  return (data.data ?? null) as Shift | null;
}

export async function getShiftHistory() {
  const { data } = await apiClient.get('/api/shifts/history');
  return (data.data ?? data.shifts ?? []) as Shift[];
}

export async function listMyTasks(params?: { status?: string; episodeId?: string; limit?: number }) {
  const { data } = await apiClient.get('/api/tasks', {
    params: { assignee: 'me', ...params },
  });
  return {
    data: (data.data ?? data.tasks ?? []) as Task[],
    meta: data.meta as { total?: number } | undefined,
  };
}

export async function completeTask(
  id: string,
  payload?: { completionEvidence?: string; notes?: string; actualDuration?: number },
) {
  const { data } = await apiClient.post(`/api/tasks/${id}/complete`, payload ?? {});
  return data as { message?: string; data: Task };
}
