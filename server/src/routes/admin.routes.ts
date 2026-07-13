import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import {
  requireCreate,
  requireDelete,
  requireEdit,
  requireView,
} from '../middleware/permissions';
import { adminLimiter } from '../middleware/rateLimiter';
import { AuditService } from '../services/AuditService';
import { AdvancedAdminController } from '../controllers/admin/AdvancedAdminController';
import adminDocController from '../controllers/admin/AdminDocumentController';
import adminPayoutController from '../controllers/admin/AdminPayoutController';
import adminProviderController from '../controllers/admin/AdminProviderController';
import { OrganizationController } from '../controllers/admin/OrganizationController';

const router = Router();
router.use(authenticate, requireAdmin, adminLimiter);

// Dashboard stats
router.get('/dashboard', async (_req: Request, res: Response) => {
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
  const { page = '1', limit = '20', role, search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ];

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, total });
});

router.get('/users/:id', requireView('user'), async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { providerProfile: true, clientProfile: true },
  });
  res.json({ data: user });
});

router.patch('/users/:id', requireEdit('user'), async (req: Request, res: Response) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
  await AuditService.log({ userId: req.user!.userId, action: 'admin_user_updated', entity: 'User', entityId: user.id, req });
  res.json({ data: user });
});

// Bookings
router.get('/bookings', requireView('booking'), async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ include: { client: { select: { id: true, name: true } }, provider: { select: { id: true, name: true } } }, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
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
router.get('/payouts', async (req: Request, res: Response) => {
  const payouts = await prisma.payoutRequest.findMany({ include: { provider: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ data: payouts });
});

router.patch('/payouts/:id/approve', async (req: Request, res: Response) => {
  const payout = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'approved', processedAt: new Date() } });
  await AuditService.log({ userId: req.user!.userId, action: 'payout_approved', entity: 'PayoutRequest', entityId: payout.id, req });
  res.json({ data: payout });
});

router.patch('/payouts/:id/reject', async (req: Request, res: Response) => {
  const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);
  const payout = await prisma.payoutRequest.update({ where: { id: req.params.id }, data: { status: 'rejected', adminNotes: notes } });
  res.json({ data: payout });
});

// Documents
router.get('/documents', async (req: Request, res: Response) => {
  const { status } = req.query as { status?: string };
  const docs = await prisma.document.findMany({ where: status ? { status: status as any } : {}, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ data: docs });
});

// Audit logs
router.get('/audit-logs', requireView('user'), async (req: Request, res: Response) => {
  const { page = '1', limit = '50', entity, action, userId, from, to } = req.query as Record<string, string>;
  const data = await AuditService.getAll({
    entity,
    action,
    userId,
    from,
    to,
    page: parseInt(page),
    limit: parseInt(limit),
  });
  res.json(data);
});

