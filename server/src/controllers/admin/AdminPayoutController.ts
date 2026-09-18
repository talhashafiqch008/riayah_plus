import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

export class AdminPayoutController {
  // GET /admin/payouts/:id
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payout = await prisma.payoutRequest.findUnique({
        where: { id },
        include: { provider: { select: { id: true, name: true, email: true } } },
      });
      if (!payout) throw new AppError('Payout not found', 404);
      res.json({ data: payout });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/payouts/:id/confirm-reconciliation
  async confirmReconciliation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { referenceId, notes } = req.body;

      const payout = await prisma.payoutRequest.findUnique({ where: { id } });
      if (!payout) throw new AppError('Payout not found', 404);
      if (payout.status !== 'processing') {
        throw new AppError('Only processing payouts can be reconciled', 400);
      }

      const updated = await prisma.payoutRequest.update({
        where: { id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          adminNotes: `${notes ?? ''} ref: ${referenceId ?? ''}`.trim(),
        },
      });
      res.json({ data: updated, message: 'Payout reconciled and marked completed' });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/payments/stats
  async getPaymentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query as Record<string, string>;
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      const createdAt = Object.keys(dateFilter).length ? dateFilter : undefined;

      const [totalPayments, totalRevenue, pendingPayouts, completedPayouts, failedPayments] = await Promise.all([
        prisma.payment.count({ where: createdAt ? { createdAt } : {} }),
        prisma.payment.aggregate({
          where: { status: 'paid', ...(createdAt ? { createdAt } : {}) },
          _sum: { amount: true },
        }),
        prisma.payoutRequest.count({ where: { status: 'pending' } }),
        prisma.payoutRequest.aggregate({
          where: { status: 'completed', ...(createdAt ? { createdAt } : {}) },
          _sum: { amount: true },
        }),
        prisma.payment.count({ where: { status: 'failed', ...(createdAt ? { createdAt } : {}) } }),
      ]);

      res.json({
        data: {
          totalPayments,
          totalRevenue: Number(totalRevenue._sum?.amount ?? 0),
          pendingPayouts,
          completedPayouts: Number(completedPayouts._sum.amount ?? 0),
          failedPayments,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/payments/:id
  async getPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          booking: true,
          invoice: true,
        },
      });
      if (!payment) throw new AppError('Payment not found', 404);
      res.json({ data: payment });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/payments/:id/mark-paid
  async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const payment = await prisma.payment.findUnique({ where: { id } });
      if (!payment) throw new AppError('Payment not found', 404);

      const updated = await prisma.payment.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date(), description: notes },
      });
      res.json({ data: updated, message: 'Payment marked as paid' });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/payment-audits
  async listPaymentAudits(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 50 });

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { entity: 'payment' },
          skip,
          take,
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.count({ where: { entity: 'payment' } }),
      ]);
      res.json({ data: logs, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/dashboard/revenue-breakdown
  async revenueBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { months = '6' } = req.query as Record<string, string>;
      const since = new Date();
      since.setMonth(since.getMonth() - parseInt(months));

      const payments = await prisma.payment.groupBy({
        by: ['createdAt'],
        where: { status: 'paid', createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
      });

      const byMonth: Record<string, { revenue: number; count: number }> = {};
      payments.forEach((p) => {
        const key = new Date(p.createdAt).toISOString().slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { revenue: 0, count: 0 };
        byMonth[key].revenue += Number(p._sum?.amount ?? 0);
        byMonth[key].count += Number(p._count);
      });

      res.json({ data: byMonth });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/dashboard/user-analytics
  async userAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const [totalUsers, newThisMonth, byRole, activeProviders] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(new Date().setDate(1)) },
            deletedAt: null,
          },
        }),
        prisma.user.groupBy({ by: ['role'], _count: true }),
        prisma.user.count({
          where: {
            role: { in: ['provider', 'doctor', 'nurse'] },
            updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            deletedAt: null,
          },
        }),
      ]);
      res.json({ data: { totalUsers, newThisMonth, byRole, activeProviders } });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminPayoutController();
