import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireProvider } from '../middleware/rbac';
import { DashboardAggregationService } from '../services/DashboardAggregationService';

const router = Router();
router.use(authenticate, requireProvider);

// GET /api/provider-dashboard — full dashboard stats
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await DashboardAggregationService.getProviderStats(req.user!.userId);
    res.json({ success: true, dashboard: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/provider-dashboard/earnings — earnings breakdown by month
router.get('/earnings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const months = Number(req.query.months) || 6;
    const providerId = req.user!.userId;
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const agg = await prisma.payment.aggregate({
        where: { userId: providerId, status: 'paid', createdAt: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      });

      results.push({
        month: start.toISOString().substring(0, 7),
        earnings: agg._sum.amount ?? 0,
        bookings: agg._count,
      });
    }

    res.json({ success: true, earnings: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/provider-dashboard/schedule — upcoming bookings in calendar view
router.get('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providerId = req.user!.userId;
    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to ? new Date(req.query.to as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: { providerId, scheduledAt: { gte: from, lte: to }, status: { in: ['accepted', 'in_progress', 'pending'] } },
      include: { client: { select: { id: true, name: true, avatar: true, phone: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ success: true, schedule: bookings });
  } catch (err) {
    next(err);
  }
});

// GET /api/provider-dashboard/history — paginated booking history
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providerId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = { providerId };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, avatar: true } },
          payment: { select: { amount: true, currency: true, status: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ success: true, bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

export default router;
