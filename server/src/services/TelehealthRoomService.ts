import { RoomServiceClient } from 'livekit-server-sdk';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from './NotificationService';
import {
  admitParticipant,
  canAdmitMeeting,
  canCreateSessionRoom,
  enterLobby,
  parseTelehealthControl,
  resolveJoinPhase,
  sessionRoomName,
  waitingRoomName,
  type JoinPhase,
  type TelehealthActor,
  type TelehealthControl,
} from './LiveKitAccess';

const CONFIRMED = new Set(['accepted', 'in_progress']);
const BLOCKED = new Set(['pending', 'cancelled', 'completed', 'no_show', 'rejected']);

export function shouldProvisionTelehealthRoom(session: {
  type: string;
  status: string;
  livekitRoomId?: string | null;
}): boolean {
  if (session.type !== 'telehealth') return false;
  if (session.livekitRoomId) return false;
  if (BLOCKED.has(session.status)) return false;
  return CONFIRMED.has(session.status);
}

export function telehealthNotifyUserIds(opts: {
  clientId: string;
  providerId: string;
  coordinatorId?: string | null;
}): string[] {
  const ids = new Set<string>([opts.clientId, opts.providerId]);
  if (opts.coordinatorId) ids.add(opts.coordinatorId);
  return [...ids];
}

export type ProvisionResult =
  | { provisioned: false; reason: 'not_found' | 'not_telehealth' | 'not_confirmed' | 'already_exists'; roomName?: string }
  | { provisioned: true; roomName: string; notified: string[] };

async function tryCreateLiveKitRoom(roomName: string): Promise<void> {
  if (!env.LIVEKIT_API_KEY?.trim() || !env.LIVEKIT_API_SECRET?.trim() || !env.LIVEKIT_URL?.trim()) {
    logger.warn('LiveKit room create skipped — not configured', { roomName });
    return;
  }
  try {
    const svc = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    await svc.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 10,
    });
  } catch (err) {
    logger.warn('LiveKit room create failed (session still confirmed)', {
      roomName,
      err: err instanceof Error ? err.message : err,
    });
  }
}

