import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { VoiceRecordingService } from '../../services/VoiceRecordingService';

async function actorFromRequest(req: Request) {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return { userId, role, organizationId: user?.organizationId ?? null };
}

export class VoiceRecordingController {
  static async listPatients(req: Request, res: Response): Promise<void> {
    const actor = await actorFromRequest(req);
    const data = await VoiceRecordingService.listEligiblePatients(actor);
    res.json({ data });
  }

  static async list(req: Request, res: Response): Promise<void> {
    const actor = await actorFromRequest(req);
    const data = await VoiceRecordingService.list(actor);
    res.json({ data });
  }

  static async create(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new AppError('Audio file is required.', 400);
    const body = z
      .object({
        title: z.string().max(200).optional(),
        notes: z.string().max(2000).optional(),
        durationSeconds: z.coerce.number().int().min(0).max(86_400).optional(),
        sessionId: z.string().min(1).max(64).optional(),
        meetingId: z.string().min(1).max(64).optional(),
        patientId: z.string().min(1),
        careRecipientId: z.string().min(1).optional(),
        episodeId: z.string().min(1).optional(),
      })
      .parse(req.body);

    const actor = await actorFromRequest(req);
    const data = await VoiceRecordingService.create(actor, {
      file: req.file,
      title: body.title,
      notes: body.notes,
      durationSeconds: body.durationSeconds,
      sessionId: body.sessionId,
      meetingId: body.meetingId,
      patientId: body.patientId,
      careRecipientId: body.careRecipientId,
      episodeId: body.episodeId,
    });
    res.status(201).json({ data });
  }

  static async playback(req: Request, res: Response): Promise<void> {
    const actor = await actorFromRequest(req);
    const data = await VoiceRecordingService.getPlaybackUrl(req.params.id, actor);
    res.json({ data });
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    const actor = await actorFromRequest(req);
    const data = await VoiceRecordingService.softDelete(req.params.id, actor);
    res.json(data);
  }
}
