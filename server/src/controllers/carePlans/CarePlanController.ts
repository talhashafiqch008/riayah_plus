import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';

const goalSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  measurement: z.string().optional(),
});

const itemSchema = z.object({
  serviceType: z.string(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  unitCost: z.number().optional(),
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

export class CarePlanController {
  static async index(req: Request, res: Response): Promise<void> {
    const { episodeId } = req.query as { episodeId?: string };
    const where: Record<string, unknown> = {};
    if (episodeId) where.episodeId = episodeId;

    const plans = await prisma.carePlan.findMany({
      where,
      include: { goals: true, items: true },
      orderBy: { version: 'desc' },
    });
    res.json({ data: plans });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const data = createPlanSchema.parse(req.body);

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
      include: { goals: true, items: true, approvalLogs: true },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);
    res.json({ data: plan });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw new AppError('Care plan not found.', 404);

    const { title, notes, goals, items } = req.body;

    // Mark current version as not-current, create new version
    await prisma.carePlan.update({ where: { id: plan.id }, data: { isCurrentVersion: false } });

    const newPlan = await prisma.carePlan.create({
      data: {
        episodeId: plan.episodeId,
        coordinatorId: req.user!.userId,
        title: title ?? plan.title,
        notes: notes ?? plan.notes,
        status: 'draft',
        version: plan.version + 1,
        isCurrentVersion: true,
        goals: goals
          ? { create: goals.map((g: Record<string, unknown>) => ({ ...g, userId: req.user!.userId })) }
          : undefined,
        items: items ? { create: items } : undefined,
      },
      include: { goals: true, items: true },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'care_plan_updated',
      entity: 'CarePlan',
      entityId: newPlan.id,
      before: plan,
      after: newPlan,
      req,
    });

    res.json({ data: newPlan });
  }

  static async submitForApproval(req: Request, res: Response): Promise<void> {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: { episode: true },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);

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
      include: { episode: true },
    });
    if (!plan) throw new AppError('Care plan not found.', 404);

    await prisma.carePlan.update({
      where: { id: plan.id },
      data: { status: 'approved', approvedAt: new Date(), approvedById: req.user!.userId },
    });

    await prisma.carePlanApprovalLog.create({
      data: { carePlanId: plan.id, action: 'approved', actorId: req.user!.userId },
    });

    await prisma.careEpisode.update({
      where: { id: plan.episodeId },
      data: { status: 'active' },
    });

    await AuditService.log({ userId: req.user!.userId, action: 'care_plan_approved', entity: 'CarePlan', entityId: plan.id, req });
    res.json({ message: 'Care plan approved.' });
  }

  static async requestRevision(req: Request, res: Response): Promise<void> {
    const { notes } = z.object({ notes: z.string() }).parse(req.body);
    const plan = await prisma.carePlan.findUnique({ where: { id: req.params.id }, include: { episode: true } });
    if (!plan) throw new AppError('Care plan not found.', 404);

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
    await prisma.carePlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Care plan deleted.' });
  }
}
