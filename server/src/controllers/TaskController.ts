import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

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

const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];

export class TaskController {
  // GET /tasks
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status, assignee, page = '1', limit = '20' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where: Record<string, unknown> = {};
      if (assignee === 'me') where.assigneeId = userId;
      else if (assignee === 'created') where.assignerId = userId;
      else where.OR = [{ assigneeId: userId }, { assignerId: userId }];
      if (status) where.status = status;

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            assigner: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
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

  // PUT /tasks/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) throw new AppError('Task not found', 404);
      if (task.assignerId !== req.user!.userId && task.assigneeId !== req.user!.userId && req.user!.role !== 'admin') {
        throw new AppError('Forbidden', 403);
      }

      const { title, description, dueAt, status, estimatedDuration, completionEvidence } = req.body;
      const updated = await prisma.task.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(dueAt && { dueAt: new Date(dueAt) }),
          ...(status && { status }),
          ...(estimatedDuration && { estimatedDuration }),
          ...(completionEvidence && { completionEvidence }),
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
      if (task.assignerId !== req.user!.userId && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);
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
      if (task.assigneeId !== req.user!.userId && task.assignerId !== req.user!.userId && req.user!.role !== 'admin') {
        throw new AppError('Forbidden', 403);
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
}

export default new TaskController();
