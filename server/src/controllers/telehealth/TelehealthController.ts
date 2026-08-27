import { Request, Response } from 'express';
import { z } from 'zod';
import { RoomServiceClient } from 'livekit-server-sdk';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { NotificationService } from '../../services/NotificationService';
import { InvoiceService } from '../../services/InvoiceService';
import { TelehealthRoomService } from '../../services/TelehealthRoomService';
import { TelehealthContextService } from '../../services/TelehealthContextService';
import { TelehealthNoteService } from '../../services/TelehealthNoteService';
import { TelehealthConsentService } from '../../services/TelehealthConsentService';
import { TelehealthPaymentService } from '../../services/TelehealthPaymentService';
import { TelehealthRecordingService } from '../../services/TelehealthRecordingService';
import { sanitizedString } from '../../utils/sanitize';
import {
  assertLiveKitConfigured,
  canCreateSessionRoom,
  canJoinMeeting,
  canJoinSessionRoom,
  isJoinableMeeting,
  isJoinableSession,
  issueLiveKitJoinToken,
  parseSessionIdFromRoom,
  sessionRoomName,
} from '../../services/LiveKitAccess';

type Actor = { userId: string; role: string };

async function loadSessionForRoom(roomName: string) {
  const sessionId = parseSessionIdFromRoom(roomName);
  return prisma.session.findFirst({
    where: sessionId
      ? { OR: [{ id: sessionId }, { livekitRoomId: roomName }] }
      : { livekitRoomId: roomName },
    include: { episode: { select: { coordinatorId: true } } },
  });
}

function assertCanJoinSession(session: NonNullable<Awaited<ReturnType<typeof loadSessionForRoom>>>, actor: Actor) {
  if (!canJoinSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);
  if (!isJoinableSession(session)) throw new AppError('This session cannot be joined.', 400);
}

