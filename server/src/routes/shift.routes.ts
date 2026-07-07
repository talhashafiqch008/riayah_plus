import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.post('/start', async (req: Request, res: Response) => {
  const { bookingId } = z.object({ bookingId: z.string().optional() }).parse(req.body);
  const shift = await prisma.shift.create({
    data: { workerId: req.user!.userId, bookingId, status: 'active', startedAt: new Date() },
  });
  res.status(201).json({ data: shift });
});

router.post('/:id/end', async (req: Request, res: Response) => {
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: { status: 'completed', endedAt: new Date() },
  });
  res.json({ data: shift });
});

router.get('/active', async (req: Request, res: Response) => {
  const shift = await prisma.shift.findFirst({
    where: { workerId: req.user!.userId, status: 'active' },
    include: { tasks: true },
  });
  res.json({ data: shift });
});

router.get('/history', async (req: Request, res: Response) => {
  const shifts = await prisma.shift.findMany({
    where: { workerId: req.user!.userId },
    include: { tasks: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  res.json({ data: shifts });
});

router.post('/:id/break/start', async (req: Request, res: Response) => {
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: { status: 'on_break', breakStartAt: new Date() },
  });
  res.json({ data: shift });
});

router.post('/:id/break/end', async (req: Request, res: Response) => {
  const shift = await prisma.shift.update({
    where: { id: req.params.id },
    data: { status: 'active', breakEndAt: new Date() },
  });
  res.json({ data: shift });
});

// Tasks
router.get('/tasks', async (req: Request, res: Response) => {
  const tasks = await prisma.task.findMany({ where: { assigneeId: req.user!.userId } });
  res.json({ data: tasks });
});

router.post('/tasks', async (req: Request, res: Response) => {
  const data = z.object({ title: z.string(), assigneeId: z.string(), description: z.string().optional(), shiftId: z.string().optional(), dueAt: z.string().optional() }).parse(req.body);
  const task = await prisma.task.create({
    data: { ...data, assignerId: req.user!.userId, dueAt: data.dueAt ? new Date(data.dueAt) : undefined },
  });
  res.status(201).json({ data: task });
});

router.patch('/tasks/:id', async (req: Request, res: Response) => {
  const task = await prisma.task.update({ where: { id: req.params.id }, data: req.body });
  res.json({ data: task });
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: 'Task deleted.' });
});

export default router;
