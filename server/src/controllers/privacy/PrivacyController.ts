import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AuditService } from '../../services/AuditService';
import { performAccountDeletion } from '../../services/AccountDeletionService';
import { AppError } from '../../middleware/errorHandler';
import {
  writeEncryptedExport,
  readAndDecryptExport,
  deleteExportFile,
} from '../../utils/dataExportCrypto';
import {
  redactBookingRows,
  redactMessageRows,
  redactForeignUserId,
} from '../../utils/exportRedact';

const EXPORT_TTL_MS = () => Math.max(1, env.DATA_EXPORT_TTL_HOURS) * 60 * 60 * 1000;

const exportSchema = z.object({
  /** Re-authentication required before PHI export (M2 / GDPR Art 15–20). */
  password: z.string().min(1, 'Password is required to export your data.'),
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

const downloadSchema = z.object({
  password: z.string().min(1, 'Password is required to download your export.'),
});

async function assertPassword(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError('Account unavailable.', 403);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid password.', 401);
  }
}

export class PrivacyController {
  // POST /api/privacy/data-export — GDPR Art 15/20 (encrypt + re-auth + TTL)
  static async requestDataExport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { format, categories, password } = exportSchema.parse(req.body ?? {});
      await assertPassword(userId, password);

      const include = (key: string) => !categories || categories.includes(key as never);
      const expiresAt = new Date(Date.now() + EXPORT_TTL_MS());

      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          userId,
          status: 'pending',
          expiresAt,
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
              select: {
                id: true,
                clientId: true,
                providerId: true,
                serviceType: true,
                status: true,
                scheduledAt: true,
                durationHours: true,
                totalAmount: true,
                currency: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
              },
            })
          : [],
        include('payments')
          ? prisma.payment.findMany({
              where: { userId },
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                gateway: true,
                method: true,
                createdAt: true,
              },
            })
          : [],
        include('messages')
          ? prisma.message.findMany({
              where: { senderId: userId },
              select: {
                id: true,
                receiverId: true,
                content: true,
                createdAt: true,
              },
            })
          : [],
        include('notifications')
          ? prisma.notification.findMany({
              where: { userId },
              select: { id: true, title: true, body: true, type: true, createdAt: true },
            })
          : [],
        include('documents')
          ? prisma.document.findMany({
              where: { userId },
              select: { id: true, name: true, type: true, status: true, createdAt: true },
            })
          : [],
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
        include('gps_logs')
          ? prisma.gpsLog.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              take: 500,
            })
          : [],
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        requestId: exportRequest.id,
        format,
        expiresAt: expiresAt.toISOString(),
        user,
        bookings: redactBookingRows(bookings, userId, exportRequest.id),
        payments,
        messages: redactMessageRows(messages, userId, exportRequest.id),
        notifications,
        documents,
        reviews: (reviews as Array<{ providerId?: string }>).map((r) => ({
          ...r,
          providerId: redactForeignUserId(r.providerId, userId, exportRequest.id),
        })),
        wallet,
        care: {
          careUnits,
          careRecipients,
          intakes,
          episodes: (episodes as Array<{ coordinatorId?: string | null; patientId?: string }>).map(
            (e) => ({
              ...e,
              coordinatorId: redactForeignUserId(e.coordinatorId ?? undefined, userId, exportRequest.id),
              patientId: redactForeignUserId(e.patientId, userId, exportRequest.id),
            }),
          ),
          assessments: (assessments as Array<{ assessorId?: string | null }>).map((a) => ({
            ...a,
            assessorId: redactForeignUserId(a.assessorId ?? undefined, userId, exportRequest.id),
          })),
        },
        invoices,
        emergencies,
        familyMembers,
        consents,
        consentLogs,
        gpsLogs,
      };

      const fileUrl = await writeEncryptedExport(exportRequest.id, exportData);

      await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: {
          status: 'ready',
          completedAt: new Date(),
          fileUrl,
          expiresAt,
        },
      });

      await AuditService.log({
        userId,
        action: 'data_export_requested',
        entity: 'DataExportRequest',
        entityId: exportRequest.id,
        after: {
          status: 'ready',
          categories: categories ?? 'all',
          expiresAt: expiresAt.toISOString(),
          encrypted: true,
        },
        req,
      });

      // Never return PHI in this response — download is a separate re-auth step
      res.status(202).json({
        success: true,
        requestId: exportRequest.id,
        status: 'ready',
        expiresAt: expiresAt.toISOString(),
        downloadUrl: `/api/privacy/data-export/${exportRequest.id}/download`,
        message:
          'Your encrypted export is ready. Re-enter your password on the download endpoint within the expiry window.',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/privacy/data-export/:id/download — re-auth + decrypt + one-time stream
  static async downloadDataExport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { password } = downloadSchema.parse(req.body ?? {});
      await assertPassword(userId, password);

      const exportRequest = await prisma.dataExportRequest.findFirst({
        where: { id, userId },
      });
      if (!exportRequest) {
        throw new AppError('Export not found.', 404);
      }
      if (exportRequest.status === 'downloaded') {
        throw new AppError('This export was already downloaded and has been removed.', 410);
      }
      if (exportRequest.status !== 'ready' || !exportRequest.fileUrl) {
        throw new AppError('Export is not ready.', 409);
      }
      if (exportRequest.expiresAt && exportRequest.expiresAt.getTime() < Date.now()) {
        await deleteExportFile(exportRequest.id);
        await prisma.dataExportRequest.update({
          where: { id: exportRequest.id },
          data: { status: 'expired', fileUrl: null },
        });
        throw new AppError('This export has expired. Please request a new one.', 410);
      }

      let plaintext: Buffer;
      try {
        plaintext = await readAndDecryptExport(exportRequest.id);
      } catch {
        throw new AppError('Export file is missing or corrupt. Please request a new export.', 410);
      }

      await prisma.dataExportRequest.update({
        where: { id: exportRequest.id },
        data: { status: 'downloaded', fileUrl: null },
      });
      await deleteExportFile(exportRequest.id);

      await AuditService.log({
        userId,
        action: 'data_export_downloaded',
        entity: 'DataExportRequest',
        entityId: exportRequest.id,
        req,
      });

      const filename = `riayah-data-export-${exportRequest.id}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.send(plaintext);
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
          select: {
            id: true,
            status: true,
            requestedAt: true,
            expiresAt: true,
            completedAt: true,
            createdAt: true,
            // never expose fileUrl paths
          },
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
