import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

async function loadOwnShiftOrThrow(req: Request, shiftId: string) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new AppError('Shift not found.', 404);
  const isAdmin = ['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role);
  if (shift.workerId !== req.user!.userId && !isAdmin) {
    throw new AppError('Forbidden.', 403);
  }
  return shift;
}

router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = z.object({ bookingId: z.string().optional() }).parse(req.body ?? {});

    const existing = await prisma.shift.findFirst({
      where: { workerId: req.user!.userId, status: { in: ['active', 'on_break'] } },
    });
    if (existing) {
      res.status(200).json({ message: 'Shift already active.', data: existing });
      return;
    }

    const shift = await prisma.shift.create({
      data: { workerId: req.user!.userId, bookingId, status: 'active', startedAt: new Date() },
    });
    res.status(201).json({ data: shift });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await loadOwnShiftOrThrow(req, req.params.id);
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: { status: 'completed', endedAt: new Date() },
    });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { workerId: req.user!.userId, status: { in: ['active', 'on_break'] } },
      include: { tasks: true },
    });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { workerId: req.user!.userId },
      include: { tasks: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    res.json({ data: shifts });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/break/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await loadOwnShiftOrThrow(req, req.params.id);
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: { status: 'on_break', breakStartAt: new Date() },
    });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/break/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await loadOwnShiftOrThrow(req, req.params.id);
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: { status: 'active', breakEndAt: new Date() },
    });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

// Legacy nested task helpers under /shifts (prefer /api/tasks)
router.get('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
});

router.post('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z
      .object({
        title: z.string(),
        assigneeId: z.string(),
        description: z.string().optional(),
        shiftId: z.string().optional(),
        dueAt: z.string().optional(),
      })
      .parse(req.body);
    const task = await prisma.task.create({
      data: {
        ...data,
        assignerId: req.user!.userId,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      },
    });
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Task not found.', 404);
    if (
      existing.assigneeId !== req.user!.userId &&
      existing.assignerId !== req.user!.userId &&
      !['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role)
    ) {
      throw new AppError('Forbidden.', 403);
    }

    const body = z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        completionEvidence: z.string().url().optional(),
        shiftId: z.string().optional(),
      })
      .parse(req.body);

    const data: Record<string, unknown> = { ...body };
    if (body.status === 'completed') {
      data.completedAt = new Date();
    }

    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Task not found.', 404);
    if (
      existing.assignerId !== req.user!.userId &&
      !['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role)
    ) {
      throw new AppError('Forbidden.', 403);
    }
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
