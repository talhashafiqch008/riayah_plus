import { client } from './client';

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
  const { data } = await client.post<{ data: Shift; message?: string }>('/shifts/start', {
    bookingId,
  });
  return data;
}

export async function endShift(id: string) {
  const { data } = await client.post<{ data: Shift }>(`/shifts/${id}/end`);
  return data.data;
}

export async function getActiveShift() {
  const { data } = await client.get<{ data: Shift | null }>('/shifts/active');
  return data.data;
}

export async function getShiftHistory() {
  const { data } = await client.get<{ data: Shift[] }>('/shifts/history');
  return data.data;
}

export async function listMyTasks(params?: { status?: string; episodeId?: string }) {
  const { data } = await client.get<{ data: Task[]; meta?: { total: number } }>('/tasks', {
    params: { assignee: 'me', ...params },
  });
  return data;
}

export async function assignEpisodeTasks(episodeId: string, assigneeId: string) {
  const { data } = await client.post<{
    message: string;
    updated: number;
    data: Task[];
  }>('/tasks/assign-episode', { episodeId, assigneeId });
  return data;
}

export async function completeTask(
  id: string,
  payload?: { completionEvidence?: string; notes?: string; actualDuration?: number },
) {
  const { data } = await client.post<{ message: string; data: Task }>(
    `/tasks/${id}/complete`,
    payload ?? {},
  );
  return data;
}

export async function updateTaskStatus(
  id: string,
  status: string,
  extra?: { completionEvidence?: string; actualDuration?: number },
) {
  const { data } = await client.patch<{ data: Task }>(`/tasks/${id}/status`, {
    status,
    ...extra,
  });
  return data.data;
}

export async function updateTask(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    status: string;
    assigneeId: string;
    completionEvidence: string;
  }>,
) {
  const { data } = await client.put<{ data: Task }>(`/tasks/${id}`, payload);
  return data.data;
}
