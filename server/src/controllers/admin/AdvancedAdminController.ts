import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { WalletService } from '../../services/WalletService';
import { DashboardAggregationService } from '../../services/DashboardAggregationService';
import { InvoicePDFService } from '../../services/InvoicePDFService';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { ReconciliationService } from '../../services/ReconciliationService';
import { AppError } from '../../middleware/errorHandler';
import { createObjectCsvStringifier } from 'csv-writer';

export class AdvancedAdminController {
  // GET /api/admin/dashboard
  static async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const [stats, revenue] = await Promise.all([
        DashboardAggregationService.getAdminStats(),
        DashboardAggregationService.getRevenueBreakdown(6),
      ]);
      res.json({ success: true, stats, revenue });
    } catch (err) {
      next(err);
    }
  }

  // ── Verification Queue ──────────────────────────────────────────────────────

  // GET /api/admin/verification-queue
  static async verificationQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const [providers, total] = await Promise.all([
        prisma.user.findMany({
          where: { verificationStatus: 'pending', deletedAt: null },
          select: { id: true, name: true, email: true, role: true, createdAt: true, documents: { select: { id: true, type: true, status: true, url: true } } },
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where: { verificationStatus: 'pending', deletedAt: null } }),
      ]);

      res.json({ success: true, providers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/users/:userId/verify
  static async verifyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { status, notes } = z.object({ status: z.enum(['verified', 'rejected']), notes: z.string().optional() }).parse(req.body);

      await prisma.user.update({ where: { id: userId }, data: { verificationStatus: status } });

      await NotificationService.create({
        userId,
        title: status === 'verified' ? 'Account Verified!' : 'Verification Update',
        body: status === 'verified'
          ? 'Your account has been verified. You can now start accepting bookings.'
          : `Your verification was not approved. ${notes ?? ''}`,
        type: 'verification_update',
        data: { status },
      });

      await AuditService.log({ userId: req.user!.userId, action: `user_${status}`, entity: 'User', entityId: userId, req });

      res.json({ success: true, message: `User ${status}.` });
    } catch (err) {
      next(err);
    }
  }

  // ── Service Catalogue ───────────────────────────────────────────────────────

  // GET /api/admin/services
  static async listServices(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = String(req.query.includeInactive ?? '') === 'true';
      const services = await prisma.serviceType.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      res.json({ success: true, services });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/services
  static async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(120),
        type: z.string().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        baseRate: z.number().positive(),
        currency: z.enum(['QAR', 'USD']).default('QAR'),
        isActive: z.boolean().default(true),
      }).parse(req.body);

      const existing = await prisma.serviceType.findUnique({ where: { code: body.code } });
      if (existing) throw new AppError('A service with this code already exists.', 409);

      const service = await prisma.serviceType.create({ data: body });
      await AuditService.log({
        userId: req.user!.userId,
        action: 'service_catalog_created',
        entity: 'ServiceType',
        entityId: service.id,
        after: { code: service.code, baseRate: Number(service.baseRate), currency: service.currency },
        req,
      });
      res.status(201).json({ success: true, service });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/services/:id
  static async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        name: z.string().min(1).max(120).optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        baseRate: z.number().positive().optional(),
        currency: z.enum(['QAR', 'USD']).optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);

      const before = await prisma.serviceType.findUnique({ where: { id: req.params.id } });
      if (!before) throw new AppError('Service not found.', 404);

      const service = await prisma.serviceType.update({ where: { id: req.params.id }, data: body });
      await AuditService.log({
        userId: req.user!.userId,
        action: 'service_catalog_updated',
        entity: 'ServiceType',
        entityId: service.id,
        before: { baseRate: Number(before.baseRate), currency: before.currency, isActive: before.isActive },
        after: { baseRate: Number(service.baseRate), currency: service.currency, isActive: service.isActive },
        req,
      });
      res.json({ success: true, service });
    } catch (err) {
      next(err);
    }
  }

  // ── Credit Adjustments ──────────────────────────────────────────────────────

  // POST /api/admin/users/:userId/credit-adjustment
  static async creditAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { type, amount, reason } = z.object({
        type: z.enum(['credit', 'debit']),
        amount: z.number().positive(),
        reason: z.string().min(5),
      }).parse(req.body);

      if (type === 'credit') {
        await WalletService.credit(userId, amount, 'admin_adjustment', reason, req.user!.userId, 'User');
      } else {
        await WalletService.debit(userId, amount, 'admin_adjustment', reason, req.user!.userId, 'User');
      }

      await AuditService.log({ userId: req.user!.userId, action: `admin_${type}_adjustment`, entity: 'User', entityId: userId, req });

      res.json({ success: true, message: `Wallet ${type}ed by ${amount}.` });
    } catch (err) {
      next(err);
    }
  }

  // ── Incidents ────────────────────────────────────────────────────────────────

  // POST /api/admin/incidents
  static async createIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        patientId: z.string(),
        incidentType: z.string().min(3),
        description: z.string().min(10),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        location: z.string().optional(),
        episodeId: z.string().optional(),
      }).parse(req.body);

      const incident = await prisma.incident.create({
        data: { ...body, reportedById: req.user!.userId },
      });

      res.status(201).json({ success: true, incident });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/incidents
  static async listIncidents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const severity = req.query.severity as string | undefined;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {};
      if (severity) where.severity = severity;
      if (status) where.status = status;

      const [incidents, total] = await Promise.all([
        prisma.incident.findMany({
          where,
          include: { reportedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.incident.count({ where }),
      ]);

      res.json({ success: true, incidents, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/incidents/:id
  static async updateIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({ status: z.string().optional(), resolution: z.string().optional() }).parse(req.body);
      const incident = await prisma.incident.update({
        where: { id: req.params.id },
        data: { ...body, resolvedAt: body.status === 'resolved' ? new Date() : undefined },
      });
      res.json({ success: true, incident });
    } catch (err) {
      next(err);
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────────

  // GET /api/admin/export/bookings
  static async exportBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, organizationId } = req.query as Record<string, string>;
      // AUTHZ-07: hard cap below prior 10k; optional org filter for tenant-scoped exports
      const take = Math.min(Number(req.query.limit) || 1000, 1000);

      const where: Record<string, unknown> = {};
      if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };
      if (organizationId) {
        where.OR = [
          { client: { organizationId } },
          { provider: { organizationId } },
        ];
      }

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          client: { select: { name: true, email: true } },
          provider: { select: { name: true, email: true } },
          payment: { select: { amount: true, currency: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
      });

      const records = bookings.map(b => ({
        id: b.id,
        client_name: b.client?.name ?? '',
        client_email: b.client?.email ?? '',
        provider_name: b.provider?.name ?? '',
        provider_email: b.provider?.email ?? '',
        service_type: b.serviceType ?? '',
        status: b.status,
        scheduled_at: b.scheduledAt?.toISOString() ?? '',
        created_at: b.createdAt.toISOString(),
        amount: b.payment?.amount?.toString() ?? '',
        currency: b.payment?.currency ?? '',
        payment_status: b.payment?.status ?? '',
      }));

      const csvStringifier = createObjectCsvStringifier({
        header: Object.keys(records[0] ?? {}).map(k => ({ id: k, title: k.toUpperCase() })),
      });

      const csv = csvStringifier.getHeaderString()! + csvStringifier.stringifyRecords(records);

      // AUTHZ-15
      await AuditService.log({
        userId: req.user!.userId,
        action: 'admin_export_bookings',
        after: { rowCount: records.length, take, organizationId: organizationId ?? null, from, to },
        req,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bookings-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/export/users
  static async exportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, role } = req.query as Record<string, string>;
      const take = Math.min(Number(req.query.limit) || 1000, 1000);

      const where: Record<string, unknown> = { deletedAt: null };
      if (organizationId) where.organizationId = organizationId;
      if (role) where.role = role;

      const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, verificationStatus: true, createdAt: true, phone: true },
        orderBy: { createdAt: 'desc' },
        take,
      });

      const csvStringifier = createObjectCsvStringifier({
        header: Object.keys(users[0] ?? {}).map(k => ({ id: k, title: k.toUpperCase() })),
      });
      const csv = csvStringifier.getHeaderString()! + csvStringifier.stringifyRecords(users.map(u => ({
        ...u, createdAt: u.createdAt.toISOString(),
      })));

      // AUTHZ-15
      await AuditService.log({
        userId: req.user!.userId,
        action: 'admin_export_users',
        after: { rowCount: users.length, take, organizationId: organizationId ?? null, role: role ?? null },
        req,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/payments/reconciliation
  static async reconciliation(req: Request, res: Response, next: NextFunction) {
    try {
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      if (from && Number.isNaN(from.getTime())) throw new AppError('Invalid from date.', 400);
      if (to && Number.isNaN(to.getTime())) throw new AppError('Invalid to date.', 400);

      const report = await ReconciliationService.report({ from, to });
      res.json({ success: true, ...report });
    } catch (err) {
      next(err);
    }
  }
}
