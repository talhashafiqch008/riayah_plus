import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, CareEpisodeStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { assertCareEpisodeTransition } from '../../utils/stateMachine';

const createEpisodeSchema = z.object({
  patientId: z.string(),
  careRecipientId: z.string().optional(),
  title: z.string().min(2),
  urgencyLevel: z.string().optional(),
  reasonForCare: z.string().optional(),
  medicalHistory: z.string().optional(),
  currentMeds: z.string().optional(),
  diagnoses: z.array(z.string()).optional(),
  serviceInterests: z.array(z.string()).optional(),
});

const updateIntakeSchema = z.object({
  intakeSummary: z.record(z.unknown()).optional(),
  status: z.string().optional(),
});

export class CareEpisodeController {
  static async index(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Coordinators see all; clients see their own
    const role = req.user!.role;
    if (['client', 'consumer', 'family', 'patient'].includes(role)) {
      where.patientId = req.user!.userId;
    }

    const [episodes, total] = await Promise.all([
      prisma.careEpisode.findMany({
        where,
        include: { patient: { select: { id: true, name: true, email: true } }, coordinator: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.careEpisode.count({ where }),
    ]);

    res.json({ data: episodes, total, page: parseInt(page), limit: parseInt(limit) });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const data = createEpisodeSchema.parse(req.body);

    const episode = await prisma.careEpisode.create({
      data: {
        coordinatorId: req.user!.userId,
        patientId: data.patientId,
        careRecipientId: data.careRecipientId,
        title: data.title,
        urgencyLevel: data.urgencyLevel,
        reasonForCare: data.reasonForCare,
        medicalHistory: data.medicalHistory,
        currentMeds: data.currentMeds,
        diagnoses: data.diagnoses ?? [],
        serviceInterests: data.serviceInterests ?? [],
        status: 'intake_submitted',
      },
    });

    await AuditService.log({ userId: req.user!.userId, action: 'episode_created', entity: 'CareEpisode', entityId: episode.id, req });

    res.status(201).json({ data: episode });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const episode = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        coordinator: { select: { id: true, name: true } },
        careRecipient: true,
        assessments: true,
        carePlans: true,
        sessions: { orderBy: { scheduledAt: 'desc' } },
        documents: true,
        invoices: true,
      },
    });

    if (!episode) throw new AppError('Episode not found.', 404);
    res.json({ data: episode });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const data = updateIntakeSchema.parse(req.body);

    const existing = await prisma.careEpisode.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Episode not found.', 404);

    const nextStatus = data.status as CareEpisodeStatus | undefined;
    if (nextStatus && nextStatus !== existing.status) {
      assertCareEpisodeTransition(existing.status, nextStatus);
    }

    const episode = await prisma.careEpisode.update({
      where: { id: req.params.id },
      data: {
        ...data,
        status: nextStatus,
        intakeSummary: data.intakeSummary as Prisma.InputJsonValue ?? undefined,
        intakeReviewedAt: nextStatus === 'validated' ? new Date() : undefined,
        intakeReviewerId: nextStatus === 'validated' ? req.user!.userId : undefined,
      },
    });

    await AuditService.log({ userId: req.user!.userId, action: 'episode_updated', entity: 'CareEpisode', entityId: episode.id, req });
    res.json({ data: episode });
  }

  static async submitIntake(req: Request, res: Response): Promise<void> {
    const { intakeSummary } = z.object({ intakeSummary: z.record(z.unknown()) }).parse(req.body);

    const episode = await prisma.careEpisode.findUnique({ where: { id: req.params.id } });
    if (!episode) throw new AppError('Episode not found.', 404);

    assertCareEpisodeTransition(episode.status, 'validated');

    const updated = await prisma.careEpisode.update({
      where: { id: req.params.id },
      data: {
        intakeSummary: intakeSummary as Prisma.InputJsonValue,
        status: 'validated',
        intakeReviewedAt: new Date(),
        intakeReviewerId: req.user!.userId,
      },
    });

    // Notify patient
    await NotificationService.create({
      userId: episode.patientId,
      title: 'Your intake has been reviewed',
      body: 'Your care coordinator has reviewed your intake and your episode is now active.',
      type: 'episode_validated',
    });

    res.json({ data: updated });
  }
}
