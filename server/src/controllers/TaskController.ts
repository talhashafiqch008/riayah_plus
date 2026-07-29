import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { AuditService } from '../services/AuditService';

const createTaskSchema = z.object({
  assigneeId: z.string(),
  shiftId: z.string().optional(),
  careEpisodeId: z.string().optional(),
  goalId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  estimatedDuration: z.number().int().positive().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  status: z.string().optional(),
  estimatedDuration: z.number().int().positive().nullable().optional(),
  completionEvidence: z.string().url().nullable().optional(),
  assigneeId: z.string().optional(),
});

const assignEpisodeSchema = z.object({
  episodeId: z.string().min(1),
  assigneeId: z.string().min(1),
  statuses: z.array(z.string()).optional().default(['pending', 'in_progress']),
});

const completeSchema = z.object({
  completionEvidence: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
  actualDuration: z.number().int().positive().optional(),
});

const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];

const COORD_ROLES = ['care_coordinator', 'admin', 'super_admin', 'support_admin'];

function canManageTask(req: Request, task: { assignerId: string; assigneeId: string }): boolean {
  const { userId, role } = req.user!;
  if (COORD_ROLES.includes(role)) return true;
  return task.assignerId === userId || task.assigneeId === userId;
}

export class TaskController {
  // GET /tasks
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { status, assignee, episodeId, page = '1', limit = '20' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where: Record<string, unknown> = {};

      // Support workers default to their assigned tasks (M3-4.5)
      if (role === 'support_worker' || assignee === 'me') {
        where.assigneeId = userId;
      } else if (assignee === 'created') {
        where.assignerId = userId;
      } else if (COORD_ROLES.includes(role) && episodeId) {
        where.careEpisodeId = episodeId;
      } else if (!COORD_ROLES.includes(role)) {
        where.OR = [{ assigneeId: userId }, { assignerId: userId }];
      }
      // coordinators without filters see all they created or org tasks via assignee/created query

      if (status) where.status = status;
      if (episodeId && !where.careEpisodeId) where.careEpisodeId = episodeId;

      // Coordinator default: tasks they assigned OR in their tenant episodes
      if (COORD_ROLES.includes(role) && !assignee && !episodeId) {
        where.OR = [{ assignerId: userId }, { assigneeId: userId }];
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            assigner: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, role: true } },
            goal: { select: { id: true, title: true, status: true } },
          },
          orderBy: { dueAt: 'asc' },
        }),
        prisma.task.count({ where }),
      ]);
      res.json({ data: tasks, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /tasks
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createTaskSchema.parse(req.body);
      const task = await prisma.task.create({
        data: {
          ...parsed,
          assignerId: req.user!.userId,
          dueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
        },
        include: {
          assigner: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      });
      res.status(201).json({ data: task });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /tasks/assign-episode — bulk-assign pending episode tasks to a support worker (M3-4.5)
   */
  async assignEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!COORD_ROLES.includes(req.user!.role)) {
        throw new AppError('Only care coordinators can bulk-assign episode tasks.', 403);
      }
      const body = assignEpisodeSchema.parse(req.body);

      const episode = await prisma.careEpisode.findUnique({
        where: { id: body.episodeId },
        select: { id: true, organizationId: true },
      });
      if (!episode) throw new AppError('Care episode not found.', 404);

      const assignee = await prisma.user.findFirst({
        where: { id: body.assigneeId, deletedAt: null, isActive: true },
        select: { id: true, name: true, role: true },
      });
      if (!assignee) throw new AppError('Assignee not found.', 404);

      const result = await prisma.task.updateMany({
        where: {
          careEpisodeId: body.episodeId,
          status: { in: body.statuses },
        },
        data: { assigneeId: body.assigneeId },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'tasks_episode_assigned',
        entity: 'CareEpisode',
        entityId: body.episodeId,
        after: { assigneeId: body.assigneeId, updated: result.count },
        req,
      });

      const tasks = await prisma.task.findMany({
        where: { careEpisodeId: body.episodeId, assigneeId: body.assigneeId },
        orderBy: { createdAt: 'asc' },
      });

      res.json({
        message: `Assigned ${result.count} task(s) to ${assignee.name}.`,
        updated: result.count,
        assignee,
        data: tasks,
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /tasks/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw new AppError('Task not found', 404);
      if (!canManageTask(req, task)) {
        throw new AppError('Forbidden', 403);
      }

      const parsed = updateTaskSchema.parse(req.body);

      // Only coordinator/assigner can reassign
      if (parsed.assigneeId && parsed.assigneeId !== task.assigneeId) {
        if (!COORD_ROLES.includes(req.user!.role) && task.assignerId !== req.user!.userId) {
          throw new AppError('Only the assigner or coordinator can reassign tasks.', 403);
        }
      }

      const updated = await prisma.task.update({
        where: { id },
        data: {
          ...(parsed.title && { title: parsed.title }),
          ...(parsed.description !== undefined && { description: parsed.description }),
          ...(parsed.dueAt !== undefined && {
            dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
          }),
          ...(parsed.status && { status: parsed.status }),
          ...(parsed.estimatedDuration !== undefined && { estimatedDuration: parsed.estimatedDuration }),
          ...(parsed.completionEvidence !== undefined && { completionEvidence: parsed.completionEvidence }),
          ...(parsed.assigneeId && { assigneeId: parsed.assigneeId }),
        },
        include: {
          assignee: { select: { id: true, name: true, role: true } },
        },
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /tasks/:id
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw new AppError('Task not found', 404);
      if (task.assignerId !== req.user!.userId && !COORD_ROLES.includes(req.user!.role)) {
        throw new AppError('Forbidden', 403);
      }
      await prisma.task.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /tasks/:id/status
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, actualDuration, completionEvidence } = req.body;
      if (!validStatuses.includes(status)) throw new AppError(`status must be one of: ${validStatuses.join(', ')}`, 400);

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw new AppError('Task not found', 404);
      if (!canManageTask(req, task)) {
        throw new AppError('Forbidden', 403);
      }

      if (completionEvidence !== undefined && completionEvidence !== null) {
        const ok = z.string().url().safeParse(completionEvidence);
        if (!ok.success) throw new AppError('completionEvidence must be a URL.', 422);
      }

      const data: Record<string, unknown> = { status };
      if (status === 'completed') {
        data.completedAt = new Date();
        if (actualDuration) data.actualDuration = actualDuration;
        if (completionEvidence) data.completionEvidence = completionEvidence;
      }

      const updated = await prisma.task.update({ where: { id }, data });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  /** POST /tasks/:id/complete — complete with optional evidence URL (M3-4.4) */
  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const body = completeSchema.parse(req.body ?? {});
      const task = await prisma.task.findUnique({ where: { id: req.params.id } });
      if (!task) throw new AppError('Task not found', 404);
      if (task.assigneeId !== req.user!.userId && !COORD_ROLES.includes(req.user!.role)) {
        throw new AppError('Only the assignee can complete this task.', 403);
      }
      if (task.status === 'completed') {
        res.json({ message: 'Already completed.', data: task });
        return;
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          ...(body.completionEvidence ? { completionEvidence: body.completionEvidence } : {}),
          ...(body.actualDuration ? { actualDuration: body.actualDuration } : {}),
          ...(body.notes
            ? {
                description: task.description
                  ? `${task.description}\n\n[Completion] ${body.notes}`
                  : `[Completion] ${body.notes}`,
              }
            : {}),
        },
      });

      await AuditService.log({
        userId: req.user!.userId,
        action: 'task_completed',
        entity: 'Task',
        entityId: task.id,
        after: { completionEvidence: updated.completionEvidence },
        req,
      });

      res.json({ message: 'Task completed.', data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export default new TaskController();
