import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { BookingPaymentController } from '../controllers/payments/BookingPaymentController';
import { PaymentMethodController } from '../controllers/payments/PaymentMethodController';
import { prisma } from '../config/database';

const router = Router();

// Payment history — paginated list of payments for the authenticated user
router.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          booking: { select: { id: true, serviceType: true, scheduledAt: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// Payment methods
router.get('/methods', authenticate, PaymentMethodController.list);
router.post('/methods/setup-intent', authenticate, PaymentMethodController.createSetupIntent);
router.post('/methods', authenticate, PaymentMethodController.attach);
router.delete('/methods/:paymentMethodId', authenticate, PaymentMethodController.detach);
router.patch('/methods/:paymentMethodId/default', authenticate, PaymentMethodController.setDefault);

export default router;
