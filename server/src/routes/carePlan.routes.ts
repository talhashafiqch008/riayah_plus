import { Router, Request, Response, NextFunction } from 'express';
import { CarePlanController, assertPlanAllowsInPlaceMutation } from '../controllers/carePlans/CarePlanController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator, requireClinicalOrCoordinator, requireRole } from '../middleware/rbac';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { assertTenantOrgAccess } from '../middleware/tenantAccess';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const FAMILY_ROLES = ['client', 'consumer', 'family', 'patient'];

async function requirePlanAccess(req: Request, planId: string) {
  const plan = await prisma.carePlan.findUnique({
    where: { id: planId },
    include: {
      episode: {
        select: {
          organizationId: true,
          patientId: true,
          careUnit: { select: { familyUserId: true } },
        },
      },
    },
  });
  if (!plan) throw new AppError('Care plan not found.', 404);

  if (FAMILY_ROLES.includes(req.user!.role)) {
    const owns =
      plan.episode.patientId === req.user!.userId ||
      plan.episode.careUnit?.familyUserId === req.user!.userId;
    if (!owns) {
      throw new AppError('Forbidden.', 403);
    }
  } else {
    assertTenantOrgAccess(req, plan.episode.organizationId);
  }
  return plan;
}

router.get('/', CarePlanController.index);
router.post('/', requireCareCoordinator, CarePlanController.store);
router.get('/:id', CarePlanController.show);
router.patch('/:id', requireCareCoordinator, CarePlanController.update);
router.delete('/:id', requireCareCoordinator, CarePlanController.destroy);
router.post('/:id/submit', requireCareCoordinator, CarePlanController.submitForApproval);
router.post('/:id/approve', CarePlanController.approve);
router.post('/:id/request-revision', CarePlanController.requestRevision);
router.post('/:id/reject', CarePlanController.reject);
router.post(
  '/:id/cosign',
  requireRole([
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
    'support_admin',
  ]),
  CarePlanController.clinicalCosign,
);

// Goal progress (M3-3.3) — status updates do not trigger CP8 re-approval
router.get('/:id/goals', CarePlanController.listGoals);
router.patch('/:id/goals/:goalId', requireClinicalOrCoordinator, CarePlanController.updateGoal);

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
    await requirePlanAccess(req, req.params.id);

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
    const plan = await requirePlanAccess(req, req.params.id);
    assertPlanAllowsInPlaceMutation(plan.status);

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
    const plan = await requirePlanAccess(req, req.params.id);
    assertPlanAllowsInPlaceMutation(plan.status);

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
    const plan = await requirePlanAccess(req, req.params.id);
    assertPlanAllowsInPlaceMutation(plan.status);

    const item = await prisma.carePlanItem.findFirst({
      where: { id: req.params.itemId, carePlanId: req.params.id },
    });
    if (!item) throw new AppError('Item not found.', 404);

    await prisma.carePlanItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item removed.' });
  } catch (err) { next(err); }
});

export default router;