export class TelehealthRoomService {
  /**
   * Bind a LiveKit room and notify family + clinician.
   * Never throws — booking/confirm must still succeed if LiveKit is down.
   */
  static async provisionForSession(
    sessionId: string,
    opts?: { force?: boolean },
  ): Promise<ProvisionResult> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { episode: { select: { coordinatorId: true, title: true } } },
      });
      if (!session) return { provisioned: false, reason: 'not_found' };

      if (!opts?.force && session.type !== 'telehealth') {
        return { provisioned: false, reason: 'not_telehealth' };
      }
      if (!opts?.force && !CONFIRMED.has(session.status)) {
        return { provisioned: false, reason: 'not_confirmed' };
      }

      const roomName = session.livekitRoomId || sessionRoomName(session.id);
      if (session.livekitRoomId) {
        return { provisioned: false, reason: 'already_exists', roomName };
      }

      const claimed = await prisma.session.updateMany({
        where: { id: session.id, livekitRoomId: null },
        data: { livekitRoomId: roomName },
      });
      if (claimed.count === 0) {
        return { provisioned: false, reason: 'already_exists', roomName };
      }

      await tryCreateLiveKitRoom(roomName);

      const notified = telehealthNotifyUserIds({
        clientId: session.clientId,
        providerId: session.providerId,
        coordinatorId: session.episode?.coordinatorId,
      });

      const when = session.scheduledAt.toLocaleString('en-QA');
      const title = session.episode?.title ? ` for "${session.episode.title}"` : '';

      await Promise.all(
        notified.map((userId) =>
          NotificationService.create({
            userId,
            title: 'Telehealth session confirmed',
            body: `A video session${title} is confirmed for ${when}. Join from the app when it starts.`,
            type: 'telehealth_ready',
            data: { sessionId: session.id, roomName, episodeId: session.episodeId },
          }).catch((err) => {
            logger.warn('Telehealth notify failed', { userId, sessionId: session.id, err });
          }),
        ),
      );

      return { provisioned: true, roomName, notified };
    } catch (err) {
      logger.warn('Telehealth room provision failed', { sessionId, err });
      return { provisioned: false, reason: 'not_found' };
    }
  }

  static async prepareSessionJoin(
    session: {
      id: string;
      livekitRoomId: string | null;
      telehealthControl?: Prisma.JsonValue | null;
      providerId: string;
      clientId: string;
      status: string;
      episode?: { coordinatorId: string } | null;
    },
    actor: TelehealthActor,
  ): Promise<{ phase: JoinPhase; roomName: string; control: TelehealthControl }> {
    const isStaff = canCreateSessionRoom(session, actor);
    let control = parseTelehealthControl(session.telehealthControl);
    const phase = resolveJoinPhase({
      isStaff,
      admitted: control.admitted.includes(actor.userId),
    });
    const base = session.livekitRoomId || sessionRoomName(session.id);

    if (phase === 'waiting') {
      const next = enterLobby(control, actor.userId);
      if (next !== control) {
        await prisma.session.update({
          where: { id: session.id },
          data: { telehealthControl: next },
        });
        control = next;
      }
    }

    return {
      phase,
      roomName: phase === 'waiting' ? waitingRoomName(base) : base,
      control,
    };
  }

  static async listLobby(sessionId: string, actor: TelehealthActor) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canCreateSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);

    const control = parseTelehealthControl(session.telehealthControl);
    const users = control.lobby.length
      ? await prisma.user.findMany({
          where: { id: { in: control.lobby } },
          select: { id: true, name: true, role: true },
        })
      : [];

    return {
      sessionId,
      roomName: session.livekitRoomId || sessionRoomName(session.id),
      lobby: users,
      admitted: control.admitted,
    };
  }

  static async admit(sessionId: string, participantUserId: string, actor: TelehealthActor) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canCreateSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);

    const allowed = new Set(
      [session.clientId, session.providerId, session.episode?.coordinatorId].filter(Boolean) as string[],
    );
    if (!allowed.has(participantUserId)) {
      throw new AppError('User is not a participant in this session.', 400);
    }

    const control = admitParticipant(parseTelehealthControl(session.telehealthControl), participantUserId);
    await prisma.session.update({
      where: { id: sessionId },
      data: { telehealthControl: control },
    });

    const base = session.livekitRoomId || sessionRoomName(session.id);
    await NotificationService.create({
      userId: participantUserId,
      title: 'You have been admitted',
      body: 'The clinician admitted you. Rejoin to enter the video session.',
      type: 'telehealth_admitted',
      data: { sessionId, roomName: base },
    }).catch((err) => {
      logger.warn('Telehealth admit notify failed', { sessionId, err });
    });

    return { sessionId, admittedUserId: participantUserId, roomName: base, control };
  }

  static async prepareMeetingJoin(
    meeting: {
      id: string;
      roomName: string;
      hostId: string;
      participantId: string;
      telehealthControl?: Prisma.JsonValue | null;
    },
    actor: TelehealthActor,
  ): Promise<{ phase: JoinPhase; roomName: string }> {
    const isStaff = canAdmitMeeting(meeting, actor);
    let control = parseTelehealthControl(meeting.telehealthControl);
    const phase = resolveJoinPhase({
      isStaff,
      admitted: control.admitted.includes(actor.userId),
    });
    if (phase === 'waiting') {
      const next = enterLobby(control, actor.userId);
      if (next !== control) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { telehealthControl: next },
        });
      }
    }
    return {
      phase,
      roomName: phase === 'waiting' ? waitingRoomName(meeting.roomName) : meeting.roomName,
    };
  }

  static async admitMeeting(meetingId: string, participantUserId: string, actor: TelehealthActor) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (!canAdmitMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);
    if (participantUserId !== meeting.participantId && participantUserId !== meeting.hostId) {
      throw new AppError('User is not a participant in this meeting.', 400);
    }
    const control = admitParticipant(parseTelehealthControl(meeting.telehealthControl), participantUserId);
    await prisma.meeting.update({ where: { id: meetingId }, data: { telehealthControl: control } });
    await NotificationService.create({
      userId: participantUserId,
      title: 'You have been admitted',
      body: 'The host admitted you. Rejoin to enter the video session.',
      type: 'telehealth_admitted',
      data: { meetingId, roomName: meeting.roomName },
    }).catch((err) => logger.warn('Meeting admit notify failed', { meetingId, err }));
    return { meetingId, admittedUserId: participantUserId, roomName: meeting.roomName };
  }

  static async listMeetingLobby(meetingId: string, actor: TelehealthActor) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (!canAdmitMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);
    const control = parseTelehealthControl(meeting.telehealthControl);
    const users = control.lobby.length
      ? await prisma.user.findMany({
          where: { id: { in: control.lobby } },
          select: { id: true, name: true, role: true },
        })
      : [];
    return { meetingId, roomName: meeting.roomName, lobby: users, admitted: control.admitted };
  }
}
