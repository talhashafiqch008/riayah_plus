import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { WalletService } from '../../services/WalletService';
import { DashboardAggregationService } from '../../services/DashboardAggregationService';
import { InvoicePDFService } from '../../services/InvoicePDFService';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
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
      const services = await prisma.serviceType.findMany({ orderBy: { type: 'asc' } });
      res.json({ success: true, services });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/services
  static async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        code: z.string(),
        name: z.string(),
        type: z.string().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        baseRate: z.number().positive(),
        currency: z.string().default('QAR'),
        isActive: z.boolean().default(true),
      }).parse(req.body);

      const service = await prisma.serviceType.create({ data: body });
      res.status(201).json({ success: true, service });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/services/:id
  static async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        label: z.string().optional(),
        description: z.string().optional(),
        baseRate: z.number().positive().optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);

      const service = await prisma.serviceType.update({ where: { id: req.params.id }, data: body });
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
      const { from, to } = req.query as Record<string, string>;

      const where: Record<string, unknown> = {};
      if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };

      const bookings = await prisma.booking.findMany({
        where,
        include: {
          client: { select: { name: true, email: true } },
          provider: { select: { name: true, email: true } },
          payment: { select: { amount: true, currency: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
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
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, role: true, verificationStatus: true, createdAt: true, phone: true },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });

      const csvStringifier = createObjectCsvStringifier({
        header: Object.keys(users[0] ?? {}).map(k => ({ id: k, title: k.toUpperCase() })),
      });
      const csv = csvStringifier.getHeaderString()! + csvStringifier.stringifyRecords(users.map(u => ({
        ...u, createdAt: u.createdAt.toISOString(),
      })));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
