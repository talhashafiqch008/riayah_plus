import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AuditService } from '../../services/AuditService';
import { performAccountDeletion } from '../../services/AccountDeletionService';
import { AppError } from '../../middleware/errorHandler';

const exportSchema = z.object({
  format: z.enum(['json']).default('json'),
  categories: z
    .array(
      z.enum([
        'profile',
        'bookings',
        'payments',
        'messages',
        'notifications',
        'documents',
        'reviews',
        'wallet',
        'care',
        'invoices',
        'emergency',
        'family_members',
        'gps_logs',
      ]),
    )
    .optional(),
});

export class PrivacyController {
  // POST /api/privacy/data-export — GDPR Art 15/20 (G-4, G-5, G-21)
  static async requestDataExport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { format, categories } = exportSchema.parse(req.body ?? {});
      const include = (key: string) => !categories || categories.includes(key as never);

      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          userId,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const [
        user,
        bookings,
        payments,
        messages,
        notifications,
        documents,
        reviews,
        wallet,
        careUnits,
        careRecipients,
        intakes,
        episodes,
        assessments,
        invoices,
        emergencies,
        familyMembers,
        consents,
        consentLogs,
        gpsLogs,
      ] = await Promise.all([
        include('profile')
          ? prisma.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                processingRestricted: true,
                clientProfile: true,
              },
            })
          : null,
        include('bookings')
          ? prisma.booking.findMany({
              where: { OR: [{ clientId: userId }, { providerId: userId }] },
            })
          : [],
        include('payments') ? prisma.payment.findMany({ where: { userId } }) : [],
        include('messages') ? prisma.message.findMany({ where: { senderId: userId } }) : [],
        include('notifications')
          ? prisma.notification.findMany({ where: { userId } })
          : [],
        include('documents') ? prisma.document.findMany({ where: { userId } }) : [],
        include('reviews') ? prisma.review.findMany({ where: { clientId: userId } }) : [],
        include('wallet') ? prisma.walletBalance.findUnique({ where: { userId } }) : null,
        include('care')
          ? prisma.careUnit.findMany({ where: { familyUserId: userId, deletedAt: null } })
          : [],
        include('care')
          ? prisma.careRecipient.findMany({ where: { userId, deletedAt: null } })
          : [],
        include('care')
          ? prisma.intakeRecord.findMany({ where: { familyUserId: userId } })
          : [],
        include('care')
          ? prisma.careEpisode.findMany({
              where: { OR: [{ patientId: userId }, { careUnit: { familyUserId: userId } }] },
            })
          : [],
        include('care')
          ? prisma.assessment.findMany({ where: { patientId: userId } })
          : [],
        include('invoices') ? prisma.invoice.findMany({ where: { clientId: userId } }) : [],
        include('emergency')
          ? prisma.emergencyRequest.findMany({ where: { clientId: userId } })
          : [],
        include('family_members')
          ? prisma.familyMember.findMany({ where: { managerId: userId } })
          : [],
        prisma.consent.findMany({ where: { userId } }),
        prisma.consentLog.findMany({ where: { userId }, take: 200, orderBy: { createdAt: 'desc' } }),
        include('gps_logs') ? prisma.gpsLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }) : [],
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        requestId: exportRequest.id,
        format,
        user,
        bookings,
        payments,
        messages,
        notifications,
        documents,
        reviews,
        wallet,
        care: {
          careUnits,
          careRecipients,
          intakes,
          episodes,
          assessments,
        },
        invoices,
        emergencies,
        familyMembers,
        consents,
        consentLogs,
        gpsLogs,
      };

      await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      await AuditService.log({
        userId,
        action: 'data_export_requested',
        entity: 'DataExportRequest',
        entityId: exportRequest.id,
        after: { status: 'completed', categories: categories ?? 'all' },
        req,
      });

      const filename = `riayah-data-export-${userId}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/privacy/delete-account — GDPR Art 17 (G-2, G-14)
  static async requestAccountDeletion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { reason } = req.body ?? {};

      try {
        const { requestId } = await performAccountDeletion({
          userId,
          reason,
          req,
          res,
        });
        res.json({
          success: true,
          requestId,
          message:
            'Your account has been scheduled for deletion. Personal data will be anonymized after 30 days.',
        });
      } catch (err) {
        if (err instanceof AppError && (err as AppError & { blockers?: unknown }).blockers) {
          res.status(400).json({
            message: err.message,
            blockers: (err as AppError & { blockers: unknown }).blockers,
          });
          return;
        }
        throw err;
      }
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

  // GET /api/privacy/requests — status of export/deletion requests (G-4/G-12)
  static async listRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const [exports, deletions] = await Promise.all([
        prisma.dataExportRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.accountDeletionRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);
      res.json({ success: true, exports, deletions });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/privacy/restrict-processing — GDPR Art 18
  static async restrictProcessing(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { restricted = true } = req.body as { restricted?: boolean };

      await prisma.user.update({
        where: { id: userId },
        data: { processingRestricted: Boolean(restricted) },
      });

      await AuditService.log({
        userId,
        action: restricted ? 'processing_restricted' : 'processing_restriction_lifted',
        entity: 'User',
        entityId: userId,
        req,
      });

      res.json({
        success: true,
        message: restricted
          ? 'Processing of your personal data has been restricted.'
          : 'Processing restriction has been lifted.',
        processingRestricted: Boolean(restricted),
      });
    } catch (err) {
      next(err);
    }
  }
}
