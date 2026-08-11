import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotificationService } from '../services/NotificationService';
import { WalletService } from '../services/WalletService';
import { EmailService } from '../services/EmailService';
import { StripeService } from '../services/StripeService';
import { PayoutIdempotencyService } from '../services/PayoutIdempotencyService';
import { anonymizeUser } from '../utils/anonymizeUser';

export function startScheduler(): void {
  logger.info('Starting cron scheduler');

  // ── booking:send-reminders — every minute ─────────────────────────────────
  cron.schedule('* * * * *', async () => {
    try {
      const upcoming = await prisma.booking.findMany({
        where: {
          status: 'accepted',
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
        include: { client: true, provider: true },
      });

      for (const booking of upcoming) {
        await NotificationService.create({
          userId: booking.clientId,
          title: 'Upcoming Booking Reminder',
          body: `You have a booking with ${booking.provider.name} tomorrow.`,
          type: 'booking_reminder',
          data: { bookingId: booking.id },
        });
      }
    } catch (err) {
      logger.error('booking:send-reminders failed', { err });
    }
  });

  // ── booking:expire-pending — hourly ──────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await prisma.booking.updateMany({
        where: {
          status: 'pending',
          createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        data: { status: 'cancelled', cancelReason: 'Auto-expired: no provider response' },
      });
      if (expired.count > 0) logger.info(`Expired ${expired.count} pending bookings`);
    } catch (err) {
      logger.error('booking:expire-pending failed', { err });
    }
  });

  // ── bookings:expire-counter-offers — daily ────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      await prisma.booking.updateMany({
        where: {
          isCounterOffered: true,
          counterOfferAt: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          status: 'pending',
        },
        data: { status: 'cancelled', cancelReason: 'Counter offer expired' },
      });
    } catch (err) {
      logger.error('bookings:expire-counter-offers failed', { err });
    }
  });

  // ── bids:expire — daily ───────────────────────────────────────────────────
  cron.schedule('0 1 * * *', async () => {
    try {
      const now = new Date();
      await prisma.careNeedBid.updateMany({
        where: { status: 'pending', expiresAt: { lt: now } },
        data: { status: 'rejected' },
      });
    } catch (err) {
      logger.error('bids:expire failed', { err });
    }
  });

  // ── escrow:release — daily ────────────────────────────────────────────────
  cron.schedule('0 2 * * *', async () => {
    try {
      const completedBookings = await prisma.booking.findMany({
        where: {
          status: 'completed',
          completedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          paidWithCredits: true,
          payment: { is: null },
        },
      });

      for (const booking of completedBookings) {
        if (booking.totalAmount) {
          await WalletService.releaseEscrow(
            booking.clientId,
            Number(booking.totalAmount),
            booking.providerId
          );
        }
      }

      logger.info(`Released escrow for ${completedBookings.length} bookings`);
    } catch (err) {
      logger.error('escrow:release failed', { err });
    }
  });

  // ── shifts:auto-clock-out — hourly ────────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const staleShifts = await prisma.shift.findMany({
        where: {
          status: 'active',
          startedAt: { lte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        },
      });

      for (const shift of staleShifts) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: { status: 'completed', endedAt: new Date(), notes: 'Auto clocked-out by system' },
        });
      }

      if (staleShifts.length) logger.info(`Auto clocked-out ${staleShifts.length} stale shifts`);
    } catch (err) {
      logger.error('shifts:auto-clock-out failed', { err });
    }
  });

  // ── credits:reconcile-topups — every 30 min ───────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      // Check for Stripe topups that succeeded but weren't credited
      const pendingTopups = await prisma.creditTopup.findMany({
        where: {
          status: 'pending',
          createdAt: { lte: new Date(Date.now() - 30 * 60 * 1000) },
        },
      });

      for (const topup of pendingTopups) {
        if (topup.stripeIntentId) {
          try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET!, { apiVersion: '2024-06-20' });
            const intent = await stripe.paymentIntents.retrieve(topup.stripeIntentId);

            if (intent.status === 'succeeded') {
              await prisma.creditTopup.update({ where: { id: topup.id }, data: { status: 'paid', confirmedAt: new Date() } });
              await WalletService.credit(topup.userId, Number(topup.amount), 'topup', 'Stripe top-up', topup.id, 'CreditTopup');
            }
          } catch {
            // skip failed lookups
          }
        }
      }
    } catch (err) {
      logger.error('credits:reconcile-topups failed', { err });
    }
  });

  // ── documents:mark-expired — daily ───────────────────────────────────────
  cron.schedule('0 3 * * *', async () => {
    try {
      await prisma.document.updateMany({
        where: {
          status: 'approved',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'expired' },
      });
    } catch (err) {
      logger.error('documents:mark-expired failed', { err });
    }
  });

  // ── documents:send-renewal-reminders — daily ─────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      const expiringSoon = await prisma.document.findMany({
        where: {
          status: 'approved',
          expiresAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: { user: true },
      });

      for (const doc of expiringSoon) {
        await NotificationService.create({
          userId: doc.userId,
          title: 'Document Expiring Soon',
          body: `Your document "${doc.name}" expires soon. Please renew it.`,
          type: 'document_renewal',
          data: { documentId: doc.id },
        });
      }
    } catch (err) {
      logger.error('documents:send-renewal-reminders failed', { err });
    }
  });

  // ── payment:reconcile — every 30 min ─────────────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      // Mark invoices as overdue
      await prisma.invoice.updateMany({
        where: {
          status: 'sent',
          dueDate: { lt: new Date() },
        },
        data: { status: 'overdue' },
      });
    } catch (err) {
      logger.error('payment:reconcile failed', { err });
    }
  });

  // ── meetings:cleanup — daily ──────────────────────────────────────────────
  cron.schedule('0 4 * * *', async () => {
    try {
      // Update sessions that started but were never completed
      await prisma.session.updateMany({
        where: {
          status: 'in_progress',
          startedAt: { lte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
        data: { status: 'completed', completedAt: new Date() },
      });
    } catch (err) {
      logger.error('meetings:cleanup failed', { err });
    }
  });

  // ── gps:flag-missed-checkins — every 15 min ───────────────────────────────
  cron.schedule('*/15 * * * *', async () => {
    try {
      const overdueSessions = await prisma.session.findMany({
        where: {
          status: 'accepted',
          scheduledAt: {
            lte: new Date(Date.now() - 30 * 60 * 1000),
          },
          checkInAt: null,
          type: 'home_visit',
        },
        include: { episode: true },
      });

      for (const session of overdueSessions) {
        if (session.episode) {
          await NotificationService.create({
            userId: session.episode.coordinatorId,
            title: 'Missed Check-In',
            body: `Worker has not checked in for session scheduled ${new Date(session.scheduledAt).toLocaleTimeString()}.`,
            type: 'gps_missed_checkin',
            data: { sessionId: session.id },
          });
        }
      }
    } catch (err) {
      logger.error('gps:flag-missed-checkins failed', { err });
    }
  });

  // ── payments:cancel-orphaned-intents — hourly ─────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const cancelled = await StripeService.cancelOrphanedIntents();
      if (cancelled > 0) logger.info(`Cancelled ${cancelled} orphaned Stripe PaymentIntents`);
    } catch (err) {
      logger.error('payments:cancel-orphaned-intents failed', { err });
    }
  });

  // ── payments:reconcile-webhooks — every 15 min ────────────────────────────
  // Finds paid Stripe PaymentIntents whose local payment record is still 'pending' and fixes them
  cron.schedule('*/15 * * * *', async () => {
    try {
      const stalePayments = await prisma.payment.findMany({
        where: { status: 'pending', gateway: 'stripe', gatewayRef: { not: null }, createdAt: { lte: new Date(Date.now() - 15 * 60 * 1000) } },
        take: 50,
      });

      for (const payment of stalePayments) {
        try {
          const intent = await StripeService.retrievePaymentIntent(payment.gatewayRef!);
          if (intent.status === 'succeeded') {
            await StripeService.handleWebhookEvent({ type: 'payment_intent.succeeded', data: { object: intent } } as import('stripe').Stripe.Event);
            logger.info('Reconciled missed Stripe event', { paymentId: payment.id });
          } else if (['canceled', 'requires_payment_method'].includes(intent.status)) {
            await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
          }
        } catch (innerErr) {
          logger.warn('Failed to reconcile payment', { paymentId: payment.id, innerErr });
        }
      }
    } catch (err) {
      logger.error('payments:reconcile-webhooks failed', { err });
    }
  });

  // ── payouts:process-pending — every 30 min ────────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const result = await PayoutIdempotencyService.processBatch(10);
      if (result.processed > 0) logger.info(`Processed ${result.processed} payouts`);
    } catch (err) {
      logger.error('payouts:process-pending failed', { err });
    }
  });

  // ── retention:purge-expired-otp — daily ─────────────────────────────────────
  cron.schedule('0 5 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await prisma.otpVerification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) logger.info(`Purged ${result.count} expired OTP records`);
    } catch (err) {
      logger.error('retention:purge-expired-otp failed', { err });
    }
  });

  // ── retention:purge-stale-refresh-tokens — daily ────────────────────────────
  cron.schedule('0 5 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { lt: cutoff } },
          ],
        },
      });
      if (result.count > 0) logger.info(`Purged ${result.count} stale refresh tokens`);
    } catch (err) {
      logger.error('retention:purge-stale-refresh-tokens failed', { err });
    }
  });

  // ── retention:anonymize-deleted-users — daily ───────────────────────────────
  cron.schedule('0 6 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const users = await prisma.user.findMany({
        where: {
          deletedAt: { not: null, lte: cutoff },
          email: { not: { contains: '@anonymized.local' } },
        },
        select: { id: true },
        take: 100,
      });

      for (const user of users) {
        await anonymizeUser(user.id);
      }

      if (users.length > 0) logger.info(`Anonymized ${users.length} soft-deleted users`);
    } catch (err) {
      logger.error('retention:anonymize-deleted-users failed', { err });
    }
  });

  // ── retention:emergency-requests — daily (G-16: 90 days post-resolution) ───
  cron.schedule('15 6 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await prisma.emergencyRequest.updateMany({
        where: {
          OR: [
            { resolvedAt: { lte: cutoff } },
            { status: 'resolved', updatedAt: { lte: cutoff } },
            { createdAt: { lte: cutoff }, status: { in: ['cancelled', 'closed'] } },
          ],
          NOT: { description: '[redacted]' },
        },
        data: {
          description: '[redacted]',
          latitude: null,
          longitude: null,
          address: null,
          location: null,
          notes: null,
        },
      });
      if (result.count > 0) logger.info(`Redacted ${result.count} aged emergency requests`);
    } catch (err) {
      logger.error('retention:emergency-requests failed', { err });
    }
  });

  // ── retention:gps-logs — daily (G-20: 90 days) ────────────────────────────
  cron.schedule('20 6 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await prisma.gpsLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (result.count > 0) logger.info(`Purged ${result.count} GPS logs older than 90 days`);
    } catch (err) {
      logger.error('retention:gps-logs failed', { err });
    }
  });

  // ── retention:notifications — daily (1 year) ──────────────────────────────
  cron.schedule('25 6 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const result = await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (result.count > 0) logger.info(`Purged ${result.count} notifications older than 1 year`);
    } catch (err) {
      logger.error('retention:notifications failed', { err });
    }
  });

  // ── retention:purge-expired-data-exports — hourly (M2 encrypted export TTL) ─
  cron.schedule('10 * * * *', async () => {
    try {
      const expired = await prisma.dataExportRequest.findMany({
        where: {
          status: { in: ['ready', 'pending'] },
          expiresAt: { lt: new Date() },
        },
        select: { id: true },
        take: 200,
      });
      const { deleteExportFile } = await import('../utils/dataExportCrypto');
      for (const row of expired) {
        await deleteExportFile(row.id);
      }
      if (expired.length > 0) {
        await prisma.dataExportRequest.updateMany({
          where: { id: { in: expired.map((e) => e.id) } },
          data: { status: 'expired', fileUrl: null },
        });
        logger.info(`Purged ${expired.length} expired data exports`);
      }
    } catch (err) {
      logger.error('retention:purge-expired-data-exports failed', { err });
    }
  });

  logger.info('All cron jobs scheduled');
}
