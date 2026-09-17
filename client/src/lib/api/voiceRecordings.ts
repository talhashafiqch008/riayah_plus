import { client } from './client';
import { extractApiError } from '@/lib/errors';

export type VoiceRecording = {
  id: string;
  userId: string;
  patientId?: string | null;
  careRecipientId?: string | null;
  episodeId?: string | null;
  organizationId?: string | null;
  title?: string | null;
  notes?: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  sessionId?: string | null;
  meetingId?: string | null;
  patientName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VoiceRecordingPatient = {
  id: string;
  patientId: string;
  careRecipientId: string | null;
  episodeId: string;
  name: string;
  episodeTitle: string;
};

export async function listVoiceRecordingPatients() {
  try {
    const { data } = await client.get<{ data: VoiceRecordingPatient[] }>(
      '/voice-recordings/patients',
    );
    return data.data ?? [];
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function listVoiceRecordings() {
  try {
    const { data } = await client.get<{ data: VoiceRecording[] }>('/voice-recordings');
    return data.data ?? [];
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function uploadVoiceRecording(input: {
  file: Blob;
  fileName: string;
  title?: string;
  notes?: string;
  durationSeconds?: number;
  sessionId?: string;
  meetingId?: string;
  patientId: string;
  careRecipientId?: string | null;
  episodeId?: string | null;
}) {
  try {
    const form = new FormData();
    form.append('file', input.file, input.fileName);
    form.append('patientId', input.patientId);
    if (input.careRecipientId?.trim()) form.append('careRecipientId', input.careRecipientId.trim());
    if (input.episodeId?.trim()) form.append('episodeId', input.episodeId.trim());
    if (input.title?.trim()) form.append('title', input.title.trim());
    if (input.notes?.trim()) form.append('notes', input.notes.trim());
    if (typeof input.durationSeconds === 'number') {
      form.append('durationSeconds', String(Math.round(input.durationSeconds)));
    }
    if (input.sessionId?.trim()) form.append('sessionId', input.sessionId.trim());
    if (input.meetingId?.trim()) form.append('meetingId', input.meetingId.trim());

    const { data } = await client.post<{ data: VoiceRecording }>('/voice-recordings', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function getVoiceRecordingPlayback(id: string) {
  try {
    const { data } = await client.get<{
      data: { url: string; expiresIn: number; recording: VoiceRecording };
    }>(`/voice-recordings/${id}/playback`);
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function deleteVoiceRecording(id: string) {
  try {
    const { data } = await client.delete<{ success?: boolean }>(`/voice-recordings/${id}`);
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}
