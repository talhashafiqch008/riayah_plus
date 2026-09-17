import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import {
  assertNoProviderConflict,
  expandRecurrence,
} from '../../services/SchedulingConflictService';
import { toPublicStaffCard } from '../../utils/staffProfile';
import { InvoiceService } from '../../services/InvoiceService';
import { TelehealthRoomService } from '../../services/TelehealthRoomService';

const FAMILY_ROLES = ['client', 'consumer', 'family', 'patient'];
const MAX_DURATION_MINUTES = 480;

function redactRecordingFieldsForFamily<T extends Record<string, unknown>>(
  session: T,
  role: string,
): T {
  if (!FAMILY_ROLES.includes(role)) return session;
  return {
    ...session,
    recordingUrl: null,
    recordingStatus: null,
    recordingEgressId: null,
    recordingTranscript: null,
  };
}

/** Family session lists only need clinician name — skip provider_profiles (schema drift on extra columns). */
const familyProviderSelect = {
  id: true,
  name: true,
  role: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const bookSchema = z.object({
  episodeId: z.string().min(1),
  providerId: z.string().min(1),
  scheduledAt: z.string().min(1),
  durationMinutes: z.number().int().positive().max(MAX_DURATION_MINUTES).default(60),
  type: z.enum(['in_person', 'telehealth', 'home_visit']).optional(),
  notes: z.string().max(5000).optional(),
  /** Reassign pending episode tasks (from care-plan goals) to this provider. */
  assignPendingTasks: z.boolean().optional().default(false),
});

const recurringSchema = bookSchema.extend({
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly']),
    count: z.number().int().min(1).max(52),
    interval: z.number().int().min(1).max(12).optional().default(1),
  }),
});

const rescheduleSchema = z.object({
  scheduledAt: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().max(MAX_DURATION_MINUTES).optional(),
  notes: z.string().max(5000).nullable().optional(),
  status: z.enum(['pending', 'accepted', 'in_progress', 'completed', 'cancelled']).optional(),
});

function parseScheduledAt(raw: string, mustBeFuture = true): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AppError('Invalid scheduledAt datetime.', 422);
  if (mustBeFuture && d <= new Date()) throw new AppError('scheduledAt must be in the future.', 422);
  return d;
}

async function loadEpisodeForSchedule(req: Request, episodeId: string) {
  const episode = await prisma.careEpisode.findUnique({
    where: { id: episodeId },
    select: {
      id: true,
      patientId: true,
      organizationId: true,
      coordinatorId: true,
      title: true,
      status: true,
      careUnitId: true,
      careUnit: { select: { familyUserId: true } },
    },
  });
  if (!episode) throw new AppError('Care episode not found.', 404);

  const { assertEpisodeAccess } = await import('../../utils/careAccess');
  await assertEpisodeAccess(req, episode);
  return episode;
}

function assertSchedulerRole(req: Request): void {
  const allowed = [
    'care_coordinator',
    'admin',
    'super_admin',
    'support_admin',
    'clinical_staff',
  ];
  if (!allowed.includes(req.user!.role)) {
    throw new AppError('Only coordinators/clinical staff can book care sessions.', 403);
  }
}

async function assertProviderInOrg(providerId: string, organizationId: string | null) {
  const provider = await prisma.user.findFirst({
    where: { id: providerId, deletedAt: null, isActive: true },
    select: { id: true, organizationId: true, name: true, role: true },
  });
  if (!provider) throw new AppError('Provider / staff not found.', 404);
  if (organizationId && provider.organizationId && provider.organizationId !== organizationId) {
    throw new AppError('Provider is not in the episode organization.', 403);
  }
  return provider;
}

export class SessionScheduleController {
  /**
   * GET /scheduling/staff — org-scoped workers/clinicians for availability + booking pickers.
   */
  static async listStaff(req: Request, res: Response): Promise<void> {
    const role = req.user!.role;
    const allowed = [
      'care_coordinator',
      'admin',
      'super_admin',
      'support_admin',
      'clinical_staff',
    ];
    if (!allowed.includes(role)) {
      throw new AppError('Forbidden.', 403);
    }

    const schedulableRoles: UserRole[] = [
      'support_worker',
      'clinical_staff',
      'doctor',
      'nurse',
      'physiotherapist',
      'occupational_therapist',
      'speech_therapist',
      'psychologist',
      'dietitian',
      'therapist',
      'caregiver',
      'companion',
    ];

    const where: Prisma.UserWhereInput = {
      role: { in: schedulableRoles },
      isActive: true,
      deletedAt: null,
    };

    const orgId = req.tenant?.organizationId;
    if (orgId) {
      where.organizationId = orgId;
    }

    const data = await prisma.user.findMany({
      where,
      select: familyProviderSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 200,
    });

    res.json({ data: data.map((row) => toPublicStaffCard(row)) });
  }

