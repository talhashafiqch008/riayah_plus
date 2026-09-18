import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import {
  requireApprove,
  requireCreate,
  requireDelete,
  requireEdit,
  requireView,
} from '../middleware/permissions';
import { adminLimiter } from '../middleware/rateLimiter';
import { AuditService } from '../services/AuditService';
import { AppError } from '../middleware/errorHandler';
import { ADMIN_USER_SELECT, pickAdminUserUpdate } from '../utils/sanitizeUser';
import { disconnectUserSockets } from '../services/RealtimeService';
import { recordLogoutAll } from '../middleware/auth';
import { AdvancedAdminController } from '../controllers/admin/AdvancedAdminController';
import adminDocController from '../controllers/admin/AdminDocumentController';
import adminPayoutController from '../controllers/admin/AdminPayoutController';
import adminProviderController from '../controllers/admin/AdminProviderController';
import { OrganizationController } from '../controllers/admin/OrganizationController';
import { AdminFamilyController } from '../controllers/admin/AdminFamilyController';
import { csvQuotedField } from '../utils/csvSafe';
import { parsePagination } from '../utils/pagination';
import { queryString } from '../utils/queryScalar';

const router = Router();
router.use(authenticate, requireAdmin, adminLimiter);

// Dashboard stats
router.get('/dashboard', requireView('user'), async (_req: Request, res: Response) => {
  const [users, bookings, activeEpisodes, pendingDocs, pendingPayouts, overdueInvoices] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.booking.count({ where: { status: { in: ['accepted', 'in_progress'] } } }),
      prisma.careEpisode.count({ where: { status: 'active' } }),
      prisma.document.count({ where: { status: 'pending' } }),
      prisma.payoutRequest.count({ where: { status: 'pending' } }),
      prisma.invoice.count({ where: { status: 'overdue' } }),
    ]);

  res.json({ users, bookings, activeEpisodes, pendingDocs, pendingPayouts, overdueInvoices });
});

// Users
router.get('/users', requireView('user'), async (req: Request, res: Response) => {
        const { page, limit, skip, take } = parsePagination(req.query);
      const role = queryString(req.query.role);
      const search = queryString(req.query.search);

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];

  // AUTH-04: project safe fields only — never return passwordHash / twoFactorSecret
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: ADMIN_USER_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, total });
});

router.get('/users/:id', requireView('user'), async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      ...ADMIN_USER_SELECT,
      providerProfile: true,
      clientProfile: true,
    },
  });
  res.json({ data: user });
});

router.patch('/users/:id', requireEdit('user'), async (req: Request, res: Response) => {
  // AUTH-04: Zod-style whitelist — reject credential / MFA mass-assignment
  const body = (req.body ?? {}) as Record<string, unknown>;
  const forbidden = [
    'passwordHash',
    'twoFactorSecret',
    'twoFactorEnabled',
    'role',
    'mustSetPassword',
    'deletedAt',
  ];
  const attempted = forbidden.filter((k) => body[k] !== undefined);
  if (attempted.length > 0) {
    throw new AppError(`Updating restricted fields is not allowed: ${attempted.join(', ')}`, 422);
  }

  const data = pickAdminUserUpdate(body);
  if (Object.keys(data).length === 0) {
    throw new AppError('No updatable fields provided.', 422);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: ADMIN_USER_SELECT,
  });
  // AUTH-05: if admin deactivated the account, tear down realtime + sessions watermark
  if (data.isActive === false) {
    await Promise.all([
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      recordLogoutAll(user.id),
    ]);
    disconnectUserSockets(user.id);
  }
  await AuditService.log({ userId: req.user!.userId, action: 'admin_user_updated', entity: 'User', entityId: user.id, req });
  res.json({ data: user });
});

// Bookings
router.get('/bookings', requireView('booking'), async (req: Request, res: Response) => {
  const { skip, take } = parsePagination(req.query);
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ include: { client: { select: { id: true, name: true } }, provider: { select: { id: true, name: true } } }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.booking.count(),
  ]);
  res.json({ data: bookings, total });
});

// Payments
router.get('/payments', requireView('booking'), async (req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({ include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data: payments });
});

// Payouts
router.get('/payouts', requireView('booking'), async (req: Request, res: Response) => {
  const payouts = await prisma.payoutRequest.findMany({ include: { provider: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ data: payouts });
});

router.patch('/payouts/:id/approve', requireApprove('booking'), async (req: Request, res: Response) => {
  const payout = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'approved', processedAt: new Date() } });
  await AuditService.log({ userId: req.user!.userId, action: 'payout_approved', entity: 'PayoutRequest', entityId: payout.id, req });
  res.json({ data: payout });
});

