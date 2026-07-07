import { Router, Request, Response, NextFunction } from 'express';
import { CarePlanController } from '../controllers/carePlans/CarePlanController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator } from '../middleware/rbac';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', CarePlanController.index);
router.post('/', requireCareCoordinator, CarePlanController.store);
router.get('/:id', CarePlanController.show);
router.patch('/:id', requireCareCoordinator, CarePlanController.update);
router.delete('/:id', requireCareCoordinator, CarePlanController.destroy);
router.post('/:id/submit', requireCareCoordinator, CarePlanController.submitForApproval);
router.post('/:id/approve', CarePlanController.approve);
router.post('/:id/request-revision', CarePlanController.requestRevision);

const itemSchema = z.object({
  serviceType: z.string(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  unitCost: z.number().positive().optional(),
  currency: z.string().default('QAR'),
  assignedRole: z.string().optional(),
  notes: z.string().optional(),
});

// GET /care-plans/:id/items
router.get('/:id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.carePlan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw new AppError('Care plan not found.', 404);

    const items = await prisma.carePlanItem.findMany({
      where: { carePlanId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ items });
  } catch (err) { next(err); }
});

// POST /care-plans/:id/items
router.post('/:id/items', requireCareCoordinator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.carePlan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw new AppError('Care plan not found.', 404);

    const data = itemSchema.parse(req.body);
    const item = await prisma.carePlanItem.create({
      data: { ...data, carePlanId: req.params.id },
    });
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

// PATCH /care-plans/:id/items/:itemId
router.patch('/:id/items/:itemId', requireCareCoordinator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = itemSchema.partial().parse(req.body);
    const item = await prisma.carePlanItem.findFirst({
      where: { id: req.params.itemId, carePlanId: req.params.id },
    });
    if (!item) throw new AppError('Item not found.', 404);

    const updated = await prisma.carePlanItem.update({ where: { id: req.params.itemId }, data });
    res.json({ item: updated });
  } catch (err) { next(err); }
});

// DELETE /care-plans/:id/items/:itemId
router.delete('/:id/items/:itemId', requireCareCoordinator, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.carePlanItem.findFirst({
      where: { id: req.params.itemId, carePlanId: req.params.id },
    });
    if (!item) throw new AppError('Item not found.', 404);

    await prisma.carePlanItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item removed.' });
  } catch (err) { next(err); }
});

export default router;
