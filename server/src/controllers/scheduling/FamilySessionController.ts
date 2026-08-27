import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { InvoiceService } from '../../services/InvoiceService';
import { TelehealthRoomService } from '../../services/TelehealthRoomService';
import { assertNoProviderConflict } from '../../services/SchedulingConflictService';
import {
  assertSlotStillOpen,
  computeDayAgenda,
  utcToWallYmd,
  ymdDayOfWeek,
} from '../../services/OpenSlotsService';
import { assertEpisodeAccess, isFamilyRole } from '../../utils/careAccess';
import { toPublicStaffCard } from '../../utils/staffProfile';

const openSlotsQuery = z.object({
  episodeId: z.string().min(1),
  /** Preferred: calendar date YYYY-MM-DD in care timezone (Asia/Qatar). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  durationMinutes: z.coerce.number().int().positive().max(480).default(60),
});

const familyBookSchema = z.object({
  episodeId: z.string().min(1),
  scheduledAt: z.string().min(1),
  durationMinutes: z.number().int().positive().max(480).default(60),
  type: z.enum(['telehealth', 'in_person', 'home_visit']).optional().default('telehealth'),
  notes: z.string().max(5000).optional(),
});

async function loadFamilyEpisode(req: Request, episodeId: string) {
  if (!isFamilyRole(req.user!.role)) {
    throw new AppError('Only family accounts can use this endpoint.', 403);
  }
  const episode = await prisma.careEpisode.findUnique({
    where: { id: episodeId },
    select: {
      id: true,
      title: true,
      status: true,
      patientId: true,
      organizationId: true,
      careUnitId: true,
      coordinatorId: true,
      careUnit: { select: { familyUserId: true } },
    },
  });
  if (!episode) throw new AppError('Care episode not found.', 404);
  await assertEpisodeAccess(req, episode);
  if (episode.status === 'closed') {
    throw new AppError('This care journey is closed.', 400);
  }
  return episode;
}

/**
 * Clinician is assigned by the coordinator (prior session or assessment) —
 * family never picks.
 */
export async function resolveAssignedClinician(episodeId: string) {
  const upcoming = await prisma.session.findFirst({
    where: {
      episodeId,
      status: { in: ['pending', 'accepted', 'in_progress'] },
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      provider: { select: { id: true, name: true, role: true, avatar: true, organizationId: true, isActive: true, deletedAt: true } },
    },
  });
  if (upcoming?.provider && !upcoming.provider.deletedAt && upcoming.provider.isActive) {
    return upcoming.provider;
  }

  const recent = await prisma.session.findFirst({
    where: { episodeId, status: { not: 'cancelled' } },
    orderBy: { scheduledAt: 'desc' },
    include: {
      provider: { select: { id: true, name: true, role: true, avatar: true, organizationId: true, isActive: true, deletedAt: true } },
    },
  });
  if (recent?.provider && !recent.provider.deletedAt && recent.provider.isActive) {
    return recent.provider;
  }

  const assessment = await prisma.assessment.findFirst({
    where: { episodeId },
    orderBy: { scheduledAt: 'desc' },
    include: {
      assessor: { select: { id: true, name: true, role: true, avatar: true, organizationId: true, isActive: true, deletedAt: true } },
    },
  });
  if (assessment?.assessor && !assessment.assessor.deletedAt && assessment.assessor.isActive) {
    return assessment.assessor;
  }

  throw new AppError(
    'No clinician is assigned to this care journey yet. Your care coordinator will assign one before you can book.',
    422,
    { code: 'NO_CLINICIAN_ASSIGNED' },
  );
}

export class FamilySessionController {
  /** GET /scheduling/family/open-slots?episodeId=&date=YYYY-MM-DD&durationMinutes= */
  static async openSlots(req: Request, res: Response): Promise<void> {
    const q = openSlotsQuery.parse(req.query);
    const episode = await loadFamilyEpisode(req, q.episodeId);
    const clinician = await resolveAssignedClinician(episode.id);

    let fromYmd: string;
    let toYmd: string;
    if (q.date) {
      fromYmd = q.date;
      toYmd = q.date;
    } else if (q.from && q.to) {
      const from = new Date(q.from);
      const to = new Date(q.to);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new AppError('from/to must be valid dates.', 422);
      }
      fromYmd = utcToWallYmd(from);
      toYmd = utcToWallYmd(to);
    } else {
      throw new AppError('Provide date=YYYY-MM-DD (or from/to).', 422);
    }

    const agenda = await computeDayAgenda({
      providerId: clinician.id,
      fromYmd,
      toYmd,
      durationMinutes: q.durationMinutes,
    });

    const windowsForDay = agenda.windows.filter((w) => w.dayOfWeek === ymdDayOfWeek(fromYmd));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const availableWeekdays = [
      ...new Set(agenda.windows.map((w) => dayNames[w.dayOfWeek] ?? String(w.dayOfWeek))),
    ].join(', ');

    res.json({
      episodeId: episode.id,
      date: fromYmd,
      durationMinutes: q.durationMinutes,
      clinician: toPublicStaffCard(clinician),
      timezone: agenda.timezone,
      hasAvailability: agenda.hasAvailability,
      windows: windowsForDay,
      /** Full day grid: available | booked | past */
      slots: agenda.slots,
      /** Bookable starts only (compat) */
      openSlots: agenda.slots.filter((s) => s.status === 'available'),
      message: !agenda.hasAvailability
        ? 'This clinician has no weekly availability set. Ask your coordinator to set hours on Schedule, or the clinician can set them on their profile.'
        : agenda.slots.length === 0
          ? `No hours on this weekday. Clinician works: ${availableWeekdays || 'unknown'}.`
          : agenda.slots.every((s) => s.status !== 'available')
            ? 'No open times left this day — booked or too soon to book.'
            : undefined,
    });
  }

  /** GET /scheduling/family/clinician?episodeId= — assigned clinician (read-only) */
  static async assignedClinician(req: Request, res: Response): Promise<void> {
    const episodeId = z.string().min(1).parse(req.query.episodeId);
    const episode = await loadFamilyEpisode(req, episodeId);
    try {
      const clinician = await resolveAssignedClinician(episode.id);
      res.json({ episodeId: episode.id, clinician: toPublicStaffCard(clinician) });
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 422) {
        res.json({ episodeId: episode.id, clinician: null, message: err.message });
        return;
      }
      throw err;
    }
  }

  /** POST /scheduling/family/sessions — family books against assigned clinician */
  static async store(req: Request, res: Response): Promise<void> {
    const body = familyBookSchema.parse(req.body);
    const episode = await loadFamilyEpisode(req, body.episodeId);
    const clinician = await resolveAssignedClinician(episode.id);

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new AppError('Invalid scheduledAt.', 422);
    if (scheduledAt <= new Date()) throw new AppError('scheduledAt must be in the future.', 422);

    await assertSlotStillOpen({
      providerId: clinician.id,
      scheduledAt,
      durationMinutes: body.durationMinutes,
    });
    await assertNoProviderConflict({
      providerId: clinician.id,
      scheduledAt,
      durationMinutes: body.durationMinutes,
    });

    const session = await prisma.session.create({
      data: {
        episodeId: episode.id,
        providerId: clinician.id,
        clientId: episode.patientId,
        scheduledAt,
        durationMinutes: body.durationMinutes,
        type: body.type,
        status: 'accepted',
        notes: body.notes,
      },
    });

    await NotificationService.create({
      userId: clinician.id,
      title: 'New care session booked',
      body: `Family booked a session for "${episode.title}" at ${scheduledAt.toISOString()}.`,
      type: 'session_assigned',
      data: { sessionId: session.id, episodeId: episode.id },
    });

    if (episode.coordinatorId && episode.coordinatorId !== clinician.id) {
      await NotificationService.create({
        userId: episode.coordinatorId,
        title: 'Family booked a session',
        body: `A session was booked on "${episode.title}".`,
        type: 'session_booked_by_family',
        data: { sessionId: session.id, episodeId: episode.id },
      });
    }

    const telehealth =
      session.type === 'telehealth'
        ? await TelehealthRoomService.provisionForSession(session.id)
        : null;

    let invoice = null;
    if (session.type === 'telehealth') {
      invoice = await InvoiceService.tryFromTelehealthBooking(session.id, req.user!.userId);
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'family_session_booked',
      entity: 'Session',
      entityId: session.id,
      after: {
        providerId: clinician.id,
        scheduledAt,
        durationMinutes: body.durationMinutes,
        type: body.type,
      },
      req,
    });

    res.status(201).json({
      session: {
        ...session,
        livekitRoomId: telehealth?.roomName ?? session.livekitRoomId,
        provider: toPublicStaffCard(clinician),
      },
      clinician: toPublicStaffCard(clinician),
      telehealth,
      invoice: invoice ?? undefined,
    });
  }
}
