import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { StripeService } from './StripeService';
import { QatariPaymentService } from './QatariPaymentService';
import { WalletService } from './WalletService';

export type BookingRefundResult =
  | { alreadyRefunded: true; paymentId: string }
  | { alreadyRefunded: false; paymentId: string; refundRef?: string };

type FinalizeBooking = {
  status: string;
  cancellationReason?: string;
};

/**
 * Atomic, idempotent booking payment refunds with gateway reconciliation.
 */
export class RefundService {
  static async refundPaidBookingPayment(opts: {
    paymentId: string;
    bookingId: string;
    clientUserId: string;
    actorUserId: string;
    reason: string;
    /** When set, booking is updated in the same DB transaction as the payment mark. */
    finalizeBooking?: FinalizeBooking;
  }): Promise<BookingRefundResult> {
    const payment = await prisma.payment.findUnique({ where: { id: opts.paymentId } });
    if (!payment) throw new AppError('Payment not found.', 404);
    if (payment.bookingId !== opts.bookingId) {
      throw new AppError('Payment does not belong to this booking.', 400);
    }

    if (payment.status === 'refunded') {
      return { alreadyRefunded: true, paymentId: payment.id };
    }
    if (payment.status !== 'paid') {
      throw new AppError('Payment is not eligible for refund.', 400);
    }

    const amount = Number(payment.amount);
    if (!(amount > 0)) {
      throw new AppError('Invalid payment amount for refund.', 400);
    }

    const gateway = (payment.gateway || '').toLowerCase();
    const idempotencyKey = `booking-refund-${payment.id}`;

    // Wallet: claim + credit + optional booking update in one transaction (no external call).
    if (gateway === 'wallet') {
      return prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: 'paid' },
          data: {
            status: 'refunded',
            refundedAt: new Date(),
            refundedAmount: payment.amount,
          },
        });
        if (claimed.count === 0) {
          return { alreadyRefunded: true, paymentId: payment.id };
        }

        await WalletService.creditWithTx(
          tx,
          opts.clientUserId,
          amount,
          'refund',
          opts.reason,
          opts.bookingId,
          'Booking'
        );

        if (opts.finalizeBooking) {
          await tx.booking.update({
            where: { id: opts.bookingId },
            data: {
              status: opts.finalizeBooking.status as never,
              ...(opts.finalizeBooking.cancellationReason
                ? { cancellationReason: opts.finalizeBooking.cancellationReason }
                : {}),
            },
          });
        }

        await tx.paymentAudit.create({
          data: {
            paymentId: payment.id,
            adminId: opts.actorUserId,
            action: 'refund',
            notes: opts.reason,
            metadata: { gateway: 'wallet', bookingId: opts.bookingId },
          },
        });

        return { alreadyRefunded: false, paymentId: payment.id, refundRef: `wallet:${payment.id}` };
      });
    }

    // Card gateways: claim first (optimistic lock), call gateway, reconcile; revert claim on failure.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: 'paid' },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        refundedAmount: payment.amount,
      },
    });
    if (claimed.count === 0) {
      return { alreadyRefunded: true, paymentId: payment.id };
    }

    let refundRef: string | undefined;
    try {
      if (gateway === 'stripe') {
        if (!payment.gatewayRef) {
          throw new AppError('Missing Stripe payment reference for refund.', 400);
        }
        const refund = await StripeService.refundPayment(
          payment.gatewayRef,
          amount,
          'requested_by_customer',
          idempotencyKey
        );
        refundRef = refund.id;
      } else if (gateway === 'paytabs' || gateway === 'fatora') {
        if (!payment.gatewayRef) {
          throw new AppError('Missing PayTabs transaction reference for refund.', 400);
        }
        await QatariPaymentService.refund(
          payment.gatewayRef,
          amount,
          payment.currency || 'QAR'
        );
        refundRef = `paytabs-refund:${payment.gatewayRef}:${idempotencyKey}`;
      } else {
        throw new AppError(`Unsupported payment gateway for refund: ${gateway || 'unknown'}`, 400);
      }
    } catch (err) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'paid',
          refundedAt: null,
          refundedAmount: null,
        },
      });
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      const prevMeta =
        payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
          ? (payment.metadata as Record<string, unknown>)
          : {};

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...prevMeta,
            refundRef,
            refundedBy: opts.actorUserId,
            refundReason: opts.reason,
          } as Prisma.InputJsonValue,
        },
      });

      if (opts.finalizeBooking) {
        await tx.booking.update({
          where: { id: opts.bookingId },
          data: {
            status: opts.finalizeBooking.status as never,
            ...(opts.finalizeBooking.cancellationReason
              ? { cancellationReason: opts.finalizeBooking.cancellationReason }
              : {}),
          },
        });
      }

      await tx.paymentAudit.create({
        data: {
          paymentId: payment.id,
          adminId: opts.actorUserId,
          action: 'refund',
          notes: opts.reason,
          metadata: {
            gateway,
            bookingId: opts.bookingId,
            refundRef,
          },
        },
      });
    });

    return { alreadyRefunded: false, paymentId: payment.id, refundRef };
  }
}
