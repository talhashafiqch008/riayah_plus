import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class CareSummaryController {
  // GET /care-summary
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const [episodes, upcomingBookings, activeCareNeeds, recentReviews] = await Promise.all([
        prisma.careEpisode.findMany({
          where: { patientId: userId, status: { in: ['active', 'on_hold'] } },
          include: { carePlans: { where: { isCurrentVersion: true }, take: 1 } },
          take: 5,
        }),
        prisma.booking.findMany({
          where: {
            clientId: userId,
            status: { in: ['accepted', 'pending'] },
            scheduledAt: { gte: new Date() },
          },
          include: { provider: { select: { id: true, name: true, role: true } } },
          take: 5,
          orderBy: { scheduledAt: 'asc' },
        }),
        prisma.careNeed.findMany({
          where: { clientId: userId, status: { in: ['open', 'in_progress'] } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.findMany({
          where: { clientId: userId },
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { provider: { select: { name: true, role: true } } },
        }),
      ]);

      res.json({ data: { episodes, upcomingBookings, activeCareNeeds, recentReviews } });
    } catch (err) {
      next(err);
    }
  }

  // GET /care-budget
  async getBudget(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { month } = req.query as Record<string, string>;
      const now = new Date();
      const start = month ? new Date(month + '-01') : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

      const [spent, wallet, activeCareNeeds] = await Promise.all([
        prisma.payment.aggregate({
          where: { userId, status: 'paid', createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.walletBalance.findUnique({ where: { userId } }),
        prisma.careNeed.findMany({ where: { clientId: userId, status: 'open' } }),
      ]);

      const totalBudgeted = activeCareNeeds.reduce((acc, cn) => acc + Number(cn.budget ?? 0), 0);

      res.json({
        data: {
          period: { from: start, to: end },
          spent: Number(spent._sum.amount ?? 0),
          walletBalance: wallet ? Number(wallet.balance) : 0,
          totalBudgeted,
          currency: 'QAR',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /care-timeline
  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { limit: limitRaw = '20' } = req.query as Record<string, string>;
      const limit = Math.min(Math.max(Number(limitRaw) || 20, 1), 200);

      const [bookings, episodes, notes] = await Promise.all([
        prisma.booking.findMany({
          where: { clientId: userId },
          orderBy: { scheduledAt: 'desc' },
          take: limit,
          select: {
            id: true, status: true, scheduledAt: true, serviceType: true,
            provider: { select: { name: true } },
          },
        }),
        prisma.careEpisode.findMany({
          where: { patientId: userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, status: true, createdAt: true },
        }),
        prisma.clinicalNote.findMany({
          where: { episode: { patientId: userId }, isPrivate: false },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true, content: true, noteType: true, createdAt: true,
            author: { select: { name: true, role: true } },
          },
        }),
      ]);

      const timeline = [
        ...bookings.map((b) => ({ type: 'booking', date: b.scheduledAt, data: b })),
        ...episodes.map((e) => ({ type: 'episode', date: e.createdAt, data: e })),
        ...notes.map((n) => ({ type: 'note', date: n.createdAt, data: n })),
      ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, limit);

      res.json({ data: timeline });
    } catch (err) {
      next(err);
    }
  }
}

export default new CareSummaryController();
