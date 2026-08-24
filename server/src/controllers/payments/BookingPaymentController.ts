import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { StripeService } from '../../services/StripeService';
import { WalletService } from '../../services/WalletService';
import { QatariPaymentService } from '../../services/QatariPaymentService';
import { NotificationService } from '../../services/NotificationService';
import { AuditService } from '../../services/AuditService';
import { CacheInvalidationService } from '../../services/CacheInvalidationService';
import { RefundService } from '../../services/RefundService';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

const initiateSchema = z.object({
  gateway: z.enum(['stripe', 'wallet', 'paytabs', 'fatora']).default('stripe'),
  paymentMethodId: z.string().optional(),
  currency: z.string().default('QAR'),
});

export class BookingPaymentController {
  // POST /api/bookings/:bookingId/pay
  static async initiatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.userId;
      const body = initiateSchema.parse(req.body);

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

      if (!booking) throw new AppError('Booking not found.', 404);
      if (booking.clientId !== userId) throw new AppError('Forbidden.', 403);
      if (booking.status !== 'pending') throw new AppError('Booking is not awaiting payment.', 400);

      const amount = Number(booking.totalPrice ?? 0);
      if (amount <= 0) throw new AppError('Invalid booking amount.', 400);

      // ── Wallet payment ─────────────────────────────────────────────────────
      if (body.gateway === 'wallet') {
        const wallet = await WalletService.getBalance(userId);
        if (Number(wallet.balance) < amount) throw new AppError('Insufficient wallet balance.', 400);

        await WalletService.debit(userId, amount, 'booking_payment', `Payment for booking ${bookingId}`, bookingId, 'Booking');
        await prisma.booking.update({ where: { id: bookingId }, data: { status: 'accepted', paidAt: new Date() } });

        const payment = await prisma.payment.create({
          data: { bookingId, userId, amount, currency: body.currency, status: 'paid', gateway: 'wallet' },
        });

        await NotificationService.create({
          userId: booking.providerId,
          title: 'New Booking',
          body: 'A client has paid for a booking with you.',
          type: 'booking_paid',
          data: { bookingId },
        });

        await CacheInvalidationService.onBookingUpdated(booking.clientId, booking.providerId);

        res.json({ success: true, gateway: 'wallet', payment }); return;
      }

      // ── Stripe payment intent ──────────────────────────────────────────────
      if (body.gateway === 'stripe') {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        const customerId = await StripeService.getOrCreateCustomer(userId, user!.email, user!.name);

        const intent = await StripeService.createBookingPaymentIntent(
          bookingId,
          amount,
          body.currency,
          customerId,
          body.paymentMethodId
        );

        await prisma.payment.upsert({
          where: { bookingId },
          create: { bookingId, userId, amount, currency: body.currency, status: 'pending', gateway: 'stripe', gatewayRef: intent.id },
          update: { gatewayRef: intent.id, status: 'pending' },
        });

        res.json({ success: true, gateway: 'stripe', clientSecret: intent.client_secret, paymentIntentId: intent.id }); return;
      }

      // ── Qatari payment (PayTabs / Fatora) ──────────────────────────────────
      if (body.gateway === 'paytabs' || body.gateway === 'fatora') {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, phone: true } });
        const result = await QatariPaymentService.initiatePayment({
          invoiceId: `BKG-${bookingId}`,
          amount,
          currency: body.currency,
          description: `Booking payment #${bookingId}`,
          customerEmail: user!.email,
          customerName: user!.name,
          customerPhone: user!.phone ?? undefined,
          returnUrl: `${env.FRONTEND_URL}/bookings/${bookingId}/payment-result`,
          callbackUrl: `${env.BACKEND_URL}/api/wallet/paytabs/webhook`,
        });

        await prisma.payment.upsert({
          where: { bookingId },
          create: { bookingId, userId, amount, currency: body.currency, status: 'pending', gateway: body.gateway, gatewayRef: result.transactionRef },
          update: { gatewayRef: result.transactionRef, status: 'pending' },
        });

        res.json({ success: true, gateway: body.gateway, paymentUrl: result.redirectUrl, reference: result.transactionRef }); return;
      }

      throw new AppError('Unsupported payment gateway.', 400);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/bookings/:bookingId/payment/verify
  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.userId;
      const { paymentIntentId } = z.object({ paymentIntentId: z.string().min(1) }).parse(req.body);

      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
      if (!booking) throw new AppError('Booking not found.', 404);
      if (booking.clientId !== userId) throw new AppError('Forbidden.', 403);

      const payment = booking.payment;
      if (!payment) throw new AppError('No payment found for this booking.', 404);
      if (payment.userId !== userId) throw new AppError('Forbidden.', 403);
      if (payment.gatewayRef !== paymentIntentId) {
        throw new AppError('Payment intent does not match this booking.', 400);
      }

      if (payment.status === 'paid') {
        res.json({ success: true, status: 'paid', message: 'Already paid.' });
        return;
      }

      const intent = await StripeService.retrievePaymentIntent(paymentIntentId);
      if (intent.status !== 'succeeded') throw new AppError('Payment has not succeeded.', 400);

      const expectedMinor = Math.round(Number(payment.amount) * 100);
      const currency = (payment.currency || 'QAR').toLowerCase();
      if (intent.currency !== currency) {
        throw new AppError('Payment currency mismatch.', 400);
      }
      if (intent.amount !== expectedMinor) {
        throw new AppError('Payment amount mismatch.', 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'paid' },
        });
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'accepted', paidAt: new Date() },
        });
      });

      await AuditService.log({
        userId,
        action: 'booking_payment_verified',
        entity: 'Booking',
        entityId: bookingId,
        after: { paymentIntentId },
        req,
      });

      res.json({ success: true, status: 'paid' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/bookings/:bookingId/refund
  static async selfRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.userId;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
      });
      if (!booking) throw new AppError('Booking not found.', 404);
      if (booking.clientId !== userId) throw new AppError('Forbidden.', 403);

      if (booking.status === 'cancelled' && booking.payment?.status === 'refunded') {
        res.json({ success: true, message: 'Already refunded.', alreadyRefunded: true });
        return;
      }

      // Self-refund is allowed 24+ hours before scheduled time
      if (booking.scheduledAt && booking.scheduledAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
        throw new AppError('Cancellations within 24 hours are not eligible for a full refund.', 400);
      }

      if (!booking.payment) {
        throw new AppError('No paid payment found for this booking.', 400);
      }
      if (booking.payment.status === 'refunded') {
        res.json({ success: true, message: 'Already refunded.', alreadyRefunded: true });
        return;
      }
      if (booking.payment.status !== 'paid') {
        throw new AppError('No paid payment found for this booking.', 400);
      }

      const result = await RefundService.refundPaidBookingPayment({
        paymentId: booking.payment.id,
        bookingId,
        clientUserId: booking.clientId,
        actorUserId: userId,
        reason: `Client self-refund for booking ${bookingId}`,
        finalizeBooking: {
          status: 'cancelled',
          cancellationReason: 'client_request',
        },
      });

      await CacheInvalidationService.onBookingUpdated(booking.clientId, booking.providerId);
      await AuditService.log({
        userId,
        action: 'booking_refund',
        entity: 'Booking',
        entityId: bookingId,
        after: { refundRef: result.alreadyRefunded ? null : result.refundRef },
        req,
      });

      res.json({
        success: true,
        message: result.alreadyRefunded ? 'Already refunded.' : 'Refund processed.',
        alreadyRefunded: result.alreadyRefunded,
        refundRef: result.alreadyRefunded ? undefined : result.refundRef,
      });
    } catch (err) {
      next(err);
    }
  }
}
