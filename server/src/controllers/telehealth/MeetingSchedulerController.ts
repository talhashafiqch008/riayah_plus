import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { InvoiceService } from '../../services/InvoiceService';
import { TelehealthRoomService } from '../../services/TelehealthRoomService';
import { TelehealthContextService } from '../../services/TelehealthContextService';
import { TelehealthNoteService } from '../../services/TelehealthNoteService';
import { TelehealthConsentService } from '../../services/TelehealthConsentService';
import { TelehealthRecordingService } from '../../services/TelehealthRecordingService';
import { sanitizedString } from '../../utils/sanitize';
import {
  canJoinMeeting,
  isJoinableMeeting,
  issueLiveKitJoinToken,
  receiveLiveKitWebhookEvent,
} from '../../services/LiveKitAccess';

const scheduleSchema = z.object({
  participantId: z.string(),
  title: z.string().optional(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().positive().default(60),
  bookingId: z.string().optional(),
  episodeId: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
});

export class MeetingSchedulerController {
  // POST /api/meetings
  static async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const body = scheduleSchema.parse(req.body);
      const hostId = req.user!.userId;
      const roomName = `riayah-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const meeting = await prisma.meeting.create({
        data: {
          hostId,
          participantId: body.participantId,
          title: body.title ?? 'Telehealth Session',
          scheduledAt: new Date(body.scheduledAt),
          durationMinutes: body.durationMinutes,
          roomName,
          bookingId: body.bookingId,
          episodeId: body.episodeId,
          notes: body.notes,
          isRecurring: body.isRecurring,
          recurringPattern: body.recurringPattern,
          status: 'scheduled',
        },
      });

      await NotificationService.create({
        userId: body.participantId,
        title: '📅 Telehealth Meeting Scheduled',
        body: `You have a telehealth meeting scheduled for ${new Date(body.scheduledAt).toLocaleString('en-QA')}.`,
        type: 'meeting_scheduled',
        data: { meetingId: meeting.id },
      });

      res.status(201).json({ success: true, meeting });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/meetings — list upcoming meetings
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const [meetings, total] = await Promise.all([
        prisma.meeting.findMany({
          where: { OR: [{ hostId: userId }, { participantId: userId }], status: { not: 'cancelled' } },
          include: {
            host: { select: { id: true, name: true, avatar: true } },
            participant: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.meeting.count({ where: { OR: [{ hostId: userId }, { participantId: userId }] } }),
      ]);

      res.json({ success: true, meetings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/meetings/:id/join — generate LiveKit token and join
  static async join(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) throw new AppError('Meeting not found.', 404);

      const actor = { userId, role: req.user!.role };
      if (!canJoinMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);
      if (!isJoinableMeeting(meeting)) throw new AppError('This meeting cannot be joined.', 400);
      await TelehealthConsentService.assertJoinConsent(actor);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const join = await TelehealthRoomService.prepareMeetingJoin(meeting, actor);
      const token = await issueLiveKitJoinToken({
        identity: userId,
        name: user?.name ?? userId,
        roomName: join.roomName,
        ttl: '3h',
        phase: join.phase,
      });

      if (meeting.status === 'scheduled' && join.phase === 'in_call') {
        await prisma.meeting.update({ where: { id }, data: { status: 'active', startedAt: new Date() } });
      }

      res.json({
        success: true,
        token,
        roomName: join.roomName,
        livekitUrl: env.LIVEKIT_URL,
        phase: join.phase,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/meetings/:id/end
  static async end(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) throw new AppError('Meeting not found.', 404);
      if (meeting.hostId !== req.user!.userId) throw new AppError('Only the host can end a meeting.', 403);

      await prisma.meeting.update({ where: { id }, data: { status: 'ended', endedAt: new Date() } });

      await NotificationService.create({
        userId: meeting.participantId,
        title: 'Meeting Ended',
        body: 'The telehealth session has ended.',
        type: 'meeting_ended',
        data: { meetingId: id },
      });

      let invoice;
      if (meeting.bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: meeting.bookingId } });
        if (booking && booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'no_show') {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'completed', completedAt: new Date() },
          });
        }
        if (booking && booking.status !== 'cancelled' && booking.status !== 'no_show') {
          invoice = await InvoiceService.tryFromBooking(meeting.bookingId, req.user!.userId);
        }
      } else if (meeting.episodeId) {
        const session = await prisma.session.findFirst({
          where: {
            episodeId: meeting.episodeId,
            status: { in: ['pending', 'accepted', 'in_progress'] },
          },
          orderBy: { scheduledAt: 'desc' },
        });
        if (session) {
          await prisma.session.update({
            where: { id: session.id },
            data: { status: 'completed', completedAt: new Date() },
          });
          invoice = await InvoiceService.tryFromSession(session.id, req.user!.userId);
        }
      }

      res.json({ success: true, message: 'Meeting ended.', invoice: invoice ?? undefined });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/meetings/:id/cancel
  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) throw new AppError('Meeting not found.', 404);
      const isParticipant = meeting.hostId === req.user!.userId || meeting.participantId === req.user!.userId;
      if (!isParticipant) throw new AppError('Forbidden.', 403);

      await prisma.meeting.update({ where: { id }, data: { status: 'cancelled' } });

      const notifyId = meeting.hostId === req.user!.userId ? meeting.participantId : meeting.hostId;
      await NotificationService.create({ userId: notifyId, title: 'Meeting Cancelled', body: 'A telehealth session was cancelled.', type: 'meeting_cancelled', data: { meetingId: id } });

      res.json({ success: true, message: 'Meeting cancelled.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/livekit/webhook — LiveKit event webhook (signature required)
  static async livekitWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {});
      const authHeader = typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : undefined;

      const event = await receiveLiveKitWebhookEvent(
        raw,
        authHeader,
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
      );
      const eventName = String(event.event);
      const roomName = event.room?.name;

      if (eventName === 'room_finished' && roomName) {
        await prisma.meeting.updateMany({
          where: { roomName, status: 'active' },
          data: { status: 'ended', endedAt: new Date() },
        });
      }

      if (eventName === 'egress_ended' || eventName === 'recording_finished') {
        await TelehealthRecordingService.persistFromEgressEvent(event);
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/meetings/:id/start-recording
  static async startRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = { userId: req.user!.userId, role: req.user!.role };
      const data = await TelehealthRecordingService.startForMeeting(req.params.id, actor);
      res.json({ success: true, message: 'Recording started.', ...data });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/meetings/:id/recording
  static async getRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = { userId: req.user!.userId, role: req.user!.role };
      const data = await TelehealthRecordingService.playbackForMeeting(req.params.id, actor);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async lobby(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = { userId: req.user!.userId, role: req.user!.role };
      const data = await TelehealthRoomService.listMeetingLobby(req.params.id, actor);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async admit(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body);
      const actor = { userId: req.user!.userId, role: req.user!.role };
      const data = await TelehealthRoomService.admitMeeting(req.params.id, userId, actor);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async context(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = { userId: req.user!.userId, role: req.user!.role };
      const data = await TelehealthContextService.forMeeting(req.params.id, actor);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  static async addNote(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = { userId: req.user!.userId, role: req.user!.role };
      const body = z
        .object({
          content: sanitizedString(z.string().min(1).max(20000)),
          noteType: z.string().min(1).max(64).optional().default('session_note'),
          isPrivate: z.boolean().optional().default(false),
        })
        .parse(req.body);
      const note = await TelehealthNoteService.addForMeeting(req.params.id, actor, body);
      res.status(201).json({ success: true, data: note });
    } catch (err) {
      next(err);
    }
  }
}
