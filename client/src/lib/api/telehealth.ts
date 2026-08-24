import { client } from './client';
import { extractApiError, isApiError } from '@/lib/errors';

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
  if (!isApiError(error) || error.statusCode !== 403) return false;
  const details = error.details;
  if (!details || typeof details !== 'object') return false;
  return (details as { code?: string }).code === 'telehealth_consent_required';
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
  try {
    const { data } = await client.post<TelehealthJoin>('/telehealth/token', { roomName });
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function grantTelehealthConsent() {
  try {
    const { data } = await client.post('/client/consents', {
      consentType: 'telehealth',
      description: 'Consent to join video care sessions',
    });
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
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
  try {
    const { data } = await client.get<TelehealthLobby & { success?: boolean }>(
      `/telehealth/sessions/${sessionId}/lobby`,
    );
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function admitTelehealthParticipant(sessionId: string, userId: string) {
  try {
    const { data } = await client.post(`/telehealth/sessions/${sessionId}/admit`, { userId });
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function getTelehealthContext(sessionId: string) {
  try {
    const { data } = await client.get<TelehealthContext & { success?: boolean }>(
      `/telehealth/sessions/${sessionId}/context`,
    );
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function addTelehealthSessionNote(
  sessionId: string,
  opts: { content: string; noteType?: string; isPrivate?: boolean },
) {
  try {
    const { data } = await client.post<{ success: boolean; data: TelehealthContextNote }>(
      `/telehealth/sessions/${sessionId}/notes`,
      opts,
    );
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export type TelehealthRecording = {
  recordingUrl?: string | null;
  status?: string | null;
  expiresIn?: number;
};

export async function startTelehealthRecording(sessionId: string) {
  try {
    const { data } = await client.post(`/telehealth/sessions/${sessionId}/recording/start`);
    return data as { success: boolean; status?: string; egressId?: string };
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function stopTelehealthRecording(sessionId: string) {
  try {
    const { data } = await client.post(`/telehealth/sessions/${sessionId}/recording/stop`);
    return data as { success: boolean; status?: string };
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function getTelehealthRecording(sessionId: string) {
  try {
    const { data } = await client.get<TelehealthRecording>(`/telehealth/sessions/${sessionId}/recording`);
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

/** Legacy careseeker/provider video rooms (`POST /video/token`). */
export async function getLiveKitToken(params: {
  roomName: string;
  participantName: string;
  bookingId?: string | number;
}) {
  try {
    const response = await client.post('/video/token', {
      room_name: params.roomName,
      participant_name: params.participantName,
      booking_id: params.bookingId,
    });
    return response.data;
  } catch (error) {
    throw extractApiError(error);
  }
}
