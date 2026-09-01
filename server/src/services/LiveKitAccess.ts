import { AccessToken, WebhookReceiver } from 'livekit-server-sdk';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { canOrgAdminAccessEpisode, isCoordinatorRole } from '../utils/careAccess';

export type TelehealthActor = {
  userId: string;
  role: string;
  organizationId?: string | null;
};

export type SessionAccessRow = {
  providerId: string;
  clientId: string;
  status: string;
  episode?: { coordinatorId: string; organizationId?: string | null } | null;
};

export type MeetingAccessRow = {
  hostId: string;
  participantId: string;
  status: string;
  episodeOrganizationId?: string | null;
};

export function sessionRoomName(sessionId: string): string {
  return `session-${sessionId}`;
}

export function parseSessionIdFromRoom(roomName: string): string | null {
  const base = roomName.trim().replace(/__waiting$/, '');
  const match = /^session-(.+)$/.exec(base);
  return match?.[1] ?? null;
}

export type JoinPhase = 'waiting' | 'in_call';

export type TelehealthControl = { lobby: string[]; admitted: string[] };

export function waitingRoomName(baseRoom: string): string {
  return baseRoom.endsWith('__waiting') ? baseRoom : `${baseRoom}__waiting`;
}

export function resolveJoinPhase(opts: { isStaff: boolean; admitted: boolean }): JoinPhase {
  return opts.isStaff || opts.admitted ? 'in_call' : 'waiting';
}

export function joinGrants(phase: JoinPhase): {
  roomJoin: true;
  canPublish: boolean;
  canSubscribe: boolean;
} {
  if (phase === 'waiting') {
    return { roomJoin: true, canPublish: true, canSubscribe: false };
  }
  return { roomJoin: true, canPublish: true, canSubscribe: true };
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

export function parseTelehealthControl(raw: unknown): TelehealthControl {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  return { lobby: asIdList(obj.lobby), admitted: asIdList(obj.admitted) };
}

export function enterLobby(control: TelehealthControl, userId: string): TelehealthControl {
  if (control.admitted.includes(userId) || control.lobby.includes(userId)) return control;
  return { ...control, lobby: [...control.lobby, userId] };
}

export function admitParticipant(control: TelehealthControl, userId: string): TelehealthControl {
  return {
    lobby: control.lobby.filter((id) => id !== userId),
    admitted: control.admitted.includes(userId) ? control.admitted : [...control.admitted, userId],
  };
}

export function isDirectSessionParticipant(session: SessionAccessRow, actor: TelehealthActor): boolean {
  return session.providerId === actor.userId || session.clientId === actor.userId;
}

export function isAssignedEpisodeCoordinator(session: SessionAccessRow, actor: TelehealthActor): boolean {
  return isCoordinatorRole(actor.role) && session.episode?.coordinatorId === actor.userId;
}

export function canJoinSessionRoom(session: SessionAccessRow, actor: TelehealthActor): boolean {
  if (isDirectSessionParticipant(session, actor)) return true;
  if (isAssignedEpisodeCoordinator(session, actor)) return true;
  if (canOrgAdminAccessEpisode(actor, session.episode?.organizationId)) return true;
  return false;
}

export function canCreateSessionRoom(session: SessionAccessRow, actor: TelehealthActor): boolean {
  if (session.providerId === actor.userId) return true;
  if (isAssignedEpisodeCoordinator(session, actor)) return true;
  return false;
}

export function isDirectMeetingParticipant(meeting: MeetingAccessRow, actor: TelehealthActor): boolean {
  return meeting.hostId === actor.userId || meeting.participantId === actor.userId;
}

export function canJoinMeeting(meeting: MeetingAccessRow, actor: TelehealthActor): boolean {
  if (isDirectMeetingParticipant(meeting, actor)) return true;
  if (canOrgAdminAccessEpisode(actor, meeting.episodeOrganizationId)) return true;
  return false;
}

export function meetingAccessRow(
  meeting: Pick<MeetingAccessRow, 'hostId' | 'participantId' | 'status'>,
  episodeOrganizationId?: string | null,
): MeetingAccessRow {
  return { ...meeting, episodeOrganizationId };
}

export function canAdmitMeeting(meeting: Pick<MeetingAccessRow, 'hostId'>, actor: TelehealthActor): boolean {
  return meeting.hostId === actor.userId;
}

export function isJoinableMeeting(meeting: Pick<MeetingAccessRow, 'status'>): boolean {
  return meeting.status !== 'ended' && meeting.status !== 'cancelled';
}

export function isJoinableSession(session: Pick<SessionAccessRow, 'status'>): boolean {
  return session.status !== 'completed' && session.status !== 'cancelled' && session.status !== 'no_show';
}

export async function receiveLiveKitWebhookEvent(
  body: string,
  authHeader: string | undefined,
  apiKey: string,
  apiSecret: string,
) {
  if (!apiKey?.trim() || !apiSecret?.trim()) {
    throw new AppError('LiveKit webhook is not configured.', 503);
  }
  if (!authHeader?.trim()) {
    throw new AppError('Invalid LiveKit webhook signature.', 401);
  }
  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    return await receiver.receive(body, authHeader);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid LiveKit webhook signature.', 401);
  }
}

export function assertLiveKitConfigured(): void {
  if (!env.LIVEKIT_API_KEY?.trim() || !env.LIVEKIT_API_SECRET?.trim() || !env.LIVEKIT_URL?.trim()) {
    throw new AppError('LiveKit is not configured.', 503);
  }
}

export async function issueLiveKitJoinToken(opts: {
  identity: string;
  name: string;
  roomName: string;
  ttl?: string;
  phase?: JoinPhase;
}): Promise<string> {
  assertLiveKitConfigured();
  const grants = joinGrants(opts.phase ?? 'in_call');
  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: opts.identity,
    name: opts.name,
    ttl: opts.ttl ?? '2h',
  });
  at.addGrant({
    room: opts.roomName,
    roomJoin: grants.roomJoin,
    canPublish: grants.canPublish,
    canSubscribe: grants.canSubscribe,
  });
  return at.toJwt();
}