router.get('/audit-logs/export', requireView('user'), async (req: Request, res: Response) => {
  const { entity, action, userId, from, to } = req.query as Record<string, string>;
  const { logs } = await AuditService.getAll({
    entity,
    action,
    userId,
    from,
    to,
    page: 1,
    limit: 10000,
  });

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
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
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
router.get('/reports/care-outcomes', async (_req: Request, res: Response) => {
  const [active, closed, achieved] = await Promise.all([
    prisma.careEpisode.count({ where: { status: 'active' } }),
    prisma.careEpisode.count({ where: { status: 'closed' } }),
    prisma.goal.count({ where: { status: 'achieved' } }),
  ]);
  res.json({ activeEpisodes: active, closedEpisodes: closed, achievedGoals: achieved });
});

router.get('/reports/financial', async (req: Request, res: Response) => {
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
router.get('/reports/gps-compliance', async (_req: Request, res: Response) => {
  const [total, outOfRadius] = await Promise.all([
    prisma.gpsLog.count({ where: { eventType: 'checkin' } }),
    prisma.gpsLog.count({ where: { eventType: 'checkin', geofenced: false } }),
  ]);
  res.json({ totalCheckins: total, outOfRadius, complianceRate: total > 0 ? ((total - outOfRadius) / total * 100).toFixed(2) : 100 });
});

// ── Advanced admin routes ──────────────────────────────────────────────────────
router.get('/dashboard/full', AdvancedAdminController.dashboard);

// Verification queue
router.get('/verification-queue', AdvancedAdminController.verificationQueue);
router.patch('/users/:userId/verify', AdvancedAdminController.verifyUser);

// Credit adjustments
router.post('/users/:userId/credit-adjustment', AdvancedAdminController.creditAdjustment);

// Service catalogue
router.get('/services', AdvancedAdminController.listServices);
router.post('/services', AdvancedAdminController.createService);
router.patch('/services/:id', AdvancedAdminController.updateService);

// Incidents
router.get('/incidents', AdvancedAdminController.listIncidents);
router.post('/incidents', AdvancedAdminController.createIncident);
router.patch('/incidents/:id', AdvancedAdminController.updateIncident);

// Disputes
router.get('/disputes', async (req: Request, res: Response, next: NextFunction) => {
  const { DisputeController } = await import('../controllers/disputes/DisputeController');
  DisputeController.adminList(req, res, next);
});
router.post('/disputes/:disputeId/resolve', async (req: Request, res: Response, next: NextFunction) => {
  const { DisputeController } = await import('../controllers/disputes/DisputeController');
  DisputeController.resolve(req, res, next);
});

// CSV exports
router.get('/export/bookings', AdvancedAdminController.exportBookings);
router.get('/export/users', AdvancedAdminController.exportUsers);

// ── Review moderation ─────────────────────────────────────────────────────────
router.delete('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
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
    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await AuditService.log({ userId: req.user!.userId, action: 'admin_user_delete', entity: 'User', entityId: req.params.id, req });
    res.json({ success: true, message: 'User soft-deleted.' });
  } catch (err) {
    next(err);
  }
});
router.post('/users/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/reports/compliance', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/platform-staff', async (req: Request, res: Response, next: NextFunction) => {
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
router.patch('/platform-staff/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await AuditService.log({ userId: req.user!.userId, action: 'staff_suspended', entity: 'User', entityId: req.params.id, req });
    res.json({ success: true, message: 'Staff member suspended.' });
  } catch (err) {
    next(err);
  }
});
router.patch('/platform-staff/:id/role', async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/bookings/:id/force-cancel', async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/users/:userId/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
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
router.get('/documents/pending', adminDocController.listPending.bind(adminDocController));
router.get('/documents/statistics', adminDocController.getStatistics.bind(adminDocController));
router.post('/documents/:id/approve', adminDocController.approveDocument.bind(adminDocController));
router.post('/documents/:id/reject', adminDocController.rejectDocument.bind(adminDocController));
router.post('/documents/:id/verify', adminDocController.verifyDocument.bind(adminDocController));
router.get('/document-requests', adminDocController.listDocumentRequests.bind(adminDocController));
router.get('/document-requests/pending', adminDocController.listPendingDocumentRequests.bind(adminDocController));
router.post('/document-requests/:id/approve', adminDocController.approveDocumentRequest.bind(adminDocController));
router.post('/document-requests/:id/reject', adminDocController.rejectDocumentRequest.bind(adminDocController));

// ── Payout reconciliation ──────────────────────────────────────────────────────
router.get('/payouts/:id', adminPayoutController.getOne.bind(adminPayoutController));
router.post('/payouts/:id/confirm-reconciliation', adminPayoutController.confirmReconciliation.bind(adminPayoutController));
router.get('/payments/stats', adminPayoutController.getPaymentStats.bind(adminPayoutController));
router.get('/payments/:id', adminPayoutController.getPayment.bind(adminPayoutController));
router.post('/payments/:id/mark-paid', adminPayoutController.markPaid.bind(adminPayoutController));
router.get('/payment-audits', adminPayoutController.listPaymentAudits.bind(adminPayoutController));
router.get('/dashboard/revenue-breakdown', adminPayoutController.revenueBreakdown.bind(adminPayoutController));
router.get('/dashboard/user-analytics', adminPayoutController.userAnalytics.bind(adminPayoutController));

// ── Provider approval workflows ────────────────────────────────────────────────
router.get('/providers/pending', adminProviderController.listPending.bind(adminProviderController));
router.post('/providers/:id/approve', adminProviderController.approveProvider.bind(adminProviderController));
router.post('/providers/:id/reject', adminProviderController.rejectProvider.bind(adminProviderController));
router.get('/doctors/:id', adminProviderController.getDoctorDetail.bind(adminProviderController));
router.put('/doctors/:id/approve', adminProviderController.approveDoctor.bind(adminProviderController));
router.put('/doctors/:id/reject', adminProviderController.rejectDoctor.bind(adminProviderController));
router.get('/compliance/stats', adminProviderController.complianceStats.bind(adminProviderController));

// ── Wallets & credits ──────────────────────────────────────────────────────────
router.get('/wallets', adminProviderController.listWallets.bind(adminProviderController));
router.get('/credit-transactions', adminProviderController.listCreditTransactions.bind(adminProviderController));

// ── Booking admin detail ───────────────────────────────────────────────────────
router.get('/bookings/:id', adminProviderController.getBookingDetail.bind(adminProviderController));

// ── Provider reports (admin view) ─────────────────────────────────────────────
router.get('/reports', adminProviderController.listProviderReports.bind(adminProviderController));
router.get('/reports/:id', adminProviderController.getReport.bind(adminProviderController));
router.post('/reports/:id/status', adminProviderController.updateReportStatus.bind(adminProviderController));

// ── Incident management ────────────────────────────────────────────────────────
router.post('/incidents/:id/escalate', adminProviderController.escalateIncident.bind(adminProviderController));
router.post('/incidents/:id/suspend-provider', adminProviderController.suspendProviderFromIncident.bind(adminProviderController));

// ── Service management ─────────────────────────────────────────────────────────
router.put('/services/:id/deactivate', adminProviderController.deactivateService.bind(adminProviderController));

// ── Organization hierarchy (granular permission gates — extend in M2+) ─────────
router.get('/organizations', requireView('organization'), OrganizationController.listOrganizations);
router.post('/organizations', requireCreate('organization'), OrganizationController.createOrganization);
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
router.get('/staff', adminProviderController.listStaff.bind(adminProviderController));
router.post('/staff', adminProviderController.createStaff.bind(adminProviderController));
router.put('/staff/:id', adminProviderController.updateStaff.bind(adminProviderController));
router.delete('/staff/:id', adminProviderController.removeStaff.bind(adminProviderController));

export default router;