router.patch('/payouts/:id/reject', requireApprove('booking'), async (req: Request, res: Response) => {
  const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);
  const payout = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'rejected', adminNotes: notes } });
  res.json({ data: payout });
});

// Documents
router.get('/documents', requireView('document'), async (req: Request, res: Response) => {
  const status = queryString(req.query.status);
  const docs = await prisma.document.findMany({
    where: status ? { status: status as 'pending' | 'approved' | 'rejected' | 'expired' } : {},
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data: docs });
});

// Audit logs
router.get('/audit-logs', requireView('user'), async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 50 });
  const data = await AuditService.getAll({
    entity: queryString(req.query.entity),
    action: queryString(req.query.action),
    userId: queryString(req.query.userId),
    from: queryString(req.query.from),
    to: queryString(req.query.to),
    page,
    limit,
  });
  res.json(data);
});

router.get('/audit-logs/export', requireView('user'), async (req: Request, res: Response) => {
  const { logs } = await AuditService.getAll({
    entity: queryString(req.query.entity),
    action: queryString(req.query.action),
    userId: queryString(req.query.userId),
    from: queryString(req.query.from),
    to: queryString(req.query.to),
    page: 1,
    limit: 10000,
    maxTake: 10000,
  });

  // INJ-01/03: formula-encode every cell before quoting
  const header = 'id,userId,action,entity,entityId,ipAddress,createdAt\n';
  const rows = logs.map((log) =>
    [
      log.id,
      log.userId ?? '',
      log.action,
      log.entity ?? '',
      log.entityId ?? '',
      log.ipAddress ?? '',
      log.createdAt.toISOString(),
    ]
      .map((v) => csvQuotedField(v))
      .join(','),
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
  res.send(header + rows.join('\n'));
});

// Settings
router.get('/settings', requireView('organization'), async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany();
  const obj: Record<string, string> = {};
  settings.forEach((s) => { obj[s.key] = s.value; });
  res.json({ data: obj });
});

router.put('/settings', requireEdit('organization'), async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
  res.json({ message: 'Settings updated.' });
});

// Reporting
router.get('/reports/care-outcomes', requireView('care_episode'), async (_req: Request, res: Response) => {
  const [active, closed, achieved] = await Promise.all([
    prisma.careEpisode.count({ where: { status: 'active' } }),
    prisma.careEpisode.count({ where: { status: 'closed' } }),
    prisma.goal.count({ where: { status: 'achieved' } }),
  ]);
  res.json({ activeEpisodes: active, closedEpisodes: closed, achievedGoals: achieved });
});

router.get('/reports/financial', requireView('booking'), async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const [totalInvoiced, totalCollected, outstanding] = await Promise.all([
    prisma.invoice.aggregate({ where, _sum: { total: true } }),
    prisma.payment.aggregate({ where: { ...where, status: 'paid' }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { ...where, status: { in: ['sent', 'overdue'] } }, _sum: { total: true } }),
  ]);

  res.json({
    totalInvoiced: totalInvoiced._sum.total ?? 0,
    totalCollected: totalCollected._sum.amount ?? 0,
    outstanding: outstanding._sum.total ?? 0,
  });
});

// GPS compliance
router.get('/reports/gps-compliance', requireView('booking'), async (_req: Request, res: Response) => {
  const [total, outOfRadius, totalCheckouts] = await Promise.all([
    prisma.gpsLog.count({ where: { eventType: 'checkin' } }),
    prisma.gpsLog.count({ where: { eventType: 'checkin', geofenced: false } }),
    prisma.gpsLog.count({ where: { eventType: 'checkout' } }),
  ]);
  res.json({
    totalCheckins: total,
    totalCheckouts,
    outOfRadius,
    complianceRate: total > 0 ? ((total - outOfRadius) / total * 100).toFixed(2) : 100,
  });
});

// ── Advanced admin routes ──────────────────────────────────────────────────────
router.get('/dashboard/full', requireView('user'), AdvancedAdminController.dashboard);

// Verification queue
router.get('/verification-queue', requireView('user'), AdvancedAdminController.verificationQueue);
router.patch('/users/:userId/verify', requireApprove('user'), AdvancedAdminController.verifyUser);

// Credit adjustments
router.post('/users/:userId/credit-adjustment', requireEdit('booking'), AdvancedAdminController.creditAdjustment);

