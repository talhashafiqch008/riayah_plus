import { apiClient } from './client';

export type VoiceRecording = {
  id: string;
  userId: string;
  organizationId?: string | null;
  title?: string | null;
  notes?: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  sessionId?: string | null;
  meetingId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listVoiceRecordings() {
  const { data } = await apiClient.get<{ data: VoiceRecording[] }>('/api/voice-recordings');
  return data.data ?? [];
}

export async function uploadVoiceRecording(input: {
  uri: string;
  fileName: string;
  mimeType: string;
  title?: string;
  notes?: string;
  durationSeconds?: number;
  sessionId?: string;
  meetingId?: string;
}) {
  const form = new FormData();
  form.append('file', {
    uri: input.uri,
    name: input.fileName,
    type: input.mimeType,
  } as unknown as Blob);
  if (input.title?.trim()) form.append('title', input.title.trim());
  if (input.notes?.trim()) form.append('notes', input.notes.trim());
  if (typeof input.durationSeconds === 'number') {
    form.append('durationSeconds', String(Math.round(input.durationSeconds)));
  }
  if (input.sessionId?.trim()) form.append('sessionId', input.sessionId.trim());
  if (input.meetingId?.trim()) form.append('meetingId', input.meetingId.trim());

  const { data } = await apiClient.post<{ data: VoiceRecording }>('/api/voice-recordings', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  });
  return data.data;
}

export async function getVoiceRecordingPlayback(id: string) {
  const { data } = await apiClient.get<{
    data: { url: string; expiresIn: number; recording: VoiceRecording };
  }>(`/api/voice-recordings/${id}/playback`);
  return data.data;
}

export async function deleteVoiceRecording(id: string) {
  const { data } = await apiClient.delete<{ success?: boolean }>(`/api/voice-recordings/${id}`);
  return data;
}
