import { BookingStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { WalletService } from './WalletService';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export type DisputeResolution = 'refund_client' | 'release_provider' | 'split' | 'no_action';

export class DisputeService {
  static async open(data: {
    bookingId: string;
    raisedById: string;
    reason: string;
    description: string;
    evidence?: string[];
  }) {
    const booking = await prisma.booking.findUnique({ where: { id: data.bookingId }, include: { payment: true } });
    if (!booking) throw new AppError('Booking not found.', 404);

    const existing = await prisma.bookingDispute.findFirst({ where: { bookingId: data.bookingId, status: { in: ['open', 'under_review'] } } });
    if (existing) throw new AppError('A dispute already exists for this booking.', 409);

    if (booking.clientId !== data.raisedById && booking.providerId !== data.raisedById) {
      throw new AppError('Only the client or provider of this booking can open a dispute.', 403);
    }

    const dispute = await prisma.bookingDispute.create({
      data: {
        bookingId: data.bookingId,
        raisedById: data.raisedById,
        reason: data.reason,
        description: data.description,
        evidence: data.evidence ?? [],
        status: 'open',
      },
    });

    // Put the booking on hold (in_progress is the closest available status while under dispute)
    await prisma.booking.update({ where: { id: data.bookingId }, data: { status: BookingStatus.in_progress } });

    const otherPartyId = booking.clientId === data.raisedById ? booking.providerId : booking.clientId;
    await NotificationService.create({
      userId: otherPartyId,
      title: 'Dispute Opened',
      body: `A dispute has been opened on booking #${data.bookingId}.`,
      type: 'dispute_opened',
      data: { disputeId: dispute.id, bookingId: data.bookingId },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'admin', deletedAt: null }, select: { id: true } });
    await Promise.all(admins.map(admin =>
      NotificationService.create({
        userId: admin.id,
        title: 'New Booking Dispute',
        body: `Booking #${data.bookingId} has a new dispute that requires review.`,
        type: 'dispute_admin',
        data: { disputeId: dispute.id },
      })
    ));

    logger.info('Dispute opened', { disputeId: dispute.id, bookingId: data.bookingId });
    return dispute;
  }

  static async addEvidence(disputeId: string, userId: string, evidence: string[]) {
    const dispute = await prisma.bookingDispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new AppError('Dispute not found.', 404);
    if (dispute.status !== 'open') throw new AppError('Dispute is no longer accepting evidence.', 400);

    const booking = await prisma.booking.findUnique({ where: { id: dispute.bookingId } });
    if (!booking || (booking.clientId !== userId && booking.providerId !== userId)) {
      throw new AppError('Forbidden.', 403);
    }

    const existing = (dispute.evidence as string[]) ?? [];
    const updated = await prisma.bookingDispute.update({
      where: { id: disputeId },
      data: { evidence: [...existing, ...evidence], status: 'under_review' },
    });

    return updated;
  }

  static async resolve(
    disputeId: string,
    adminId: string,
    resolution: DisputeResolution,
    notes: string,
    splitRatio?: number // 0-1, fraction to client (only relevant for 'split')
  ) {
    const dispute = await prisma.bookingDispute.findUnique({
      where: { id: disputeId },
      include: { booking: { include: { payment: true } } },
    });
    if (!dispute) throw new AppError('Dispute not found.', 404);
    if (!['open', 'under_review'].includes(dispute.status)) {
      throw new AppError('Dispute is already resolved.', 400);
    }

    const booking = dispute.booking;
    const payment = booking.payment;
    const amount = payment ? Number(payment.amount) : 0;

    if (resolution === 'refund_client' && amount > 0) {
      await WalletService.credit(booking.clientId, amount, 'dispute_refund', `Dispute resolved in your favour.`, disputeId, 'BookingDispute');
      await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.cancelled } });

    } else if (resolution === 'release_provider' && amount > 0) {
      await WalletService.credit(booking.providerId, amount, 'dispute_provider_release', `Dispute resolved — escrow released to you.`, disputeId, 'BookingDispute');
      await prisma.booking.update({ where: { id: booking.id }, data: { status: 'completed' } });

    } else if (resolution === 'split' && amount > 0) {
      const ratio = splitRatio ?? 0.5;
      const clientShare = Math.round(amount * ratio * 100) / 100;
      const providerShare = Math.round((amount - clientShare) * 100) / 100;

      await WalletService.credit(booking.clientId, clientShare, 'dispute_split', 'Dispute resolved — partial refund.', disputeId, 'BookingDispute');
      await WalletService.credit(booking.providerId, providerShare, 'dispute_split', 'Dispute resolved — partial release.', disputeId, 'BookingDispute');
      await prisma.booking.update({ where: { id: booking.id }, data: { status: 'completed' } });
    }

    const resolved = await prisma.bookingDispute.update({
      where: { id: disputeId },
      data: { status: 'resolved', resolution, resolvedAt: new Date(), resolverId: adminId },
    });

    await NotificationService.create({
      userId: booking.clientId,
      title: 'Dispute Resolved',
      body: `The dispute for booking #${booking.id} has been resolved.`,
      type: 'dispute_resolved',
      data: { disputeId, bookingId: booking.id },
    });
    await NotificationService.create({
      userId: booking.providerId,
      title: 'Dispute Resolved',
      body: `The dispute for booking #${booking.id} has been resolved.`,
      type: 'dispute_resolved',
      data: { disputeId, bookingId: booking.id },
    });

    await AuditService.log({ userId: adminId, action: 'dispute_resolved', entity: 'BookingDispute', entityId: disputeId });

    return resolved;
  }
}
