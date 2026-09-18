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
import { staffPublicUserSelect, toPublicStaffCard } from '../../utils/staffProfile';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

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

const assignCoordinatorSchema = z.object({
  coordinatorId: z.string().min(1),
});

export class CareEpisodeController {
  static async index(req: Request, res: Response): Promise<void> {
          const { page, limit, skip, take } = parsePagination(req.query);
      const status = queryString(req.query.status);

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
          // H-27: email and externalRef (potential MRN) omitted from list projection
          patient: { select: { id: true, name: true } },
          coordinator: { select: { id: true, name: true } },
          careRecipient: { select: { id: true, name: true } },
          careUnit: { select: { id: true, name: true, familyUserId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.careEpisode.count({ where }),
    ]);

    res.json({ data: episodes, total, page, limit });
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
        // H-28: scoped to minimum necessary fields per HIPAA minimum-necessary
        careRecipient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        careUnit: { select: { id: true, name: true, familyUserId: true } },
        assessments: {
          select: {
            id: true,
            type: true,
            status: true,
            scheduledAt: true,
            completedAt: true,
            assessor: { select: staffPublicUserSelect },
          },
          orderBy: { scheduledAt: 'desc' },
        },
        carePlans: { select: { id: true, title: true, status: true, submittedAt: true, approvedAt: true } },
        sessions: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            durationMinutes: true,
            provider: { select: staffPublicUserSelect },
          },
          orderBy: { scheduledAt: 'desc' },
        },
        documents: { select: { id: true, name: true, type: true, status: true, createdAt: true } },
        invoices: { select: { id: true, status: true, total: true, dueDate: true, createdAt: true } },
      },
    });

    // M-15 / M-30: uniform 404 for missing + unauthorized; limited patient fields
    if (!episode) throw new AppError('Care episode not found.', 404);
    try {
      await assertEpisodeAccess(req, episode);
    } catch {
      throw new AppError('Care episode not found.', 404);
    }
    res.json({
      data: {
        ...episode,
        assessments: episode.assessments.map((a) => ({
          ...a,
          assessor: a.assessor ? toPublicStaffCard(a.assessor) : a.assessor,
        })),
        sessions: episode.sessions.map((s) => ({
          ...s,
          provider: s.provider ? toPublicStaffCard(s.provider) : s.provider,
        })),
      },
    });
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

  static async coordinators(req: Request, res: Response): Promise<void> {
    const where: Record<string, unknown> = { role: 'care_coordinator' };
    mergeTenantOrg(req, where);
    // R-2: email omitted — the picker UI only needs name/id
    const list = await prisma.user.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: list });
  }

  static async assignCoordinator(req: Request, res: Response): Promise<void> {
    const { coordinatorId } = assignCoordinatorSchema.parse(req.body);

    const episode = await prisma.careEpisode.findUnique({
      where: { id: req.params.id },
      include: { careUnit: { select: { familyUserId: true } } },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);
    await assertEpisodeAccess(req, episode);

    const coordinator = await prisma.user.findUnique({
      where: { id: coordinatorId },
      select: { id: true, role: true, organizationId: true },
    });
    if (!coordinator || coordinator.role !== 'care_coordinator') {
      throw new AppError('Coordinator not found.', 404);
    }
    assertTenantOrgAccess(req, coordinator.organizationId);

    const updated = await prisma.careEpisode.update({
      where: { id: req.params.id },
      data: { coordinatorId },
      include: {
        coordinator: { select: { id: true, name: true } },
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'episode_coordinator_assigned',
      entity: 'CareEpisode',
      entityId: updated.id,
      before: { coordinatorId: episode.coordinatorId },
      after: { coordinatorId },
      req,
    });

    res.json({ data: updated });
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

    const notifyUserId = episode.careUnit?.familyUserId ?? episode.patientId ?? null;
    if (notifyUserId) {
      await NotificationService.create({
        userId: notifyUserId,
        title: 'Your intake has been reviewed',
        body: 'Your care coordinator has reviewed your intake and your episode is now active.',
        type: 'episode_validated',
      });
    }

    res.json({ data: updated });
  }
}
