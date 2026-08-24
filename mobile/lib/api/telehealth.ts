import axios from 'axios';
import { apiClient } from './client';

export type JoinPhase = 'waiting' | 'in_call';

export type TelehealthJoin = {
  token: string;
  roomName: string;
  serverUrl?: string;
  phase: JoinPhase;
  sessionId?: string;
  meetingId?: string;
};

export function isTelehealthConsentRequired(error: unknown): boolean {
  const err = error as { response?: { status?: number; data?: { details?: { code?: string } } } };
  if (err.response?.status !== 403) return false;
  return err.response.data?.details?.code === 'telehealth_consent_required';
}

export function isLiveKitUrlReady(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('ws')) return false;
  return !trimmed.includes('your-livekit-server');
}

export function sessionJoinRoomName(session: { id: string; livekitRoomId?: string | null }): string {
  return session.livekitRoomId?.trim() || `session-${session.id}`;
}

export async function joinTelehealthRoom(roomName: string) {
  const { data } = await apiClient.post<TelehealthJoin>('/api/telehealth/token', { roomName });
  return data;
}

export async function grantTelehealthConsent() {
  const { data } = await apiClient.post('/api/client/consents', {
    consentType: 'telehealth',
    description: 'Consent to join video care sessions',
  });
  return data;
}

export type TelehealthLobbyUser = {
  id: string;
  name: string;
  role?: string;
};

export type TelehealthLobby = {
  sessionId: string;
  roomName: string;
  lobby: TelehealthLobbyUser[];
  admitted: string[];
};

export type TelehealthContextNote = {
  id: string;
  content: string;
  isPrivate: boolean;
  noteType: string;
  createdAt: string;
  author?: { id: string; name: string; role?: string } | null;
};

export type TelehealthContext = {
  episode: { id: string; title: string; status: string } | null;
  carePlan: {
    id: string;
    title: string;
    status: string;
    version: number;
    items: { serviceType: string; frequency?: string | null; duration?: string | null }[];
    goals: { id: string; title: string; status: string; tier?: string | null }[];
  } | null;
  notes: TelehealthContextNote[];
};

export async function getTelehealthLobby(sessionId: string) {
  const { data } = await apiClient.get<TelehealthLobby & { success?: boolean }>(
    `/api/telehealth/sessions/${sessionId}/lobby`,
  );
  return data;
}

export async function admitTelehealthParticipant(sessionId: string, userId: string) {
  const { data } = await apiClient.post(`/api/telehealth/sessions/${sessionId}/admit`, { userId });
  return data;
}

export async function getTelehealthContext(sessionId: string) {
  const { data } = await apiClient.get<TelehealthContext & { success?: boolean }>(
    `/api/telehealth/sessions/${sessionId}/context`,
  );
  return data;
}

export async function addTelehealthSessionNote(
  sessionId: string,
  opts: { content: string; noteType?: string; isPrivate?: boolean },
) {
  const { data } = await apiClient.post<{ success: boolean; data: TelehealthContextNote }>(
    `/api/telehealth/sessions/${sessionId}/notes`,
    opts,
  );
  return data.data;
}

export type TelehealthRecording = {
  recordingUrl?: string | null;
  status?: string | null;
  expiresIn?: number;
};

export async function getTelehealthRecording(sessionId: string) {
  const { data } = await apiClient.get<TelehealthRecording>(
    `/api/telehealth/sessions/${sessionId}/recording`,
  );
  return data;
}

export async function startTelehealthRecording(sessionId: string) {
  const { data } = await apiClient.post(`/api/telehealth/sessions/${sessionId}/recording/start`);
  return data as { success: boolean; status?: string; egressId?: string };
}

export async function stopTelehealthRecording(sessionId: string) {
  const { data } = await apiClient.post(`/api/telehealth/sessions/${sessionId}/recording/stop`);
  return data as { success: boolean; status?: string };
}

/** Extract API error code without throwing through axios wrappers. */
export function axiosStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return undefined;
}