export class TelehealthController {
  static async generateToken(req: Request, res: Response): Promise<void> {
    const { roomName } = z.object({ roomName: z.string().min(1) }).parse(req.body);
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const user = await prisma.user.findUnique({ where: { id: actor.userId } });
    if (!user) throw new AppError('User not found.', 404);

    const session = await loadSessionForRoom(roomName);
    if (session) {
      assertCanJoinSession(session, actor);
      await TelehealthPaymentService.assertSessionPaid(session, actor);
      await TelehealthConsentService.assertJoinConsent(actor);
      const join = await TelehealthRoomService.prepareSessionJoin(session, actor);
      const token = await issueLiveKitJoinToken({
        identity: user.id,
        name: user.name,
        roomName: join.roomName,
        phase: join.phase,
      });
      res.json({
        token,
        roomName: join.roomName,
        serverUrl: env.LIVEKIT_URL,
        phase: join.phase,
        sessionId: session.id,
      });
      return;
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          { roomName },
          { roomName: roomName.replace(/__waiting$/, '') },
        ],
      },
    });
    if (!meeting) throw new AppError('Room not found.', 404);
    if (!canJoinMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);
    if (!isJoinableMeeting(meeting)) throw new AppError('This meeting cannot be joined.', 400);
    await TelehealthConsentService.assertJoinConsent(actor);

    const join = await TelehealthRoomService.prepareMeetingJoin(meeting, actor);
    const token = await issueLiveKitJoinToken({
      identity: user.id,
      name: user.name,
      roomName: join.roomName,
      ttl: '3h',
      phase: join.phase,
    });
    res.json({
      token,
      roomName: join.roomName,
      serverUrl: env.LIVEKIT_URL,
      phase: join.phase,
      meetingId: meeting.id,
    });
  }

  static async createRoom(req: Request, res: Response): Promise<void> {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canCreateSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);

    const telehealth = await TelehealthRoomService.provisionForSession(sessionId, { force: true });
    const roomName = telehealth.roomName ?? sessionRoomName(sessionId);
    res.json({ roomName, serverUrl: env.LIVEKIT_URL, telehealth });
  }

  static async getRoomInfo(req: Request, res: Response): Promise<void> {
    const { roomName } = req.params;
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };

    const session = await loadSessionForRoom(roomName);
    if (session) {
      if (!canJoinSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);
    } else {
      const meeting = await prisma.meeting.findUnique({ where: { roomName } });
      if (!meeting) throw new AppError('Room not found.', 404);
      if (!canJoinMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);
    }

    assertLiveKitConfigured();
    const svc = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    const rooms = await svc.listRooms([roomName]);
    if (!rooms.length) throw new AppError('Room not found.', 404);

    res.json({ room: rooms[0] });
  }

  static async lobby(req: Request, res: Response): Promise<void> {
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const data = await TelehealthRoomService.listLobby(req.params.sessionId, actor);
    res.json({ success: true, ...data });
  }

  static async admit(req: Request, res: Response): Promise<void> {
    const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body);
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const data = await TelehealthRoomService.admit(req.params.sessionId, userId, actor);
    res.json({ success: true, ...data });
  }

  static async context(req: Request, res: Response): Promise<void> {
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const data = await TelehealthContextService.forSession(req.params.sessionId, actor);
    res.json({ success: true, ...data });
  }

  static async addNote(req: Request, res: Response): Promise<void> {
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const body = z
      .object({
        content: sanitizedString(z.string().min(1).max(20000)),
        noteType: z.string().min(1).max(64).optional().default('session_note'),
        isPrivate: z.boolean().optional().default(false),
      })
      .parse(req.body);
    const note = await TelehealthNoteService.addForSession(req.params.sessionId, actor, body);
    res.status(201).json({ success: true, data: note });
  }

  static async startRecording(req: Request, res: Response): Promise<void> {
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const data = await TelehealthRecordingService.startForSession(req.params.sessionId, actor);
    res.json({ success: true, message: 'Recording started.', ...data });
  }

  static async stopRecording(req: Request, res: Response): Promise<void> {
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const data = await TelehealthRecordingService.stopForSession(req.params.sessionId, actor);
    res.json({ success: true, message: 'Recording stopping.', ...data });
  }

  static async getRecording(req: Request, res: Response): Promise<void> {
    const actor: Actor = { userId: req.user!.userId, role: req.user!.role };
    const data = await TelehealthRecordingService.playbackForSession(req.params.sessionId, actor);
    res.json({ success: true, ...data });
  }

  static async sessionCheckin(req: Request, res: Response): Promise<void> {
    const { sessionId, latitude, longitude } = z
      .object({
        sessionId: z.string(),
        latitude: z.number().gte(-90).lte(90),
        longitude: z.number().gte(-180).lte(180),
      })
      .parse(req.body);

    const { GPSService } = await import('../../services/GPSService');
    const session = await GPSService.loadSession(sessionId);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const result = await GPSService.applySessionCheckin({
      session,
      userId: req.user!.userId,
      coords: { lat: latitude, lng: longitude },
    });

    if (!result.geofence.isWithinRadius && result.geofence.status === 'out_of_radius') {
      if (session.episode?.coordinatorId) {
        await NotificationService.create({
          userId: session.episode.coordinatorId,
          title: 'Out-of-Radius Check-In Detected',
          body: `Worker checked in ${result.geofence.distanceMeters}m from the patient's address.`,
          type: 'gps_out_of_radius',
          data: { sessionId, distanceMeters: result.geofence.distanceMeters },
        });
      }
    }

    res.json({ checkedIn: true, geofence: result.geofence, checkInAt: result.checkInAt });
  }

  static async sessionCheckout(req: Request, res: Response): Promise<void> {
    const { sessionId, latitude, longitude } = z
      .object({
        sessionId: z.string(),
        latitude: z.number().gte(-90).lte(90),
        longitude: z.number().gte(-180).lte(180),
      })
      .parse(req.body);

    const { GPSService } = await import('../../services/GPSService');
    const session = await GPSService.loadSession(sessionId);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const result = await GPSService.applySessionCheckout({
      session,
      userId: req.user!.userId,
      coords: { lat: latitude, lng: longitude },
    });

    const invoice =
      session.status !== 'completed' && session.status !== 'cancelled'
        ? await InvoiceService.tryFromSession(sessionId, req.user!.userId)
        : null;

    res.json({ checkedOut: true, checkOutAt: result.checkOutAt, invoice: invoice ?? undefined });
  }
}
