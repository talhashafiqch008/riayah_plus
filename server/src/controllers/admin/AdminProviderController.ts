import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class AdminProviderController {
  // GET /admin/providers/pending
  async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const providerRoles: UserRole[] = ['provider', 'doctor', 'nurse', 'physiotherapist',
        'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian',
        'support_worker', 'caregiver', 'therapist'];

      const [providers, total] = await Promise.all([
        prisma.user.findMany({
          where: { role: { in: providerRoles }, verificationStatus: 'pending', deletedAt: null },
          skip,
          take: parseInt(limit),
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, verificationStatus: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.user.count({ where: { role: { in: providerRoles as UserRole[] }, verificationStatus: 'pending', deletedAt: null } }),
      ]);
      res.json({ data: providers, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/providers/:id/approve
  async approveProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new AppError('User not found', 404);

      await prisma.user.update({ where: { id }, data: { verificationStatus: 'approved' } });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'provider_approved',
          entity: 'user',
          entityId: id,
          after: { verificationStatus: 'approved', notes },
        },
      });

      res.json({ message: 'Provider approved' });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/providers/:id/reject
  async rejectProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) throw new AppError('Rejection reason is required', 400);

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new AppError('User not found', 404);

      await prisma.user.update({ where: { id }, data: { verificationStatus: 'rejected' } });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'provider_rejected',
          entity: 'user',
          entityId: id,
          after: { verificationStatus: 'rejected', reason },
        },
      });

      res.json({ message: 'Provider rejected' });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/doctors/:id
  async getDoctorDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const doctor = await prisma.user.findFirst({
        where: { id, role: 'doctor' },
        include: {
          documents: true,
          providerProfileExt: true,
          providerProfile: true,
          receivedReviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { client: { select: { name: true } } },
          },
        },
      });
      if (!doctor) throw new AppError('Doctor not found', 404);
      res.json({ data: doctor });
    } catch (err) {
      next(err);
    }
  }

  // PUT /admin/doctors/:id/approve
  async approveDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const doctor = await prisma.user.findFirst({ where: { id, role: 'doctor' } });
      if (!doctor) throw new AppError('Doctor not found', 404);
      await prisma.user.update({ where: { id }, data: { verificationStatus: 'approved' } });
      res.json({ message: 'Doctor approved' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /admin/doctors/:id/reject
  async rejectDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const doctor = await prisma.user.findFirst({ where: { id, role: 'doctor' } });
      if (!doctor) throw new AppError('Doctor not found', 404);
      await prisma.user.update({ where: { id }, data: { verificationStatus: 'rejected' } });
      res.json({ message: 'Doctor rejected', reason });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/compliance/stats
  async complianceStats(req: Request, res: Response, next: NextFunction) {
    try {
      const providerRoles: UserRole[] = ['provider', 'doctor', 'nurse', 'physiotherapist'];
      const totalProviders = await prisma.user.count({ where: { role: { in: providerRoles }, deletedAt: null } });

      const [verified, pendingDocs, expiredDocs, docsToday] = await Promise.all([
        prisma.user.count({ where: { role: { in: providerRoles }, verificationStatus: 'approved', deletedAt: null } }),
        prisma.document.count({ where: { status: 'pending' } }),
        prisma.document.count({ where: { status: 'expired' } }),
        prisma.document.count({
          where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
      ]);

      res.json({
        data: {
          totalProviders,
          verified,
          unverified: totalProviders - verified,
          verificationRate: totalProviders > 0 ? Math.round((verified / totalProviders) * 100) : 0,
          pendingDocuments: pendingDocs,
          expiredDocuments: expiredDocs,
          documentsSubmittedToday: docsToday,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/wallets
  async listWallets(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '50' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [wallets, total] = await Promise.all([
        prisma.walletBalance.findMany({
          skip,
          take: parseInt(limit),
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { balance: 'desc' },
        }),
        prisma.walletBalance.count(),
      ]);
      res.json({ data: wallets, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/credit-transactions
  async listCreditTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '50', userId } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = userId ? { userId } : {};

      const [txs, total] = await Promise.all([
        prisma.creditTransaction.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.creditTransaction.count({ where }),
      ]);
      res.json({ data: txs, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/bookings/:id
  async getBookingDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          provider: { select: { id: true, name: true, email: true, role: true } },
          payment: true,
          review: true,
          disputes: true,
        },
      });
      if (!booking) throw new AppError('Booking not found', 404);
      res.json({ data: booking });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/reports — provider-submitted reports
  async listProviderReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', status } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = {};
      if (status) where.status = status;

      const [reports, total] = await Promise.all([
        prisma.clientReport.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            provider: { select: { id: true, name: true } },
            client: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.clientReport.count({ where }),
      ]);
      res.json({ data: reports, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/reports/:id
  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await prisma.clientReport.findUnique({
        where: { id },
        include: {
          provider: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, name: true } },
          booking: true,
        },
      });
      if (!report) throw new AppError('Report not found', 404);
      res.json({ data: report });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/reports/:id/status
  async updateReportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const allowed = ['pending', 'under_review', 'resolved', 'dismissed'];
      if (!allowed.includes(status)) throw new AppError('Invalid status', 400);

      const report = await prisma.clientReport.findUnique({ where: { id } });
      if (!report) throw new AppError('Report not found', 404);

      const updated = await prisma.clientReport.update({ where: { id }, data: { status, notes } });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/incidents/:id/escalate
  async escalateIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const incident = await prisma.incident.findUnique({ where: { id } });
      if (!incident) throw new AppError('Incident not found', 404);

      const updated = await prisma.incident.update({
        where: { id },
        data: { investigationStatus: 'under_investigation', resolutionNotes: notes },
      });
      res.json({ data: updated, message: 'Incident escalated' });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/incidents/:id/suspend-provider
  async suspendProviderFromIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const incident = await prisma.incident.findUnique({ where: { id } });
      if (!incident) throw new AppError('Incident not found', 404);

      await prisma.user.update({
        where: { id: incident.reportedById },
        data: { verificationStatus: 'suspended' },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'provider_suspended_incident',
          entity: 'incident',
          entityId: id,
          after: { reason },
        },
      });

      res.json({ message: 'Provider suspended due to incident' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /admin/services/:id/deactivate
  async deactivateService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const service = await prisma.serviceType.findUnique({ where: { id } });
      if (!service) throw new AppError('Service not found', 404);
      const updated = await prisma.serviceType.update({ where: { id }, data: { isActive: false } });
      res.json({ data: updated, message: 'Service deactivated' });
    } catch (err) {
      next(err);
    }
  }

  // GET /admin/staff (platform staff CRUD — internal employees)
  async listStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const staffRoles: UserRole[] = [
        'staff',
        'admin',
        'super_admin',
        'support_admin',
        'trainer',
        'support_worker',
        'nurse',
        'doctor',
        'cleaner',
        'gardener',
        'provider',
        'clinical_staff',
        'care_coordinator',
      ];

      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
      const perPage = Math.min(100, Math.max(1, parseInt(String(req.query.per_page ?? '20'), 10)));
      const skip = (page - 1) * perPage;

      const where = { role: { in: staffRoles }, deletedAt: null };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            verificationStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: perPage,
        }),
        prisma.user.count({ where }),
      ]);

      const items = users.map((user) => {
        const parts = (user.name ?? '').trim().split(/\s+/);
        const firstName = parts[0] ?? '';
        const lastName = parts.slice(1).join(' ');
        return {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          name: user.name,
          role: user.role.toUpperCase(),
          createdAt: user.createdAt.toISOString(),
          verificationStatus: user.verificationStatus,
        };
      });

      res.json({
        success: true,
        data: {
          items,
          meta: {
            total,
            page,
            per_page: perPage,
            last_page: Math.ceil(total / perPage) || 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /admin/staff
  async createStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, role = 'staff', phone } = req.body;
      if (!name || !email) throw new AppError('Name and email are required', 400);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError('Email already in use', 409);

      const staff = await prisma.user.create({
        data: { name, email, phone, role, verificationStatus: 'approved', passwordHash: '' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      res.status(201).json({ data: staff });
    } catch (err) {
      next(err);
    }
  }

  // PUT /admin/staff/:id
  async updateStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, role, phone } = req.body;
      const staff = await prisma.user.findUnique({ where: { id } });
      if (!staff) throw new AppError('Staff member not found', 404);

      const updated = await prisma.user.update({ where: { id }, data: { name, role, phone } });
      res.json({ data: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /admin/staff/:id
  async removeStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const staff = await prisma.user.findUnique({ where: { id } });
      if (!staff) throw new AppError('Staff member not found', 404);
      await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
      res.json({ message: 'Staff member removed' });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminProviderController();