// Service catalogue
router.get('/services', requireView('organization'), AdvancedAdminController.listServices);
router.post('/services', requireCreate('organization'), AdvancedAdminController.createService);
router.patch('/services/:id', requireEdit('organization'), AdvancedAdminController.updateService);

// Incidents
router.get('/incidents', requireView('care_episode'), AdvancedAdminController.listIncidents);
router.post('/incidents', requireCreate('care_episode'), AdvancedAdminController.createIncident);
router.patch('/incidents/:id', requireEdit('care_episode'), AdvancedAdminController.updateIncident);

// Disputes
router.get('/disputes', requireView('booking'), async (req: Request, res: Response, next: NextFunction) => {
  const { DisputeController } = await import('../controllers/disputes/DisputeController');
  DisputeController.adminList(req, res, next);
});
router.post('/disputes/:disputeId/resolve', requireApprove('booking'), async (req: Request, res: Response, next: NextFunction) => {
  const { DisputeController } = await import('../controllers/disputes/DisputeController');
  DisputeController.resolve(req, res, next);
});

// CSV exports
router.get('/export/bookings', requireView('booking'), AdvancedAdminController.exportBookings);
router.get('/export/users', requireView('user'), AdvancedAdminController.exportUsers);

// ── Review moderation ─────────────────────────────────────────────────────────
router.delete('/reviews/:id', requireDelete('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return next(new (await import('../middleware/errorHandler')).AppError('Review not found.', 404));
    await prisma.review.delete({ where: { id: req.params.id } });
    // Recalculate provider rating
    const agg = await prisma.review.aggregate({ where: { providerId: review.providerId }, _avg: { rating: true }, _count: true });
    await prisma.providerProfile.updateMany({ where: { userId: review.providerId }, data: { averageRating: agg._avg.rating ?? 0, reviewCount: agg._count } });
    await AuditService.log({ userId: req.user!.userId, action: 'admin_review_delete', entity: 'Review', entityId: req.params.id, req });
    res.json({ success: true, message: 'Review removed.' });
  } catch (err) {
    next(err);
  }
});
router.get('/reviews', requireView('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        include: {
          client: { select: { id: true, name: true, email: true } },
          provider: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count(),
    ]);
    res.json({ success: true, reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ── User soft-delete / restore ─────────────────────────────────────────────────
router.delete('/users/:id', requireDelete('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });
    // AUTH-22: soft-delete must revoke credentials and tear down sockets
    await Promise.all([
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      recordLogoutAll(userId),
    ]);
    disconnectUserSockets(userId);
    await AuditService.log({
      userId: req.user!.userId,
      action: 'admin_user_delete',
      entity: 'User',
      entityId: userId,
      req,
    });
    res.json({ success: true, message: 'User soft-deleted.' });
  } catch (err) {
    next(err);
  }
});
router.post('/users/:id/restore', requireEdit('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: null } });
    await AuditService.log({ userId: req.user!.userId, action: 'admin_user_restore', entity: 'User', entityId: req.params.id, req });
    res.json({ success: true, message: 'User restored.' });
  } catch (err) {
    next(err);
  }
});

// ── Compliance report ──────────────────────────────────────────────────────────
// Document coverage per provider: how many required doc types each provider has uploaded vs. required
router.get('/reports/compliance', requireView('organization'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requiredDocTypes = ['id_document', 'professional_license', 'police_clearance'];
    const providers = await prisma.user.findMany({
      where: { role: { in: ['provider', 'doctor', 'nurse', 'physiotherapist', 'support_worker', 'caregiver'] }, deletedAt: null },
      select: {
        id: true, name: true, email: true, verificationStatus: true,
        documents: { select: { type: true, status: true, expiresAt: true } },
      },
    });

    const report = providers.map(p => {
      const uploaded = requiredDocTypes.filter(dt => p.documents.some(d => d.type === dt && d.status === 'approved'));
      const expired = p.documents.filter(d => d.expiresAt && d.expiresAt < new Date());
      return {
        providerId: p.id, name: p.name, email: p.email, verificationStatus: p.verificationStatus,
        coverage: `${uploaded.length}/${requiredDocTypes.length}`,
        missingDocTypes: requiredDocTypes.filter(dt => !uploaded.includes(dt)),
        expiredDocuments: expired.length,
        compliant: uploaded.length === requiredDocTypes.length && expired.length === 0,
      };
    });

    const compliantCount = report.filter(r => r.compliant).length;
    res.json({ success: true, report, summary: { total: providers.length, compliant: compliantCount, nonCompliant: providers.length - compliantCount } });
  } catch (err) {
    next(err);
  }
});

