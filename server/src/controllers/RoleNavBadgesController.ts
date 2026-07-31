import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { familyAssessmentWhere, familyEpisodeWhere, isFamilyRole } from '../utils/careAccess';

const CLINICAL_ROLES = [
  'clinical_staff',
  'doctor',
  'nurse',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'therapist',
  'admin',
  'super_admin',
] as const;

function orgId(req: Request): string | undefined {
  const id = req.tenant?.organizationId;
  if (!id) return undefined;
  return id;
}

/**
 * Lightweight sidebar badge counts per role shell.
 * Only actionable counts — no inventory badges (episodes / draft plans).
 * Mounted at GET /api/shells/:shellKey/nav-badges
 */
export class RoleNavBadgesController {
  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shellKey = String(req.params.shellKey || '').toLowerCase();
      const role = req.user!.role;
      const userId = req.user!.userId;

      switch (shellKey) {
        case 'clinical':
          res.json({ data: await clinicalBadges(userId, role) });
          return;
        case 'support':
          res.json({ data: await supportBadges(userId, role) });
          return;
        case 'family':
        case 'patient':
          res.json({ data: await familyBadges(userId, role) });
          return;
        case 'coordinator':
          res.json({ data: await coordinatorBadges(req, userId, role) });
          return;
        default:
          res.json({ data: {} });
      }
    } catch (err) {
      next(err);
    }
  }
}

async function clinicalBadges(userId: string, role: string) {
  if (!(CLINICAL_ROLES as readonly string[]).includes(role) && role !== 'care_coordinator') {
    throw new AppError('Clinical access required.', 403);
  }

  const scheduledAssessments = await prisma.assessment.count({
    where: { assessorId: userId, status: 'scheduled' },
  });

  return { scheduledAssessments };
}

async function supportBadges(userId: string, role: string) {
  if (!['support_worker', 'admin', 'super_admin', 'support_admin'].includes(role)) {
    throw new AppError('Support worker access required.', 403);
  }

  const [openTasks, activeShift] = await Promise.all([
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { in: ['pending', 'in_progress'] },
      },
    }),
    prisma.shift.count({
      where: {
        workerId: userId,
        status: { in: ['active', 'on_break'] },
      },
    }),
  ]);

  return { openTasks, activeShift };
}

async function familyBadges(userId: string, role: string) {
  if (!isFamilyRole(role) && !['admin', 'super_admin'].includes(role)) {
    throw new AppError('Family access required.', 403);
  }

  const [scheduledAppointments, plansAwaitingReview] = await Promise.all([
    prisma.assessment.count({
      where: {
        status: 'scheduled',
        ...familyAssessmentWhere(userId),
      },
    }),
    prisma.carePlan.count({
      where: {
        isCurrentVersion: true,
        status: 'submitted_for_approval',
        episode: familyEpisodeWhere(userId),
      },
    }),
  ]);

  return { scheduledAppointments, plansAwaitingReview };
}

async function coordinatorBadges(req: Request, userId: string, role: string) {
  if (!['care_coordinator', 'admin', 'super_admin', 'support_admin'].includes(role)) {
    throw new AppError('Care coordinator access required.', 403);
  }

  const tenantOrg = orgId(req);
  const intakeWhere: Record<string, unknown> = {
    status: { in: ['submitted', 'under_review'] },
  };
  if (tenantOrg) intakeWhere.organizationId = tenantOrg;
  if (role === 'care_coordinator') {
    intakeWhere.familyUser = { assignedCoordinatorId: userId };
  }

  // Actionable only — awaiting approval / revision (not drafts or episode inventory).
  const planWhere: Record<string, unknown> = {
    isCurrentVersion: true,
    status: { in: ['submitted_for_approval', 'revision_requested'] },
  };
  if (tenantOrg) {
    planWhere.episode = { organizationId: tenantOrg };
  } else if (role === 'care_coordinator') {
    planWhere.coordinatorId = userId;
  }

  const [pendingIntake, plansNeedingAttention] = await Promise.all([
    prisma.intakeRecord.count({ where: intakeWhere }),
    prisma.carePlan.count({ where: planWhere }),
  ]);

  return { pendingIntake, plansNeedingAttention };
}
