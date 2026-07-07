import { Worker } from 'bullmq';
import { bullmqConnection } from '../config/redis';
import { prisma } from '../config/database';
import { NotificationService } from '../services/NotificationService';
import { EmailService } from '../services/EmailService';
import { logger } from '../config/logger';

// ─── Notification Worker ──────────────────────────────────────────────────────
new Worker(
  'notifications',
  async (job) => {
    const { userId, title, body, type, channel, meta } = job.data;
    await NotificationService.create({ userId, title, body, type, channel, data: meta });
    logger.info(`Notification dispatched to ${userId}`);
  },
  bullmqConnection
);

// ─── Email Worker ─────────────────────────────────────────────────────────────
new Worker(
  'emails',
  async (job) => {
    const { to, subject, html } = job.data;
    await EmailService.send({ to, subject, html });
    logger.info(`Email sent to ${to}`);
  },
  bullmqConnection
);

// ─── Refund Worker ────────────────────────────────────────────────────────────
new Worker(
  'refunds',
  async (job) => {
    const { paymentId, amount } = job.data;
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    if (payment.gateway === 'stripe' && payment.gatewayRef) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET!, { apiVersion: '2024-06-20' });
      await stripe.refunds.create({
        payment_intent: payment.gatewayRef,
        amount: Math.round(amount * 100),
      });
    } else if (payment.gateway === 'paytabs' && payment.gatewayRef) {
      const { QatariPaymentService } = await import('../services/QatariPaymentService');
      await QatariPaymentService.refund(payment.gatewayRef, amount, payment.currency);
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded', refundedAmount: amount, refundedAt: new Date() },
    });

    logger.info(`Refund processed for payment ${paymentId}`);
  },
  bullmqConnection
);

// ─── Booking Status Worker ────────────────────────────────────────────────────
new Worker(
  'booking-status',
  async (job) => {
    const { bookingId, status, notifyUserId } = job.data;
    await NotificationService.create({
      userId: notifyUserId,
      title: 'Booking Update',
      body: `Your booking status changed to: ${status}`,
      type: 'booking_status_changed',
      data: { bookingId, status },
    });
  },
  bullmqConnection
);

// ─── WhatsApp Worker ──────────────────────────────────────────────────────────
new Worker(
  'whatsapp',
  async (job) => {
    const { phone, message } = job.data;
    const { WhatsAppService } = await import('../services/WhatsAppService');
    await WhatsAppService.sendText(phone, message);
  },
  bullmqConnection
);

logger.info('BullMQ workers started');