// ── Platform staff management ──────────────────────────────────────────────────
// List internal platform staff (admin, care_coordinator, staff roles)
router.get('/platform-staff', requireView('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'care_coordinator', 'staff'] }, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, verificationStatus: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, staff });
  } catch (err) {
    next(err);
  }
});
router.patch('/platform-staff/:id/suspend', requireEdit('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await Promise.all([
      prisma.refreshToken.updateMany({
        where: { userId: req.params.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId: req.params.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      recordLogoutAll(req.params.id),
    ]);
    disconnectUserSockets(req.params.id);
    await AuditService.log({ userId: req.user!.userId, action: 'staff_suspended', entity: 'User', entityId: req.params.id, req });
    res.json({ success: true, message: 'Staff member suspended.' });
  } catch (err) {
    next(err);
  }
});
router.patch('/platform-staff/:id/role', requireEdit('user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = z.object({ role: z.string() }).parse(req.body);
    await prisma.user.update({ where: { id: req.params.id }, data: { role: role as never } });
    await AuditService.log({ userId: req.user!.userId, action: 'staff_role_updated', entity: 'User', entityId: req.params.id, req });
    res.json({ success: true, message: 'Staff role updated.' });
  } catch (err) {
    next(err);
  }
});

// ── Booking: admin force-cancel ────────────────────────────────────────────────
router.post('/bookings/:id/force-cancel', requireEdit('booking'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'cancelled', cancellationReason: reason ?? 'Admin force-cancelled' } });
    await AuditService.log({ userId: req.user!.userId, action: 'admin_booking_cancelled', entity: 'Booking', entityId: req.params.id, req });
    res.json({ success: true, message: 'Booking force-cancelled.' });
  } catch (err) {
    next(err);
  }
});

