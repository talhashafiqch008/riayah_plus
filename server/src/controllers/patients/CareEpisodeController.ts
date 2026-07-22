import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, CareEpisodeStatus, UrgencyLevel, ServiceCategory } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess, mergeTenantOrg } from '../../middleware/tenantAccess';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { assertCareEpisodeTransition } from '../../utils/stateMachine';
import {
  assertEpisodeAccess,
  familyEpisodeWhere,
  isFamilyRole,
  resolveEpisodePartyIds,
} from '../../utils/careAccess';

const createEpisodeSchema = z.object({
  patientId: z.string().optional(),
  careRecipientId: z.string().min(1),
  careUnitId: z.string().min(1),
  title: z.string().min(2),
  urgencyLevel: z.nativeEnum(UrgencyLevel).optional(),
  reasonForCare: z.string().optional(),
  medicalHistory: z.string().optional(),
  currentMeds: z.string().optional(),
  diagnoses: z.array(z.string()).optional(),
  serviceInterests: z.array(z.nativeEnum(ServiceCategory)).optional(),
});

/** Whitelisted status transitions only — no mass-assign (H-3). */
const updateEpisodeSchema = z.object({
  status: z.nativeEnum(CareEpisodeStatus).optional(),
});

export class CareEpisodeController {
  static async index(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const role = req.user!.role;
    if (isFamilyRole(role)) {
      Object.assign(where, familyEpisodeWhere(req.user!.userId));
    } else {
      mergeTenantOrg(req, where);
    }

    const [episodes, total] = await Promise.all([
      prisma.careEpisode.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, email: true } },
          coordinator: { select: { id: true, name: true } },
          careRecipient: { select: { id: true, name: true, externalRef: true } },
          careUnit: { select: { id: true, name: true, familyUserId: true } },
        },
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

    const unit = await prisma.careUnit.findFirst({
      where: { id: data.careUnitId, deletedAt: null },
    });
    if (!unit) throw new AppError('Care unit not found.', 404);
    assertTenantOrgAccess(req, unit.organizationId);

    const party = await resolveEpisodePartyIds({
      careUnitId: unit.id,
      careRecipientId: data.careRecipientId,
      patientId: data.patientId,
    });

    const episode = await prisma.careEpisode.create({
      data: {
        coordinatorId: req.user!.userId,
        patientId: party.patientId,
        careRecipientId: party.careRecipientId,
        careUnitId: unit.id,
        organizationId: party.organizationId ?? unit.organizationId ?? undefined,
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

    await AuditService.log({
      userId: req.user!.userId,
      action: 'episode_created',
      entity: 'CareEpisode',
      entityId: episode.id,
      req,
    });

    res.status(201).json({ data: episode });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const episode = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { id: true, name: true } },
        coordinator: { select: { id: true, name: true } },
        careRecipient: {
          select: {
            id: true,
            name: true,
            externalRef: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        careUnit: { select: { id: true, name: true, familyUserId: true } },
        assessments: true,
        carePlans: true,
        sessions: { orderBy: { scheduledAt: 'desc' } },
        documents: true,
        invoices: true,
      },
    });

    // M-15 / M-30: uniform 404 for missing + unauthorized; limited patient fields
    if (!episode) throw new AppError('Care episode not found.', 404);
    try {
      await assertEpisodeAccess(req, episode);
    } catch {
      throw new AppError('Care episode not found.', 404);
    }
    res.json({ data: episode });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const data = updateEpisodeSchema.parse(req.body);

    const existing = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      include: { careUnit: { select: { familyUserId: true } } },
    });
    if (!existing) throw new AppError('Care episode not found.', 404);
    await assertEpisodeAccess(req, existing);

    const nextStatus = data.status;
    if (nextStatus && nextStatus !== existing.status) {
      assertCareEpisodeTransition(existing.status, nextStatus);
    }

    // Do not allow jumping to validated via free PATCH (M-10 / H-3).
    if (nextStatus === 'validated') {
      throw new AppError(
        'Use structured intake review or submit-intake to validate an episode.',
        422,
      );
    }

    const episode = await prisma.careEpisode.update({
      where: { id: req.params.id },
      data: {
        status: nextStatus,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'episode_updated',
      entity: 'CareEpisode',
      entityId: episode.id,
      before: { status: existing.status },
      after: { status: episode.status },
      req,
    });
    res.json({ data: episode });
  }

  static async submitIntake(req: Request, res: Response): Promise<void> {
    const { intakeSummary } = z.object({ intakeSummary: z.record(z.unknown()) }).parse(req.body);

    const episode = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      include: { careUnit: { select: { familyUserId: true } } },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);
    await assertEpisodeAccess(req, episode);

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

    const notifyUserId = episode.careUnit?.familyUserId ?? episode.patientId;
    await NotificationService.create({
      userId: notifyUserId,
      title: 'Your intake has been reviewed',
      body: 'Your care coordinator has reviewed your intake and your episode is now active.',
      type: 'episode_validated',
    });

    res.json({ data: updated });
  }
}
