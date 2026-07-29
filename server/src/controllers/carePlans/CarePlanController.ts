import { Request, Response } from 'express';
import { CarePlanStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess, mergeTenantOrg } from '../../middleware/tenantAccess';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { assertCarePlanTransition } from '../../utils/stateMachine';

const FAMILY_ROLES = ['client', 'consumer', 'family', 'patient'];

/** Material edits to these statuses must create a new draft version for re-approval (CP8). */
const REAPPROVAL_STATUSES: CarePlanStatus[] = ['active', 'approved'];

/** In-place item/goal mutations are blocked; use PATCH /care-plans/:id instead. */
const LOCKED_INPLACE_STATUSES: CarePlanStatus[] = [
  'submitted_for_approval',
  'approved',
  'active',
  'completed',
];

const goalSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  measurement: z.string().optional(),
  measurableOutcome: z.string().optional(),
  tier: z.string().optional(),
  category: z.string().optional(),
});

const itemSchema = z.object({
  serviceType: z.string(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  unitCost: z.number().optional(),
  currency: z.string().optional(),
  assignedRole: z.string().optional(),
  notes: z.string().optional(),
});

const createPlanSchema = z.object({
  episodeId: z.string(),
  title: z.string(),
  notes: z.string().optional(),
  goals: z.array(goalSchema).optional(),
  items: z.array(itemSchema).optional(),
});

const updatePlanSchema = z.object({
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  goals: z.array(goalSchema).optional(),
  items: z.array(itemSchema).optional(),
});

const updateGoalSchema = z.object({
  status: z.enum(['active', 'achieved', 'paused', 'cancelled']).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const cosignSchema = z.object({
  notes: z.string().max(2000).optional(),
});

/** Plans clinical staff may optionally co-sign (workflow attestation). */
const COSIGN_ALLOWED_STATUSES: CarePlanStatus[] = [
  'submitted_for_approval',
  'approved',
  'active',
];

type GoalInput = z.infer<typeof goalSchema>;
type ItemInput = z.infer<typeof itemSchema>;

function assertCarePlanAccess(
  req: Request,
  episode: { patientId: string; organizationId: string | null },
): void {
  if (FAMILY_ROLES.includes(req.user!.role)) {
    if (episode.patientId !== req.user!.userId) {
      throw new AppError('Forbidden.', 403);
    }
    return;
  }
  assertTenantOrgAccess(req, episode.organizationId);
}

/** Throw if the plan cannot be mutated in place (items routes). */
export function assertPlanAllowsInPlaceMutation(status: CarePlanStatus): void {
  if (LOCKED_INPLACE_STATUSES.includes(status)) {
    throw new AppError(
      `Cannot edit care plan items while status is "${status}". ` +
        'Use PATCH /care-plans/:id to create a new draft version that requires re-approval.',
      422,
    );
  }
}

function normalizeGoalsForCompare(goals: GoalInput[]): string {
  return JSON.stringify(
    goals.map((g) => ({
      title: g.title,
      description: g.description ?? null,
      measurement: g.measurement ?? null,
      measurableOutcome: g.measurableOutcome ?? null,
      targetDate: g.targetDate ?? null,
      tier: g.tier ?? 'short_term',
      category: g.category ?? 'functional',
    })),
  );
}

function normalizeItemsForCompare(items: ItemInput[]): string {
  return JSON.stringify(
    items.map((i) => ({
      serviceType: i.serviceType,
      frequency: i.frequency ?? null,
      duration: i.duration ?? null,
      unitCost: i.unitCost ?? null,
      currency: i.currency ?? 'QAR',
      assignedRole: i.assignedRole ?? null,
      notes: i.notes ?? null,
    })),
  );
}

function isMaterialChange(params: {
  prevTitle: string;
  nextTitle: string;
  prevNotes: string | null;
  nextNotes: string | null;
  prevGoals: GoalInput[];
  nextGoals: GoalInput[];
  prevItems: ItemInput[];
  nextItems: ItemInput[];
}): boolean {
  if (params.prevTitle !== params.nextTitle) return true;
  if ((params.prevNotes ?? null) !== (params.nextNotes ?? null)) return true;
  if (normalizeGoalsForCompare(params.prevGoals) !== normalizeGoalsForCompare(params.nextGoals)) {
    return true;
  }
  if (normalizeItemsForCompare(params.prevItems) !== normalizeItemsForCompare(params.nextItems)) {
    return true;
  }
  return false;
}

function mapStoredGoals(goals: Array<{
  title: string;
  description: string | null;
  measurement: string | null;
  measurableOutcome: string | null;
  targetDate: Date | null;
  tier: string;
  category: string;
}>): GoalInput[] {
  return goals.map((g) => ({
    title: g.title,
    description: g.description ?? undefined,
    measurement: g.measurement ?? undefined,
    measurableOutcome: g.measurableOutcome ?? undefined,
    targetDate: g.targetDate ? g.targetDate.toISOString() : undefined,
    tier: g.tier,
    category: g.category,
  }));
}

function mapStoredItems(items: Array<{
  serviceType: string;
  frequency: string | null;
  duration: string | null;
  unitCost: { toNumber?: () => number } | number | null;
  currency: string;
  assignedRole: string | null;
  notes: string | null;
}>): ItemInput[] {
  return items.map((i) => {
    let unitCost: number | undefined;
    if (i.unitCost != null) {
      unitCost = typeof i.unitCost === 'number' ? i.unitCost : i.unitCost.toNumber?.() ?? Number(i.unitCost);
    }
    return {
      serviceType: i.serviceType,
      frequency: i.frequency ?? undefined,
      duration: i.duration ?? undefined,
      unitCost,
      currency: i.currency,
      assignedRole: i.assignedRole ?? undefined,
      notes: i.notes ?? undefined,
    };
  });
}

function goalCreateData(goals: GoalInput[], userId: string) {
  return goals.map((g) => ({
    title: g.title,
    description: g.description,
    measurement: g.measurement,
    measurableOutcome: g.measurableOutcome ?? g.measurement,
    tier: g.tier ?? 'short_term',
    category: g.category ?? 'functional',
    targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
    userId,
  }));
}

function itemCreateData(items: ItemInput[]) {
  return items.map((i) => ({
    serviceType: i.serviceType,
    frequency: i.frequency,
    duration: i.duration,
    unitCost: i.unitCost,
    currency: i.currency ?? 'QAR',
    assignedRole: i.assignedRole,
    notes: i.notes,
  }));
}

export class CarePlanController {
  static async index(req: Request, res: Response): Promise<void> {
    const { episodeId } = req.query as { episodeId?: string };
    const where: Record<string, unknown> = {};
    if (episodeId) where.episodeId = episodeId;

    const role = req.user!.role;
    if (FAMILY_ROLES.includes(role)) {
      where.episode = { patientId: req.user!.userId };
    } else {
      const orgFilter: { organizationId?: string } = {};
      mergeTenantOrg(req, orgFilter);
      if (orgFilter.organizationId) {
        where.episode = {
          ...((where.episode as object) ?? {}),
          organizationId: orgFilter.organizationId,
        };
      }
    }

    const plans = await prisma.carePlan.findMany({
      where,
      include: { goals: true, items: true, episode: { select: { id: true, organizationId: true, patientId: true } } },
      orderBy: { version: 'desc' },
    });
    res.json({ data: plans });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const data = createPlanSchema.parse(req.body);

    const episode = await prisma.careEpisode.findUnique({ where: { id: data.episodeId } });
    if (!episode) throw new AppError('Episode not found.', 404);
    assertTenantOrgAccess(req, episode.organizationId);

    const plan = await prisma.carePlan.create({
      data: {
        episodeId: data.episodeId,
        coordinatorId: req.user!.userId,
        title: data.title,
        notes: data.notes,
        status: 'draft',
        version: 1,
        goals: data.goals
          ? {
              create: data.goals.map((g) => ({
                ...g,
                userId: req.user!.userId,
                targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
              })),
            }
          : undefined,
        items: data.items ? { create: data.items } : undefined,
      },
      include: { goals: true, items: true },
    });

    await AuditService.log({ userId: req.user!.userId, action: 'care_plan_created', entity: 'CarePlan', entityId: plan.id, req });
    res.status(201).json({ data: plan });
  }

  static async show(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: {
        goals: true,
        items: true,
        approvalLogs: true,
        episode: { select: { id: true, organizationId: true, patientId: true } },
      },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);

    assertCarePlanAccess(req, plan.episode);
    res.json({ data: plan });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const body = updatePlanSchema.parse(req.body);
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: {
        goals: true,
        items: true,
        episode: { select: { organizationId: true, patientId: true } },
      },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertTenantOrgAccess(req, plan.episode.organizationId);

    if (!plan.isCurrentVersion) {
      throw new AppError('Only the current care plan version can be edited.', 422);
    }
    if (plan.status === 'completed') {
      throw new AppError('Completed care plans cannot be edited.', 422);
    }
    if (plan.status === 'submitted_for_approval') {
      throw new AppError(
        'Care plan is awaiting family approval. Request a revision or wait for a response before editing.',
        422,
      );
    }

    const prevGoals = mapStoredGoals(plan.goals);
    const prevItems = mapStoredItems(plan.items);
    const nextTitle = body.title ?? plan.title;
    const nextNotes = body.notes !== undefined ? body.notes : plan.notes;
    const nextGoals = body.goals ?? prevGoals;
    const nextItems = body.items ?? prevItems;

    const material = isMaterialChange({
      prevTitle: plan.title,
      nextTitle,
      prevNotes: plan.notes,
      nextNotes,
      prevGoals,
      nextGoals,
      prevItems,
      nextItems,
    });

    // CP8: material edit of active/approved plan → new draft version requiring re-approval
    if (REAPPROVAL_STATUSES.includes(plan.status)) {
      if (!material) {
        res.json({ data: plan });
        return;
      }

      const newPlan = await prisma.$transaction(async (tx) => {
        const oldData: { isCurrentVersion: boolean; status?: CarePlanStatus } = {
          isCurrentVersion: false,
        };
        if (plan.status === 'active') {
          assertCarePlanTransition(plan.status, 'revision_requested');
          oldData.status = 'revision_requested';
        } else if (plan.status === 'approved') {
          // approved → completed (superseded); new draft becomes current
          assertCarePlanTransition(plan.status, 'completed');
          oldData.status = 'completed';
        }

        await tx.carePlan.update({ where: { id: plan.id }, data: oldData });

        await tx.carePlanApprovalLog.create({
          data: {
            carePlanId: plan.id,
            action: 'superseded_for_reapproval',
            actorId: req.user!.userId,
            notes: `Material edit created version ${plan.version + 1}; previous status was ${plan.status}.`,
          },
        });

        const created = await tx.carePlan.create({
          data: {
            episodeId: plan.episodeId,
            coordinatorId: req.user!.userId,
            title: nextTitle,
            notes: nextNotes,
            status: 'draft',
            version: plan.version + 1,
            isCurrentVersion: true,
            previousVersionId: plan.id,
            goals: { create: goalCreateData(nextGoals, req.user!.userId) },
            items: { create: itemCreateData(nextItems) },
          },
          include: { goals: true, items: true },
        });

        await tx.carePlanApprovalLog.create({
          data: {
            carePlanId: created.id,
            action: 'created_pending_reapproval',
            actorId: req.user!.userId,
            notes: `Draft v${created.version} from material edit of v${plan.version}. Submit for family re-approval.`,
          },
        });

        return created;
      });

      await NotificationService.create({
        userId: plan.episode.patientId,
        title: 'Care Plan Being Revised',
        body: 'Your care coordinator updated the care plan. You will be asked to approve the new version once it is submitted.',
        type: 'care_plan_revision',
        data: { carePlanId: newPlan.id, previousCarePlanId: plan.id },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'care_plan_reapproval_gated',
        entity: 'CarePlan',
        entityId: newPlan.id,
        before: plan,
        after: newPlan,
        req,
      });

      res.json({
        data: newPlan,
        meta: {
          reapprovalRequired: true,
          previousVersionId: plan.id,
          message: 'Material changes created a new draft version. Submit for family re-approval before it can become active.',
        },
      });
      return;
    }

    // draft / revision_requested / rejected — in-place edit (no forced re-approval)
    if (plan.status === 'rejected') {
      assertCarePlanTransition(plan.status, 'draft');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.goals) {
        await tx.goal.deleteMany({ where: { carePlanId: plan.id } });
        await tx.goal.createMany({
          data: goalCreateData(nextGoals, req.user!.userId).map((g) => ({
            ...g,
            carePlanId: plan.id,
          })),
        });
      }
      if (body.items) {
        await tx.carePlanItem.deleteMany({ where: { carePlanId: plan.id } });
        await tx.carePlanItem.createMany({
          data: itemCreateData(nextItems).map((i) => ({
            ...i,
            carePlanId: plan.id,
          })),
        });
      }

      return tx.carePlan.update({
        where: { id: plan.id },
        data: {
          title: nextTitle,
          notes: nextNotes,
          ...(plan.status === 'rejected' ? { status: 'draft' as const, rejectionNotes: null } : {}),
        },
        include: { goals: true, items: true },
      });
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_plan_updated',
      entity: 'CarePlan',
      entityId: updated.id,
      before: plan,
      after: updated,
      req,
    });

    res.json({ data: updated });
  }

  static async submitForApproval(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: { episode: true },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertTenantOrgAccess(req, plan.episode.organizationId);

    assertCarePlanTransition(plan.status, 'submitted_for_approval');

    await prisma.carePlan.update({
      where: { id: plan.id },
      data: { status: 'submitted_for_approval', submittedAt: new Date() },
    });

    await prisma.carePlanApprovalLog.create({
      data: { carePlanId: plan.id, action: 'submitted', actorId: req.user!.userId },
    });

    // Notify family/patient
    await NotificationService.create({
      userId: plan.episode.patientId,
      title: 'Care Plan Ready for Your Review',
      body: 'Your care coordinator has submitted a care plan for your approval.',
      type: 'care_plan_submitted',
      data: { carePlanId: plan.id },
    });

    res.json({ message: 'Care plan submitted for approval.' });
  }

  static async approve(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: { episode: true, goals: true },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertCarePlanAccess(req, plan.episode);

    assertCarePlanTransition(plan.status, 'approved');

    await prisma.$transaction(async (tx) => {
      await tx.carePlan.update({
        where: { id: plan.id },
        data: { status: 'approved', approvedAt: new Date(), approvedById: req.user!.userId },
      });

      await tx.carePlanApprovalLog.create({
        data: { carePlanId: plan.id, action: 'approved', actorId: req.user!.userId },
      });

      // approved → active (clinical workflow; enables CP8 re-approval gate)
      assertCarePlanTransition('approved', 'active');
      await tx.carePlan.update({
        where: { id: plan.id },
        data: { status: 'active' },
      });
      await tx.carePlanApprovalLog.create({
        data: { carePlanId: plan.id, action: 'activated', actorId: req.user!.userId },
      });

      await tx.careEpisode.update({
        where: { id: plan.episodeId },
        data: { status: 'active' },
      });

      for (const goal of plan.goals) {
        const existing = await tx.task.findFirst({ where: { goalId: goal.id } });
        if (existing) continue;

        await tx.task.create({
          data: {
            title: goal.title,
            description: goal.description ?? goal.measurableOutcome ?? undefined,
            goalId: goal.id,
            careEpisodeId: plan.episodeId,
            assignerId: plan.coordinatorId,
            assigneeId: plan.coordinatorId,
            status: 'pending',
            dueAt: goal.targetDate ?? undefined,
          },
        });
      }
    });

    await AuditService.log({ userId: req.user!.userId, action: 'care_plan_approved', entity: 'CarePlan', entityId: plan.id, req });
    res.json({ message: 'Care plan approved and activated.' });
  }

  static async reject(req: Request, res: Response): Promise<void> {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: { episode: true },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertCarePlanAccess(req, plan.episode);

    assertCarePlanTransition(plan.status, 'rejected');

    await prisma.carePlan.update({
      where: { id: plan.id },
      data: { status: 'rejected', rejectionNotes: notes ?? null },
    });

    await prisma.carePlanApprovalLog.create({
      data: {
        carePlanId: plan.id,
        action: 'rejected',
        actorId: req.user!.userId,
        notes: notes ?? null,
      },
    });

    await NotificationService.create({
      userId: plan.coordinatorId,
      title: 'Care Plan Rejected',
      body: notes ?? 'The family has rejected the submitted care plan.',
      type: 'care_plan_rejected',
      data: { carePlanId: plan.id },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_plan_rejected',
      entity: 'CarePlan',
      entityId: plan.id,
      req,
    });

    res.json({ message: 'Care plan rejected.' });
  }

  static async requestRevision(req: Request, res: Response): Promise<void> {
    const { notes } = z.object({ notes: z.string() }).parse(req.body);
    const plan = await prisma.carePlan.findUnique({ where: { id: req.params.id }, include: { episode: true } });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertCarePlanAccess(req, plan.episode);

    assertCarePlanTransition(plan.status, 'revision_requested');

    await prisma.carePlan.update({
      where: { id: plan.id },
      data: { status: 'revision_requested', rejectionNotes: notes },
    });

    await prisma.carePlanApprovalLog.create({
      data: { carePlanId: plan.id, action: 'revision_requested', actorId: req.user!.userId, notes },
    });

    // Notify coordinator
    await NotificationService.create({
      userId: plan.coordinatorId,
      title: 'Care Plan Revision Requested',
      body: notes,
      type: 'care_plan_revision',
      data: { carePlanId: plan.id },
    });

    res.json({ message: 'Revision requested.' });
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: { episode: { select: { organizationId: true } } },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertTenantOrgAccess(req, plan.episode.organizationId);

    await prisma.carePlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Care plan deleted.' });
  }

  /** GET /care-plans/:id/goals — list goals for a plan (progress tracking). */
  static async listGoals(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: {
        episode: { select: { patientId: true, organizationId: true } },
        goals: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertCarePlanAccess(req, plan.episode);

    res.json({ goals: plan.goals });
  }

  /**
   * PATCH /care-plans/:id/goals/:goalId — progress update (status → achieved sets achievedAt).
   * Allowed on active/approved plans; does not trigger CP8 re-approval (not a material plan edit).
   */
  static async updateGoal(req: Request, res: Response): Promise<void> {
    const body = updateGoalSchema.parse(req.body);
    if (Object.keys(body).length === 0) {
      throw new AppError('Provide status and/or notes to update.', 422);
    }

    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: { episode: { select: { patientId: true, organizationId: true } } },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertCarePlanAccess(req, plan.episode);

    const goal = await prisma.goal.findFirst({
      where: { id: req.params.goalId, carePlanId: plan.id },
    });
    if (!goal) throw new AppError('Goal not found.', 404);

    const nextStatus = body.status ?? goal.status;
    const data: {
      status?: typeof nextStatus;
      notes?: string | null;
      achievedAt?: Date | null;
    } = {};

    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'achieved') {
        data.achievedAt = goal.achievedAt ?? new Date();
      } else if (goal.status === 'achieved') {
        data.achievedAt = null;
      }
    }
    if (body.notes !== undefined) {
      data.notes = body.notes;
    }

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'goal_progress_updated',
      entity: 'Goal',
      entityId: goal.id,
      before: { status: goal.status, achievedAt: goal.achievedAt, notes: goal.notes },
      after: { status: updated.status, achievedAt: updated.achievedAt, notes: updated.notes },
      metadata: { carePlanId: plan.id },
      req,
    });

    res.json({ goal: updated });
  }

  /**
   * POST /care-plans/:id/cosign — optional clinical co-sign (M3-3.4).
   * Records approval log; does not change plan status (family approval still required for activation).
   */
  static async clinicalCosign(req: Request, res: Response): Promise<void> {
    const { notes } = cosignSchema.parse(req.body ?? {});

    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: {
        episode: { select: { patientId: true, organizationId: true } },
        approvalLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    assertTenantOrgAccess(req, plan.episode.organizationId);

    if (!plan.isCurrentVersion) {
      throw new AppError('Only the current care plan version can be co-signed.', 422);
    }
    if (!COSIGN_ALLOWED_STATUSES.includes(plan.status)) {
      throw new AppError(
        `Cannot co-sign a care plan with status "${plan.status}". ` +
          'Plan must be submitted for approval, approved, or active.',
        422,
      );
    }

    const existing = plan.approvalLogs.find(
      (log) => log.action === 'clinical_cosign' && log.actorId === req.user!.userId,
    );
    if (existing) {
      res.json({
        message: 'Already co-signed.',
        approvalLog: existing,
        data: plan,
      });
      return;
    }

    const approvalLog = await prisma.carePlanApprovalLog.create({
      data: {
        carePlanId: plan.id,
        action: 'clinical_cosign',
        actorId: req.user!.userId,
        notes: notes ?? null,
      },
    });

    await NotificationService.create({
      userId: plan.coordinatorId,
      title: 'Care Plan Clinically Co-signed',
      body: notes?.trim() || 'A clinical staff member has co-signed the care plan.',
      type: 'care_plan_cosign',
      data: { carePlanId: plan.id, approvalLogId: approvalLog.id },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_plan_clinical_cosign',
      entity: 'CarePlan',
      entityId: plan.id,
      after: { approvalLogId: approvalLog.id, notes: notes ?? null },
      req,
    });

    const refreshed = await prisma.carePlan.findUnique({
      where: { id: plan.id },
      include: {
        goals: true,
        items: true,
        approvalLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.status(201).json({
      message: 'Care plan co-signed.',
      approvalLog,
      data: refreshed,
    });
  }
}