// ── Payment history for user ───────────────────────────────────────────────────
router.get('/users/:userId/payments', requireView('booking'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where: { userId: req.params.userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.payment.count({ where: { userId: req.params.userId } }),
    ]);
    res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ── Document workflows ─────────────────────────────────────────────────────────
router.get('/documents/pending', requireView('document'), adminDocController.listPending.bind(adminDocController));
router.get('/documents/statistics', requireView('document'), adminDocController.getStatistics.bind(adminDocController));
router.post('/documents/:id/approve', requireApprove('document'), adminDocController.approveDocument.bind(adminDocController));
router.post('/documents/:id/reject', requireApprove('document'), adminDocController.rejectDocument.bind(adminDocController));
router.post('/documents/:id/verify', requireApprove('document'), adminDocController.verifyDocument.bind(adminDocController));
router.get('/document-requests', requireView('document'), adminDocController.listDocumentRequests.bind(adminDocController));
router.get('/document-requests/pending', requireView('document'), adminDocController.listPendingDocumentRequests.bind(adminDocController));
router.post('/document-requests/:id/approve', requireApprove('document'), adminDocController.approveDocumentRequest.bind(adminDocController));
router.post('/document-requests/:id/reject', requireApprove('document'), adminDocController.rejectDocumentRequest.bind(adminDocController));

// ── Payout reconciliation ──────────────────────────────────────────────────────
router.get('/payouts/:id', requireView('booking'), adminPayoutController.getOne.bind(adminPayoutController));
router.post('/payouts/:id/confirm-reconciliation', requireApprove('booking'), adminPayoutController.confirmReconciliation.bind(adminPayoutController));
router.get('/payments/stats', requireView('booking'), adminPayoutController.getPaymentStats.bind(adminPayoutController));
router.get('/payments/reconciliation', requireView('booking'), AdvancedAdminController.reconciliation);
router.get('/reconciliation', requireView('booking'), AdvancedAdminController.reconciliation);
router.get('/payments/:id', requireView('booking'), adminPayoutController.getPayment.bind(adminPayoutController));
router.post('/payments/:id/mark-paid', requireApprove('booking'), adminPayoutController.markPaid.bind(adminPayoutController));
router.get('/payment-audits', requireView('booking'), adminPayoutController.listPaymentAudits.bind(adminPayoutController));
router.get('/dashboard/revenue-breakdown', requireView('booking'), adminPayoutController.revenueBreakdown.bind(adminPayoutController));
router.get('/dashboard/user-analytics', requireView('user'), adminPayoutController.userAnalytics.bind(adminPayoutController));

// ── Provider approval workflows ────────────────────────────────────────────────
router.get('/providers/pending', requireView('user'), adminProviderController.listPending.bind(adminProviderController));
router.post('/providers/:id/approve', requireApprove('user'), adminProviderController.approveProvider.bind(adminProviderController));
router.post('/providers/:id/reject', requireApprove('user'), adminProviderController.rejectProvider.bind(adminProviderController));
router.get('/doctors/:id', requireView('user'), adminProviderController.getDoctorDetail.bind(adminProviderController));
router.put('/doctors/:id/approve', requireApprove('user'), adminProviderController.approveDoctor.bind(adminProviderController));
router.put('/doctors/:id/reject', requireApprove('user'), adminProviderController.rejectDoctor.bind(adminProviderController));
router.get('/compliance/stats', requireView('organization'), adminProviderController.complianceStats.bind(adminProviderController));

// ── Wallets & credits ──────────────────────────────────────────────────────────
router.get('/wallets', requireView('booking'), adminProviderController.listWallets.bind(adminProviderController));
router.get('/credit-transactions', requireView('booking'), adminProviderController.listCreditTransactions.bind(adminProviderController));

// ── Booking admin detail ───────────────────────────────────────────────────────
router.get('/bookings/:id', requireView('booking'), adminProviderController.getBookingDetail.bind(adminProviderController));

// ── Provider reports (admin view) ─────────────────────────────────────────────
router.get('/reports', requireView('user'), adminProviderController.listProviderReports.bind(adminProviderController));
router.get('/reports/:id', requireView('user'), adminProviderController.getReport.bind(adminProviderController));
router.post('/reports/:id/status', requireEdit('user'), adminProviderController.updateReportStatus.bind(adminProviderController));

// ── Incident management ────────────────────────────────────────────────────────
router.post('/incidents/:id/escalate', requireEdit('care_episode'), adminProviderController.escalateIncident.bind(adminProviderController));
router.post('/incidents/:id/suspend-provider', requireEdit('user'), adminProviderController.suspendProviderFromIncident.bind(adminProviderController));

// ── Service management ─────────────────────────────────────────────────────────
router.put('/services/:id/deactivate', requireEdit('organization'), adminProviderController.deactivateService.bind(adminProviderController));

// ── Family org assignment queue ───────────────────────────────────────────────
router.get('/families', requireView('user'), AdminFamilyController.list);
router.get('/nav-badges', requireView('user'), AdminFamilyController.navBadges);
router.patch(
  '/families/:id/organization',
  requireEdit('user'),
  AdminFamilyController.assignOrganization,
);

// ── Organization hierarchy (granular permission gates — extend in M2+) ─────────
router.get('/organizations', requireView('organization'), OrganizationController.listOrganizations);
router.post('/organizations', requireCreate('organization'), OrganizationController.createOrganization);
router.post(
  '/organizations/:id/resend-invite',
  requireEdit('organization'),
  OrganizationController.resendOrgAdminInvite,
);
router.get(
  '/organizations/:orgId/clinics',
  requireView('clinic'),
  OrganizationController.listClinics,
);
router.post(
  '/organizations/:orgId/clinics',
  requireCreate('clinic'),
  OrganizationController.createClinic,
);
router.get('/organizations/:id', requireView('organization'), OrganizationController.getOrganization);
router.patch(
  '/organizations/:id',
  requireEdit('organization'),
  OrganizationController.updateOrganization,
);
router.delete(
  '/organizations/:id',
  requireDelete('organization'),
  OrganizationController.deleteOrganization,
);

router.get(
  '/clinics/:clinicId/departments',
  requireView('department'),
  OrganizationController.listDepartments,
);
router.post(
  '/clinics/:clinicId/departments',
  requireCreate('department'),
  OrganizationController.createDepartment,
);
router.get('/clinics/:id', requireView('clinic'), OrganizationController.getClinic);
router.patch('/clinics/:id', requireEdit('clinic'), OrganizationController.updateClinic);
router.delete('/clinics/:id', requireDelete('clinic'), OrganizationController.deleteClinic);

router.get('/departments/:id', requireView('department'), OrganizationController.getDepartment);
router.patch('/departments/:id', requireEdit('department'), OrganizationController.updateDepartment);
router.delete('/departments/:id', requireDelete('department'), OrganizationController.deleteDepartment);

// ── Internal staff CRUD ────────────────────────────────────────────────────────
router.get('/staff', requireView('user'), adminProviderController.listStaff.bind(adminProviderController));
router.post('/staff', requireCreate('user'), adminProviderController.createStaff.bind(adminProviderController));
router.put('/staff/:id', requireEdit('user'), adminProviderController.updateStaff.bind(adminProviderController));
router.delete('/staff/:id', requireDelete('user'), adminProviderController.removeStaff.bind(adminProviderController));

export default router;
