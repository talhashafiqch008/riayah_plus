import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ClientReportController {
  // GET /api/client/report — activity, hours, spend summary for a client
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user!.userId;
      const months = Number(req.query.months) || 3;
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const [bookings, payments, episodes, activeEpisodes] = await Promise.all([
        prisma.booking.findMany({
          where: { clientId, createdAt: { gte: since } },
          select: { id: true, status: true, scheduledAt: true, durationHours: true, serviceType: true, totalAmount: true },
        }),
        prisma.payment.aggregate({
          where: { userId: clientId, status: 'paid', createdAt: { gte: since } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.careEpisode.count({ where: { patientId: clientId, createdAt: { gte: since } } }),
        prisma.careEpisode.count({ where: { patientId: clientId, status: 'active' } }),
      ]);

      const completedBookings = bookings.filter(b => b.status === 'completed');
      const totalHours = completedBookings.reduce((sum, b) => sum + (b.durationHours ? Number(b.durationHours) : 0), 0);

      // Service type breakdown
      const byServiceType: Record<string, number> = {};
      completedBookings.forEach(b => {
        const st = b.serviceType ?? 'other';
        byServiceType[st] = (byServiceType[st] ?? 0) + 1;
      });

      const report = {
        period: { months, since: since.toISOString() },
        bookings: {
          total: bookings.length,
          completed: completedBookings.length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length,
          totalHoursOfCare: Math.round(totalHours * 10) / 10,
          byServiceType,
        },
        financial: {
          totalSpend: payments._sum.amount ?? 0,
          totalTransactions: payments._count,
        },
        episodes: {
          openedThisPeriod: episodes,
          currentlyActive: activeEpisodes,
        },
      };

      res.json({ success: true, report });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/client/report/provider/:providerId — detailed report for a specific provider
  static async byProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user!.userId;
      const { providerId } = req.params;

      const bookings = await prisma.booking.findMany({
        where: { clientId, providerId },
        include: { provider: { select: { id: true, name: true, avatar: true } }, review: true },
        orderBy: { scheduledAt: 'desc' },
      });

      const completed = bookings.filter(b => b.status === 'completed');
      const totalHours = completed.reduce((sum, b) => sum + (b.durationHours ? Number(b.durationHours) : 0), 0);
      const review = bookings.find(b => b.review)?.review ?? null;

      res.json({
        success: true,
        provider: bookings[0]?.provider ?? null,
        stats: { totalBookings: bookings.length, completedBookings: completed.length, totalHours: Math.round(totalHours * 10) / 10 },
        review,
        recentBookings: bookings.slice(0, 5),
      });
    } catch (err) {
      next(err);
    }
  }
}
