import { prisma } from '../config/database';
import { CacheInvalidationService } from './CacheInvalidationService';

export class DashboardAggregationService {
  // ── Admin Dashboard ───────────────────────────────────────────────────────

  static async getAdminStats() {
    const cacheKey = CacheInvalidationService.keys.dashboardAdmin();
    const cached = await CacheInvalidationService.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisMonth,
      activeBookings,
      completedBookingsThisMonth,
      activeEpisodes,
      pendingDocuments,
      pendingPayouts,
      overdueInvoices,
      totalRevenue,
      revenueThisMonth,
      openDisputes,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.count({ where: { status: { in: ['accepted', 'in_progress'] } } }),
      prisma.booking.count({ where: { status: 'completed', completedAt: { gte: thirtyDaysAgo } } }),
      prisma.careEpisode.count({ where: { status: 'active' } }),
      prisma.document.count({ where: { status: 'pending' } }),
      prisma.payoutRequest.count({ where: { status: 'pending' } }),
      prisma.invoice.count({ where: { status: 'overdue' } }),
      prisma.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'paid', createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      prisma.bookingDispute.count({ where: { status: { in: ['open', 'under_review'] } } }),
    ]);

    const stats = {
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      bookings: { active: activeBookings, completedThisMonth: completedBookingsThisMonth },
      episodes: { active: activeEpisodes },
      compliance: { pendingDocuments, openDisputes },
      financial: {
        pendingPayouts,
        overdueInvoices,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
      },
    };

    await CacheInvalidationService.set(cacheKey, stats, 120); // 2 min TTL
    return stats;
  }

  // ── Provider Dashboard ────────────────────────────────────────────────────

  static async getProviderStats(providerId: string) {
    const cacheKey = CacheInvalidationService.keys.dashboardProvider(providerId);
    const cached = await CacheInvalidationService.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      upcomingBookings,
      completedThisMonth,
      totalEarnings,
      earningsThisMonth,
      pendingBookings,
      activeShift,
      avgRating,
      reviewCount,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: { providerId, status: 'accepted', scheduledAt: { gte: new Date() } },
        include: { client: { select: { id: true, name: true, avatar: true } } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      prisma.booking.count({ where: { providerId, status: 'completed', completedAt: { gte: thirtyDaysAgo } } }),
      prisma.payment.aggregate({ where: { userId: providerId, status: 'paid' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { userId: providerId, status: 'paid', createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      prisma.booking.count({ where: { providerId, status: 'pending' } }),
      prisma.shift.findFirst({ where: { workerId: providerId, status: 'active' } }),
      prisma.review.aggregate({ where: { providerId }, _avg: { rating: true } }),
      prisma.review.count({ where: { providerId } }),
    ]);

    const walletBalance = await prisma.walletBalance.findUnique({ where: { userId: providerId } });

    const stats = {
      upcomingBookings,
      completedThisMonth,
      pendingBookings,
      earnings: {
        total: totalEarnings._sum.amount ?? 0,
        thisMonth: earningsThisMonth._sum.amount ?? 0,
        available: walletBalance?.balance ?? 0,
      },
      activeShift,
      rating: { average: avgRating._avg.rating ?? 0, count: reviewCount },
    };

    await CacheInvalidationService.set(cacheKey, stats, 60);
    return stats;
  }

  // ── Client Dashboard ──────────────────────────────────────────────────────

  static async getClientStats(clientId: string) {
    const cacheKey = CacheInvalidationService.keys.dashboardClient(clientId);
    const cached = await CacheInvalidationService.get(cacheKey);
    if (cached) return cached;

    const [
      upcomingBookings,
      activeEpisodes,
      pendingInvoices,
      walletBalance,
      unreadNotifications,
      recentBookings,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId, status: 'accepted', scheduledAt: { gte: new Date() } },
        include: { provider: { select: { id: true, name: true, avatar: true } } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      prisma.careEpisode.count({ where: { patientId: clientId, status: 'active' } }),
      prisma.invoice.count({ where: { clientId, status: { in: ['sent', 'overdue'] } } }),
      prisma.walletBalance.findUnique({ where: { userId: clientId } }),
      prisma.notification.count({ where: { userId: clientId, readAt: null } }),
      prisma.booking.findMany({
        where: { clientId },
        include: { provider: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const stats = {
      upcomingBookings,
      activeEpisodes,
      pendingInvoices,
      wallet: { balance: walletBalance?.balance ?? 0 },
      unreadNotifications,
      recentBookings,
    };

    await CacheInvalidationService.set(cacheKey, stats, 60);
    return stats;
  }

  // ── Revenue Breakdown (Admin) ─────────────────────────────────────────────

  static async getRevenueBreakdown(months = 6) {
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const agg = await prisma.payment.aggregate({
        where: { status: 'paid', createdAt: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      });

      results.push({
        month: start.toISOString().substring(0, 7),
        revenue: agg._sum.amount ?? 0,
        transactions: agg._count,
      });
    }
    return results;
  }
}