  /** GET /scheduling/sessions?episodeId=&providerId= */
  static async index(req: Request, res: Response): Promise<void> {
    const episodeId = typeof req.query.episodeId === 'string' ? req.query.episodeId : undefined;
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;

    const where: Record<string, unknown> = {};

    if (episodeId) {
      await loadEpisodeForSchedule(req, episodeId);
      where.episodeId = episodeId;
    } else if (providerId) {
      if (req.user!.userId !== providerId && !['care_coordinator', 'admin', 'super_admin', 'support_admin'].includes(req.user!.role)) {
        throw new AppError('Forbidden.', 403);
      }
      // Coordinators/admins must only see sessions for providers in their own org
      if (req.user!.userId !== providerId) {
        const provider = await prisma.user.findFirst({
          where: { id: providerId, deletedAt: null },
          select: { organizationId: true },
        });
        if (!provider) throw new AppError('Provider not found.', 404);
        assertTenantOrgAccess(req, provider.organizationId);
      }
      where.providerId = providerId;
    } else if (['support_worker', 'clinical_staff', 'doctor', 'nurse', 'physiotherapist', 'therapist', 'caregiver'].includes(req.user!.role)) {
      where.providerId = req.user!.userId;
    } else if (FAMILY_ROLES.includes(req.user!.role)) {
      // Family may be care-unit account holder; sessions use episode.patientId as clientId
      where.episode = {
        OR: [
          { careUnit: { familyUserId: req.user!.userId } },
          { patientId: req.user!.userId },
        ],
      };
    } else {
      // coordinator/admin: scope via episodes in org — never return unscoped sessions
      const orgId = req.tenant?.organizationId;
      if (!orgId) throw new AppError('No organization assigned to this account.', 403);
      where.episode = { organizationId: orgId };
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      take: 100,
      include: {
        provider: {
          select: familyProviderSelect,
        },
        client: { select: { id: true, name: true } },
      },
    });

