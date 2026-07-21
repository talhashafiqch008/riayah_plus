import { Request, Response } from 'express';
import { z } from 'zod';
import { AssessmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess, mergeTenantOrg } from '../../middleware/tenantAccess';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { assertAssessmentTransition } from '../../utils/stateMachine';

const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin'];
const COORDINATOR_ROLES = ['care_coordinator', ...ADMIN_ROLES];
const CLINICAL_ROLES = ['clinical_staff', 'doctor', 'nurse', 'physiotherapist', 'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian', 'therapist', ...ADMIN_ROLES];
const FAMILY_ROLES = ['family', 'client', 'consumer', 'patient'];

function isAdmin(role: string) {
  return ADMIN_ROLES.includes(role);
}
function isCoordinator(role: string) {
  return COORDINATOR_ROLES.includes(role);
}
function isClinical(role: string) {
  return CLINICAL_ROLES.includes(role);
}
function isFamily(role: string) {
  return FAMILY_ROLES.includes(role);
}

const createSchema = z.object({
  episodeId: z.string().min(1),
  assessorId: z.string().min(1),
  type: z.string().min(2).max(80).default('initial'),
  scheduledAt: z.string().datetime().or(z.string().min(8)),
  notes: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  status: z.nativeEnum(AssessmentStatus).optional(),
  scheduledAt: z.string().datetime().or(z.string().min(8)).optional(),
  assessorId: z.string().min(1).optional(),
  type: z.string().min(2).max(80).optional(),
  notes: z.string().max(2000).optional().nullable(),
  findings: z.record(z.unknown()).optional(),
  recommendations: z.string().max(4000).optional().nullable(),
  reportUrl: z
    .union([z.string().url(), z.literal(''), z.null()])
    .optional(),
});

const ASSESSMENT_INCLUDE = {
  episode: {
    select: { id: true, title: true, status: true, patientId: true, organizationId: true },
  },
  assessor: { select: { id: true, name: true, email: true } },
  patient: { select: { id: true, name: true, email: true } },
} as const;

function parseScheduledAt(raw: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AppError('Invalid scheduledAt.', 422);
  return d;
}

async function loadAssessment(id: string) {
  const row = await prisma.assessment.findUnique({
    where: { id },
    include: ASSESSMENT_INCLUDE,
  });
  if (!row) throw new AppError('Assessment not found.', 404);
  return row;
}

function assertAccess(
  req: Request,
  assessment: {
    patientId: string;
    assessorId: string;
    episode: { patientId: string; organizationId: string | null };
  },
): void {
  const role = req.user!.role;
  if (isFamily(role) && assessment.patientId === req.user!.userId) return;
  if (isClinical(role) && !isCoordinator(role) && !isAdmin(role)) {
    if (assessment.assessorId !== req.user!.userId) throw new AppError('Forbidden.', 403);
    return;
  }
  if (isAdmin(role) || isCoordinator(role)) {
    assertTenantOrgAccess(req, assessment.episode.organizationId);
    return;
  }
  throw new AppError('Forbidden.', 403);
}

export class AssessmentController {
  /** Clinical staff list for coordinator or family scheduling. */
  static async clinicians(req: Request, res: Response): Promise<void> {
    const role = req.user!.role;
    if (!isCoordinator(role) && !isAdmin(role) && !isFamily(role)) {
      throw new AppError('Forbidden.', 403);
    }

    const where: Prisma.UserWhereInput = {
      role: {
        in: [
          'clinical_staff',
          'doctor',
          'nurse',
          'physiotherapist',
          'occupational_therapist',
          'speech_therapist',
          'psychologist',
          'dietitian',
          'therapist',
        ],
      },
      isActive: true,
      deletedAt: null,
    };

    // Coordinators are tenant-scoped; family picks from org on their care unit when available
    if (isCoordinator(role) || isAdmin(role)) {
      if (req.tenant?.organizationId) {
        where.organizationId = req.tenant.organizationId;
      }
    } else if (isFamily(role)) {
      const unit = await prisma.careUnit.findFirst({
        where: { familyUserId: req.user!.userId },
        select: { organizationId: true },
        orderBy: { createdAt: 'asc' },
      });
      if (unit?.organizationId) {
        where.organizationId = unit.organizationId;
      }
    }

    const data = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    res.json({ data });
  }

