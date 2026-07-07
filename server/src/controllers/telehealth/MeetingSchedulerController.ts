import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';
import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../config/env';

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

      const isParticipant = meeting.hostId === userId || meeting.participantId === userId;
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);
      if (!isParticipant && !isAdmin) throw new AppError('Forbidden.', 403);

      const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: userId,
        ttl: '3h',
      });
      at.addGrant({ roomJoin: true, room: meeting.roomName, canPublish: true, canSubscribe: true });

      const token = await at.toJwt();

      if (meeting.status === 'scheduled') {
        await prisma.meeting.update({ where: { id }, data: { status: 'active', startedAt: new Date() } });
      }

      res.json({
        success: true,
        token,
        roomName: meeting.roomName,
        livekitUrl: env.LIVEKIT_URL,
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

      res.json({ success: true, message: 'Meeting ended.' });
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

  // POST /api/livekit/webhook — LiveKit event webhook
  static async livekitWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const event = req.body;
      const roomName = event?.room?.name;

      if (event.event === 'room_finished' && roomName) {
        await prisma.meeting.updateMany({
          where: { roomName, status: 'active' },
          data: { status: 'ended', endedAt: new Date() },
        });
      }

      if (event.event === 'recording_finished' && roomName) {
        const egressId = event?.egressInfo?.egressId;
        const recordingUrl = event?.egressInfo?.file?.location;

        if (egressId && recordingUrl) {
          await prisma.meeting.updateMany({
            where: { roomName },
            data: { recordingUrl, recordingStatus: 'available' },
          });
        }
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/meetings/:id/start-recording
  static async startRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) throw new AppError('Meeting not found.', 404);
      if (meeting.hostId !== req.user!.userId) throw new AppError('Only the host can start recording.', 403);

      await prisma.meeting.update({ where: { id }, data: { recordingStatus: 'in_progress' } });
      res.json({ success: true, message: 'Recording started.' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/meetings/:id/recording
  static async getRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) throw new AppError('Meeting not found.', 404);

      const isParticipant = meeting.hostId === req.user!.userId || meeting.participantId === req.user!.userId;
      if (!isParticipant) throw new AppError('Forbidden.', 403);

      if (!meeting.recordingUrl) throw new AppError('No recording available for this meeting.', 404);

      res.json({ success: true, recordingUrl: meeting.recordingUrl });
    } catch (err) {
      next(err);
    }
  }
}