    res.json({
      sessions: sessions.map((s) =>
        redactRecordingFieldsForFamily(
          {
            ...s,
            provider: s.provider ? toPublicStaffCard(s.provider) : s.provider,
          } as Record<string, unknown>,
          req.user!.role,
        ),
      ),
    });
  }

  /** GET /scheduling/sessions/:id */
  static async show(req: Request, res: Response): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        provider: {
          select: familyProviderSelect,
        },
        client: { select: { id: true, name: true } },
        episode: { select: { id: true, title: true, organizationId: true, patientId: true } },
      },
    });
    if (!session) throw new AppError('Session not found.', 404);

    if (session.episode) {
      await loadEpisodeForSchedule(req, session.episode.id);
    } else if (
      session.providerId !== req.user!.userId &&
      session.clientId !== req.user!.userId &&
      !['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role)
    ) {
      throw new AppError('Forbidden.', 403);
    }

    res.json({
      session: redactRecordingFieldsForFamily(
        {
          ...session,
          provider: session.provider ? toPublicStaffCard(session.provider) : session.provider,
        } as Record<string, unknown>,
        req.user!.role,
      ),
    });
  }

  /** POST /scheduling/sessions — book one session with conflict detection */
  static async store(req: Request, res: Response): Promise<void> {
    assertSchedulerRole(req);
    const body = bookSchema.parse(req.body);
    const episode = await loadEpisodeForSchedule(req, body.episodeId);
    const provider = await assertProviderInOrg(body.providerId, episode.organizationId);
    const scheduledAt = parseScheduledAt(body.scheduledAt);
    const durationMinutes = body.durationMinutes;

    await assertNoProviderConflict({
      providerId: provider.id,
      scheduledAt,
      durationMinutes,
    });

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          episodeId: episode.id,
          providerId: provider.id,
          clientId: episode.patientId,
          scheduledAt,
          durationMinutes,
          type: mapSessionType(body.type),
          status: 'accepted',
          notes: body.notes,
        },
      });

      if (body.assignPendingTasks) {
        await tx.task.updateMany({
          where: {
            careEpisodeId: episode.id,
            status: { in: ['pending', 'in_progress'] },
          },
          data: { assigneeId: provider.id },
        });
      }

      return created;
    });

    await NotificationService.create({
      userId: provider.id,
      title: 'New care session assigned',
      body: `You have a session for "${episode.title}" at ${scheduledAt.toISOString()}.`,
      type: 'session_assigned',
      data: { sessionId: session.id, episodeId: episode.id },
    });

    const telehealth = await TelehealthRoomService.provisionForSession(session.id);

    let invoice = null;
    if (session.type === 'telehealth') {
      invoice = await InvoiceService.tryFromTelehealthBooking(session.id, req.user!.userId);
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'session_booked',
      entity: 'Session',
      entityId: session.id,
      after: { providerId: provider.id, scheduledAt, durationMinutes, assignPendingTasks: body.assignPendingTasks },
      req,
    });

    res.status(201).json({
      session: {
        ...session,
        livekitRoomId: telehealth.roomName ?? session.livekitRoomId,
      },
      telehealth,
      invoice: invoice ?? undefined,
    });
  }

  /** POST /scheduling/sessions/recurring — generate occurrences with per-slot conflict checks */
  static async storeRecurring(req: Request, res: Response): Promise<void> {
    assertSchedulerRole(req);
    const body = recurringSchema.parse(req.body);
    const episode = await loadEpisodeForSchedule(req, body.episodeId);
    const provider = await assertProviderInOrg(body.providerId, episode.organizationId);
    const startAt = parseScheduledAt(body.scheduledAt);
    const durationMinutes = body.durationMinutes;
    const dates = expandRecurrence(startAt, body.recurrence);
    const type = mapSessionType(body.type);

    const created = [];
    const skipped: { scheduledAt: string; reason: string }[] = [];

    for (const scheduledAt of dates) {
      try {
        await assertNoProviderConflict({
          providerId: provider.id,
          scheduledAt,
          durationMinutes,
        });
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 409) {
          skipped.push({
            scheduledAt: scheduledAt.toISOString(),
            reason: 'conflict',
          });
          continue;
        }
        throw err;
      }

      const session = await prisma.session.create({
        data: {
          episodeId: episode.id,
          providerId: provider.id,
          clientId: episode.patientId,
          scheduledAt,
          durationMinutes,
          type,
          status: 'accepted',
          notes: body.notes,
        },
      });
      created.push(session);
      if (type === 'telehealth') {
        await TelehealthRoomService.provisionForSession(session.id);
        await InvoiceService.tryFromTelehealthBooking(session.id, req.user!.userId);
      }
    }

    if (body.assignPendingTasks && created.length > 0) {
      await prisma.task.updateMany({
        where: {
          careEpisodeId: episode.id,
          status: { in: ['pending', 'in_progress'] },
        },
        data: { assigneeId: provider.id },
      });
    }

    if (created.length === 0) {
      throw new AppError(
        'No sessions created — all occurrences conflicted with existing bookings.',
        409,
        { skipped },
      );
    }

    await NotificationService.create({
      userId: provider.id,
      title: 'Recurring care sessions assigned',
      body: `${created.length} session(s) scheduled for "${episode.title}".`,
      type: 'session_assigned',
      data: { episodeId: episode.id, count: created.length },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'sessions_recurring_created',
      entity: 'Session',
      entityId: episode.id,
      after: { created: created.length, skipped: skipped.length },
      req,
    });

    res.status(201).json({
      sessions: created,
      created: created.length,
      skipped,
    });
  }

  /** PATCH /scheduling/sessions/:id — reschedule / cancel with conflict check */
  static async update(req: Request, res: Response): Promise<void> {
    assertSchedulerRole(req);
    const body = rescheduleSchema.parse(req.body);
    const existing = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { episode: { select: { id: true, organizationId: true, patientId: true } } },
    });
    if (!existing) throw new AppError('Session not found.', 404);
    if (existing.episode) {
      await loadEpisodeForSchedule(req, existing.episode.id);
    }

    const scheduledAt = body.scheduledAt
      ? parseScheduledAt(body.scheduledAt)
      : existing.scheduledAt;
    const durationMinutes = body.durationMinutes ?? existing.durationMinutes ?? 60;

    if (body.status !== 'cancelled') {
      await assertNoProviderConflict({
        providerId: existing.providerId,
        scheduledAt,
        durationMinutes,
        excludeSessionId: existing.id,
      });
    }

    const becameCompleted = body.status === 'completed' && existing.status !== 'completed';

    const session = await prisma.session.update({
      where: { id: existing.id },
      data: {
        scheduledAt,
        durationMinutes,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(becameCompleted ? { completedAt: new Date() } : {}),
      },
    });

    let invoice;
    if (becameCompleted) {
      invoice = await InvoiceService.tryFromSession(session.id, req.user!.userId);
    }

    let telehealth;
    let bookingInvoice;
    if (session.type === 'telehealth' && ['accepted', 'in_progress'].includes(session.status)) {
      telehealth = await TelehealthRoomService.provisionForSession(session.id);
      bookingInvoice = await InvoiceService.tryFromTelehealthBooking(session.id, req.user!.userId);
    }

    res.json({
      session: { ...session, livekitRoomId: telehealth?.roomName ?? session.livekitRoomId },
      invoice: invoice ?? bookingInvoice ?? undefined,
      telehealth,
    });
  }

  /** DELETE /scheduling/sessions/:id — cancel */
  static async destroy(req: Request, res: Response): Promise<void> {
    assertSchedulerRole(req);
    const existing = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { episode: { select: { id: true, organizationId: true, patientId: true } } },
    });
    if (!existing) throw new AppError('Session not found.', 404);
    if (existing.episode) {
      await loadEpisodeForSchedule(req, existing.episode.id);
    }

    const session = await prisma.session.update({
      where: { id: existing.id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Session cancelled.', session });
  }
}

function mapSessionType(
  type: 'in_person' | 'telehealth' | 'home_visit' | undefined,
): 'in_person' | 'telehealth' | 'home_visit' {
  if (type === 'telehealth') return 'telehealth';
  if (type === 'home_visit') return 'home_visit';
  return 'in_person';
}