  static async index(req: Request, res: Response): Promise<void> {
    const {
      page = '1',
      limit = '20',
      status,
      episodeId,
    } = req.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const role = req.user!.role;

    const where: Prisma.AssessmentWhereInput = {};
    if (status) where.status = status as AssessmentStatus;
    if (episodeId) where.episodeId = episodeId;

    if (isFamily(role) && !isAdmin(role)) {
      where.patientId = req.user!.userId;
    } else if (isClinical(role) && !isCoordinator(role) && !isAdmin(role)) {
      where.assessorId = req.user!.userId;
    } else if (!isCoordinator(role) && !isAdmin(role)) {
      throw new AppError('Forbidden.', 403);
    } else {
      const orgFilter: { organizationId?: string } = {};
      mergeTenantOrg(req, orgFilter);
      if (orgFilter.organizationId) {
        where.episode = { ...(where.episode as object), organizationId: orgFilter.organizationId };
      }
    }

    const [data, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.assessment.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const assessment = await loadAssessment(req.params.id);
    assertAccess(req, assessment);
    res.json({ data: assessment });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const role = req.user!.role;
    const isStaffScheduler = isCoordinator(role) || isAdmin(role);
    const isFamilyScheduler = isFamily(role);

    if (!isStaffScheduler && !isFamilyScheduler) {
      throw new AppError('Forbidden.', 403);
    }

    const body = createSchema.parse(req.body);
    const episode = await prisma.careEpisode.findUnique({ where: { id: body.episodeId } });
    if (!episode) throw new AppError('Episode not found.', 404);

    if (isStaffScheduler) {
      assertTenantOrgAccess(req, episode.organizationId);
    } else if (episode.patientId !== req.user!.userId) {
      throw new AppError('You can only book consultations on your own care journey.', 403);
    }

    if (!['validated', 'active', 'under_review', 'intake_submitted', 'on_hold'].includes(episode.status)) {
      throw new AppError('Cannot schedule assessment on a closed episode.', 422);
    }

    const assessor = await prisma.user.findFirst({
      where: {
        id: body.assessorId,
        isActive: true,
        deletedAt: null,
        role: {
          in: [
            'clinical_staff',
            'doctor',
            'nurse',
            'physiotherapist',
            'occupational_therapist',
            'speech_therapist',
            'psychologist',
            'dietitian',
            'therapist',
            'care_coordinator',
            'admin',
            'super_admin',
          ],
        },
      },
    });
    if (!assessor) throw new AppError('Assessor not found or not clinical staff.', 422);

    const scheduledAt = parseScheduledAt(body.scheduledAt);

    const assessment = await prisma.assessment.create({
      data: {
        episodeId: episode.id,
        assessorId: assessor.id,
        patientId: episode.patientId,
        type: body.type,
        status: 'scheduled',
        scheduledAt,
        notes: body.notes,
      },
      include: ASSESSMENT_INCLUDE,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'assessment_scheduled',
      entity: 'Assessment',
      entityId: assessment.id,
      after: assessment,
      req,
    });

    await NotificationService.create({
      userId: assessor.id,
      title: 'Assessment scheduled',
      body: `You have a new ${assessment.type} assessment for ${episode.title}.`,
      type: 'assessment_scheduled',
    }).catch(() => undefined);

    if (isFamilyScheduler) {
      await NotificationService.create({
        userId: episode.coordinatorId,
        title: 'Consultation booked by family',
        body: `Family scheduled a ${assessment.type} consultation for ${episode.title}.`,
        type: 'assessment_scheduled',
      }).catch(() => undefined);
    } else {
      await NotificationService.create({
        userId: episode.patientId,
        title: 'Assessment booked',
        body: `An assessment (${assessment.type}) was scheduled for your care episode.`,
        type: 'assessment_scheduled',
      }).catch(() => undefined);
    }

    res.status(201).json({ data: assessment });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const existing = await loadAssessment(req.params.id);
    assertAccess(req, existing);

    const role = req.user!.role;
    const body = updateSchema.parse(req.body);

    // Family: read-only
    if (isFamily(role) && !isAdmin(role) && !isCoordinator(role)) {
      throw new AppError('Family users cannot update assessments.', 403);
    }

    // Clinical can complete / cancel own; coordinator can reassign / reschedule / cancel
    if (isClinical(role) && !isCoordinator(role) && !isAdmin(role)) {
      if (existing.assessorId !== req.user!.userId) {
        throw new AppError('Forbidden.', 403);
      }
      if (body.assessorId && body.assessorId !== existing.assessorId) {
        throw new AppError('Clinicians cannot reassign assessments.', 403);
      }
    }

    const nextStatus = body.status;
    if (nextStatus && nextStatus !== existing.status) {
      assertAssessmentTransition(existing.status, nextStatus);
    }

    if (nextStatus === 'completed') {
      const findings = body.findings ?? (existing.findings as Record<string, unknown> | null);
      const reportUrl = body.reportUrl !== undefined ? body.reportUrl : existing.reportUrl;
      const recommendations =
        body.recommendations !== undefined ? body.recommendations : existing.recommendations;

      if (!findings || typeof findings !== 'object' || Object.keys(findings).length === 0) {
        throw new AppError('Structured findings are required to complete an assessment.', 422);
      }
      if (!reportUrl && !recommendations) {
        throw new AppError('Provide a reportUrl or recommendations to complete an assessment.', 422);
      }
    }

    let scheduledAt: Date | undefined;
    if (body.scheduledAt) scheduledAt = parseScheduledAt(body.scheduledAt);

    const updated = await prisma.assessment.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        scheduledAt,
        assessorId: body.assessorId,
        type: body.type,
        notes: body.notes === null ? null : body.notes,
        findings: body.findings as Prisma.InputJsonValue | undefined,
        recommendations: body.recommendations === null ? null : body.recommendations,
        reportUrl:
          body.reportUrl === '' || body.reportUrl === null
            ? null
            : body.reportUrl,
        completedAt: nextStatus === 'completed' ? new Date() : undefined,
      },
      include: ASSESSMENT_INCLUDE,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: nextStatus === 'completed' ? 'assessment_completed' : 'assessment_updated',
      entity: 'Assessment',
      entityId: updated.id,
      before: existing,
      after: updated,
      req,
    });

    if (nextStatus === 'completed') {
      await NotificationService.create({
        userId: existing.patientId,
        title: 'Assessment completed',
        body: 'Your assessment findings are ready.',
        type: 'assessment_completed',
      }).catch(() => undefined);
    }

    res.json({ data: updated });
  }
}
