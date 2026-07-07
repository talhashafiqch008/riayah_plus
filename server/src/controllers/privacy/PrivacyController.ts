import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { EmailService } from '../../services/EmailService';
import { AppError } from '../../middleware/errorHandler';

export class PrivacyController {
  // POST /api/privacy/data-export — GDPR data export request
  static async requestDataExport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // Gather all user data
      const [user, bookings, payments, messages, notifications, documents, reviews, wallet] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } }),
        prisma.booking.findMany({ where: { OR: [{ clientId: userId }, { providerId: userId }] } }),
        prisma.payment.findMany({ where: { userId } }),
        prisma.message.findMany({ where: { senderId: userId } }),
        prisma.notification.findMany({ where: { userId } }),
        prisma.document.findMany({ where: { userId } }),
        prisma.review.findMany({ where: { clientId: userId } }),
        prisma.walletBalance.findUnique({ where: { userId } }),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        user,
        bookings,
        payments,
        messages,
        notifications,
        documents,
        reviews,
        wallet,
      };

      await AuditService.log({ userId, action: 'data_export_requested', entity: 'User', entityId: userId, req });

      // In production, generate and email the export. For now, return inline.
      res.json({
        success: true,
        message: 'Your data export has been prepared.',
        data: exportData,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/privacy/delete-account — GDPR right to erasure
  static async requestAccountDeletion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { reason } = req.body;

      // Check for active obligations (pending bookings, escrow)
      const activeBookings = await prisma.booking.count({ where: { OR: [{ clientId: userId }, { providerId: userId }], status: { in: ['pending', 'accepted', 'in_progress'] } } });
      if (activeBookings > 0) {
        throw new AppError('You have active bookings. Please complete or cancel them before deleting your account.', 400);
      }

      // Soft delete
      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), deletionReason: reason ?? 'User requested account deletion' },
      });

      // Anonymise PII after 30 days (schedule a job — for now log it)
      await AuditService.log({ userId, action: 'account_deletion_requested', entity: 'User', entityId: userId, req });

      // Notify admin
      const admins = await prisma.user.findMany({ where: { role: 'admin', deletedAt: null }, select: { id: true } });
      await Promise.all(admins.map(admin =>
        NotificationService.create({ userId: admin.id, title: 'Account Deletion Request', body: `User ${userId} has requested account deletion.`, type: 'account_deletion', data: { userId } })
      ));

      res.json({ success: true, message: 'Your account has been scheduled for deletion. You will be logged out now.' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/privacy/consents — list own consents
  static async listConsents(req: Request, res: Response, next: NextFunction) {
    try {
      const consents = await prisma.consent.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, consents });
    } catch (err) {
      next(err);
    }
  }
}
