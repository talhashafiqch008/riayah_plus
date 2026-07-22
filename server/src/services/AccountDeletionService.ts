import { Request } from 'express';
import { Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';
import { recordLogoutAll } from '../middleware/auth';
import { clearAuthCookies } from '../utils/authCookies';

export type DeletionBlocker = {
  type: string;
  count: number;
  message: string;
};

/** G-2 — expand obligation checks beyond bookings. */
export async function getAccountDeletionBlockers(userId: string): Promise<DeletionBlocker[]> {
  const [activeBookings, openInvoices, openDisputes, pendingPayouts, openEpisodes, openAssessments] =
    await Promise.all([
      prisma.booking.count({
        where: {
          OR: [{ clientId: userId }, { providerId: userId }],
          status: { in: ['pending', 'accepted', 'in_progress'] },
        },
      }),
      prisma.invoice.count({
        where: {
          clientId: userId,
          status: { in: ['draft', 'sent', 'overdue', 'disputed'] },
        },
      }),
      prisma.bookingDispute.count({
        where: {
          status: { in: ['open', 'under_review', 'escalated'] },
          OR: [
            { raisedById: userId },
            { booking: { OR: [{ clientId: userId }, { providerId: userId }] } },
          ],
        },
      }),
      prisma.payoutRequest.count({
        where: { providerId: userId, status: { in: ['pending', 'processing'] } },
      }),
      prisma.careEpisode.count({
        where: {
          OR: [{ patientId: userId }, { coordinatorId: userId }],
          status: { notIn: ['closed'] },
        },
      }),
      prisma.assessment.count({
        where: {
          OR: [{ patientId: userId }, { assessorId: userId }],
          status: 'scheduled',
        },
      }),
    ]);

  const blockers: DeletionBlocker[] = [];
  if (activeBookings > 0) {
    blockers.push({
      type: 'bookings',
      count: activeBookings,
      message: 'Active bookings must be completed or cancelled.',
    });
  }
  if (openInvoices > 0) {
    blockers.push({
      type: 'invoices',
      count: openInvoices,
      message: 'Open invoices must be settled or voided.',
    });
  }
  if (openDisputes > 0) {
    blockers.push({
      type: 'disputes',
      count: openDisputes,
      message: 'Unresolved disputes must be closed.',
    });
  }
  if (pendingPayouts > 0) {
    blockers.push({
      type: 'payouts',
      count: pendingPayouts,
      message: 'Pending payouts must complete first.',
    });
  }
  if (openEpisodes > 0) {
    blockers.push({
      type: 'care_episodes',
      count: openEpisodes,
      message: 'Open care episodes must be closed.',
    });
  }
  if (openAssessments > 0) {
    blockers.push({
      type: 'assessments',
      count: openAssessments,
      message: 'Scheduled assessments must be completed or cancelled.',
    });
  }
  return blockers;
}

/**
 * G-2 / G-14 — single deletion path used by privacy + profile routes.
 */
export async function performAccountDeletion(opts: {
  userId: string;
  reason?: string;
  req: Request;
  res?: Response;
}): Promise<{ requestId: string; blockers?: DeletionBlocker[] }> {
  const { userId, reason, req, res } = opts;

  const blockers = await getAccountDeletionBlockers(userId);
  if (blockers.length > 0) {
    const err = new AppError(
      `Account deletion blocked by ${blockers.length} outstanding obligation(s).`,
      400,
    );
    (err as AppError & { blockers: DeletionBlocker[] }).blockers = blockers;
    throw err;
  }

  const request = await prisma.accountDeletionRequest.create({
    data: {
      userId,
      status: 'scheduled',
      reason: reason ?? 'User requested account deletion',
      scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      isActive: false,
      deletionReason: reason ?? 'User requested account deletion',
      processingRestricted: true,
    },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await recordLogoutAll(userId);
  if (res) clearAuthCookies(res);

  await AuditService.log({
    userId,
    action: 'account_deletion_requested',
    entity: 'AccountDeletionRequest',
    entityId: request.id,
    after: { status: 'scheduled' },
    req,
  });

  const admins = await prisma.user.findMany({
    where: { role: { in: ['admin', 'super_admin'] }, deletedAt: null },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      NotificationService.create({
        userId: admin.id,
        title: 'Account Deletion Request',
        body: `User ${userId} requested account deletion.`,
        type: 'account_deletion',
        data: { userId, requestId: request.id },
      }).catch(() => undefined),
    ),
  );

  return { requestId: request.id };
}
