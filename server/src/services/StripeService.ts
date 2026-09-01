import Stripe from 'stripe';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { WalletService } from './WalletService';
import { NotificationService } from './NotificationService';

const stripe = new Stripe(env.STRIPE_SECRET, { apiVersion: '2024-06-20' });

export class StripeService {
  // ── Payment Methods ────────────────────────────────────────────────────────

  static async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return stripe.setupIntents.create({ customer: customerId });
  }

  static async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    return list.data;
  }

  /**
   * C2: Ensure a payment method belongs to this Stripe customer before attach/use.
   * Unattached PMs are allowed only for attach (post–setup-intent).
   */
  static async assertPaymentMethodOwnedByCustomer(
    paymentMethodId: string,
    customerId: string,
    mode: 'attach' | 'use',
  ): Promise<void> {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const pmCustomer =
      typeof pm.customer === 'string' ? pm.customer : pm.customer?.id ?? null;

    if (pmCustomer) {
      if (pmCustomer !== customerId) {
        throw new AppError('Forbidden. Payment method not found on your account.', 403);
      }
      return;
    }

    if (mode === 'use') {
      throw new AppError('Forbidden. Payment method not found on your account.', 403);
    }
  }

  static async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<void> {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }

  static async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await stripe.paymentMethods.detach(paymentMethodId);
  }

  static async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  // ── Customer ───────────────────────────────────────────────────────────────

  static async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    const setting = await prisma.setting.findUnique({ where: { key: `stripe_customer_${userId}` } });
    if (setting) return setting.value;

    const customer = await stripe.customers.create({ email, name, metadata: { userId } });
    await prisma.setting.create({ data: { key: `stripe_customer_${userId}`, value: customer.id } });
    return customer.id;
  }

  // ── Payment Intents ────────────────────────────────────────────────────────

  static async createBookingPaymentIntent(
    bookingId: string,
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId?: string
  ): Promise<Stripe.PaymentIntent> {
    const idempotencyKey = `booking-pi-${bookingId}`;

    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata: { bookingId, type: 'booking' },
      confirm: !!paymentMethodId,
    };

    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
      params.return_url = `${env.FRONTEND_URL}/bookings/${bookingId}`;
    }

    return stripe.paymentIntents.create(params, { idempotencyKey });
  }

  static async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.confirm(paymentIntentId);
  }

  static async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  }

  static async cancelOrphanedIntents(): Promise<number> {
    // Cancel any PaymentIntents that are older than 1 hour and still require_payment_method
    const payments = await prisma.payment.findMany({
      where: {
        status: 'pending',
        gateway: 'stripe',
        createdAt: { lte: new Date(Date.now() - 60 * 60 * 1000) },
        gatewayRef: { not: null },
      },
    });

    let cancelled = 0;
    for (const payment of payments) {
      try {
        const intent = await stripe.paymentIntents.retrieve(payment.gatewayRef!);
        if (['requires_payment_method', 'requires_confirmation'].includes(intent.status)) {
          await stripe.paymentIntents.cancel(intent.id);
          await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
          cancelled++;
        }
      } catch (err) {
        logger.warn('Failed to cancel orphaned intent', { paymentId: payment.id, err });
      }
    }

    return cancelled;
  }

  // ── Refunds ────────────────────────────────────────────────────────────────

  static async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: Stripe.RefundCreateParams.Reason,
    idempotencyKey?: string
  ): Promise<Stripe.Refund> {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason ?? 'requested_by_customer',
    };
    if (amount) params.amount = Math.round(amount * 100);
    return stripe.refunds.create(
      params,
      idempotencyKey ? { idempotencyKey } : undefined
    );
  }

  // ── Webhook Handling ───────────────────────────────────────────────────────

  static constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  }

  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await StripeService.onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await StripeService.onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await StripeService.onChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private static async onPaymentIntentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
    const { bookingId, type } = intent.metadata;

    if (type === 'booking' && bookingId) {
      await prisma.payment.updateMany({
        where: { gatewayRef: intent.id },
        data: { status: 'paid' },
      });
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'accepted' },
      });

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (booking) {
        await NotificationService.create({
          userId: booking.clientId,
          title: 'Booking Confirmed',
          body: 'Your payment was successful and your booking is confirmed.',
          type: 'booking_paid',
          data: { bookingId },
        });
        await NotificationService.create({
          userId: booking.providerId,
          title: 'New Booking Payment',
          body: 'A client has paid for a booking with you.',
          type: 'booking_paid',
          data: { bookingId },
        });
      }
    }

    // Credit top-up flow
    if (type === 'topup') {
      const topup = await prisma.creditTopup.findFirst({ where: { stripeIntentId: intent.id } });
      if (topup && topup.status === 'pending') {
        await prisma.creditTopup.update({ where: { id: topup.id }, data: { status: 'paid', confirmedAt: new Date() } });
        await WalletService.credit(topup.userId, Number(topup.amount), 'topup', 'Credit top-up', topup.id, 'CreditTopup');
      }
    }
  }

  private static async onPaymentIntentFailed(intent: Stripe.PaymentIntent): Promise<void> {
    await prisma.payment.updateMany({
      where: { gatewayRef: intent.id },
      data: { status: 'failed' },
    });
    logger.warn(`Payment failed: ${intent.id}`);
  }

  private static async onChargeRefunded(charge: Stripe.Charge): Promise<void> {
    if (!charge.payment_intent) return;
    const refundedAmount = (charge.amount_refunded ?? 0) / 100;

    await prisma.payment.updateMany({
      where: { gatewayRef: charge.payment_intent as string },
      data: {
        status: refundedAmount >= Number(charge.amount) / 100 ? 'refunded' : 'partially_refunded',
        refundedAmount,
        refundedAt: new Date(),
      },
    });
  }
}
