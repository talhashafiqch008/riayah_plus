import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { AuditService } from './AuditService';
import { notifyBillingEvent } from './BillingNotificationService';

interface PaymentInitOptions {
  invoiceId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  callbackUrl: string;
  description?: string;
}

function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
  } catch {
    return false;
  }
}

export function paytabsQueryUrl(requestUrl: string): string {
  return requestUrl.replace(/\/payment\/request\/?$/i, '/payment/query');
}

interface PaymentInitResult {
  redirectUrl: string;
  transactionRef: string;
}

export class QatariPaymentService {
  /**
   * Initiate payment via PayTabs
   * Supports NAPS-linked debit cards: QNB, Doha Bank, CBQ, QIB
   */
  static async initiatePayment(opts: PaymentInitOptions): Promise<PaymentInitResult> {
    if (opts.currency !== 'QAR' && opts.currency !== 'USD') {
      throw new AppError('Unsupported currency for PayTabs. Use QAR or USD.', 400);
    }

    if (!env.PAYTABS_PROFILE_ID?.trim() || !env.PAYTABS_SERVER_KEY?.trim()) {
      throw new AppError('PayTabs is not configured. Sandbox keys are required.', 503);
    }

    try {
      const payload = {
        profile_id: Number(env.PAYTABS_PROFILE_ID) || env.PAYTABS_PROFILE_ID,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: opts.invoiceId,
        cart_currency: opts.currency,
        cart_amount: opts.amount,
        cart_description: opts.description ?? `Invoice payment - ${opts.invoiceId}`,
        return: opts.returnUrl,
        ...(isPublicHttpsUrl(opts.callbackUrl) ? { callback: opts.callbackUrl } : {}),
        customer_details: {
          name: opts.customerName,
          email: opts.customerEmail,
          phone: opts.customerPhone ?? '',
          street1: 'Qatar',
          city: 'Doha',
          state: 'Doha',
          country: 'QA',
          zip: '00000',
        },
        // Omit payment_methods so PayTabs uses whatever the merchant profile has enabled.
        // Sandbox profiles often do not include NAPS/visa/mastercard as named methods.
      };

      const response = await axios.post(env.PAYTABS_BASE_URL, payload, {
        headers: {
          authorization: env.PAYTABS_SERVER_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.redirect_url) {
        throw new AppError('Payment gateway did not return redirect URL.', 502);
      }

      return {
        redirectUrl: response.data.redirect_url,
        transactionRef: response.data.tran_ref,
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        logger.error('PayTabs error', { data: err.response?.data });
        const gatewayMessage =
          typeof err.response?.data?.message === 'string' ? err.response.data.message : null;
        throw new AppError(gatewayMessage || 'Payment gateway error.', 502);
      }
      throw err;
    }
  }

  /**
   * Validate PayTabs webhook authenticity.
   * Accepts:
   * - Authorization header matching PAYTABS_SERVER_KEY, or
   * - signature / x-paytabs-signature HMAC-SHA256 of raw body with PAYTABS_WEBHOOK_SECRET / server key
   *
   * Sandbox IPN often has neither. Callers then verify via queryTransaction().
   */
  static hasWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer | undefined,
    payload: Record<string, unknown>,
  ): boolean {
    const serverKey = env.PAYTABS_SERVER_KEY?.trim();
    const webhookSecret = env.PAYTABS_WEBHOOK_SECRET?.trim() || serverKey;
    if (!serverKey && !webhookSecret) return false;

    const authHeader = String(headers.authorization ?? headers.Authorization ?? '').trim();
    if (serverKey && authHeader && authHeader === serverKey) {
      return true;
    }

    const providedSig = String(
      headers['x-paytabs-signature'] ??
        headers['X-PayTabs-Signature'] ??
        headers.signature ??
        payload.signature ??
        '',
    ).trim();

    if (webhookSecret && providedSig && rawBody) {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expected = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
      const a = Buffer.from(providedSig.toLowerCase());
      const b = Buffer.from(expected.toLowerCase());
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }

    if (webhookSecret && providedSig && payload.tran_ref && payload.cart_id) {
      const basis = [
        String(payload.tran_ref),
        String(payload.cart_id),
        String(payload.cart_amount ?? ''),
        String(payload.cart_currency ?? ''),
      ].join('');
      const expected = crypto.createHmac('sha256', webhookSecret).update(basis).digest('hex');
      const a = Buffer.from(providedSig.toLowerCase());
      const b = Buffer.from(expected.toLowerCase());
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }

    return false;
  }

  static async queryTransaction(tranRef: string): Promise<Record<string, unknown> | null> {
    if (!env.PAYTABS_PROFILE_ID?.trim() || !env.PAYTABS_SERVER_KEY?.trim()) {
      throw new AppError('PayTabs is not configured.', 503);
    }
    const queryUrl = paytabsQueryUrl(env.PAYTABS_BASE_URL);
    const response = await axios.post(
      queryUrl,
      {
        profile_id: Number(env.PAYTABS_PROFILE_ID) || env.PAYTABS_PROFILE_ID,
        tran_ref: tranRef,
      },
      {
        headers: {
          authorization: env.PAYTABS_SERVER_KEY,
          'Content-Type': 'application/json',
        },
      },
    );
    const data = (response.data ?? {}) as Record<string, unknown>;
    return data.tran_ref || data.payment_result ? data : null;
  }

  /**
   * After hosted checkout, query PayTabs by pending tran_ref and mark the invoice paid.
   * Used when IPN cannot reach localhost.
   */
  static async confirmInvoicePayment(invoiceId: string): Promise<{
    paid: boolean;
    alreadyPaid?: boolean;
    pending?: boolean;
  }> {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    if (invoice.status === 'paid') return { paid: true, alreadyPaid: true };

    const pending = await prisma.payment.findFirst({
      where: { invoiceId, gateway: 'paytabs', status: 'pending', gatewayRef: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending?.gatewayRef) return { paid: false, pending: false };

    if (!env.PAYTABS_PROFILE_ID?.trim() || !env.PAYTABS_SERVER_KEY?.trim()) {
      throw new AppError('PayTabs is not configured.', 503);
    }

    const payload = await this.queryTransaction(pending.gatewayRef);
    if (!payload) return { paid: false, pending: true };
    const paymentResult = payload.payment_result as { response_status?: string } | undefined;
    const status = paymentResult?.response_status;

    if (status === 'A') {
      await this.handleWebhook(
        {
          ...payload,
          tran_ref: String(payload.tran_ref ?? pending.gatewayRef),
          cart_id: String(payload.cart_id ?? invoiceId),
          payment_result: paymentResult,
        },
        { authorization: env.PAYTABS_SERVER_KEY },
        JSON.stringify(payload),
      );
      return { paid: true };
    }

    if (status === 'D' || status === 'E') {
      await prisma.payment.update({
        where: { id: pending.id },
        data: { status: 'failed', gatewayResponse: payload as object },
      });
      return { paid: false };
    }

    return { paid: false, pending: true };
  }

  /**
   * Verify payment webhook from PayTabs (idempotent).
   */
  static async handleWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined> = {},
    rawBody?: string | Buffer,
  ) {
    if (!env.PAYTABS_SERVER_KEY?.trim() && !env.PAYTABS_WEBHOOK_SECRET?.trim()) {
      throw new AppError('PayTabs webhook is not configured.', 503);
    }

    const signed = this.hasWebhookSignature(headers, rawBody, payload);
    if (!signed) {
      const notifyRef = String(payload.tran_ref ?? '').trim();
      if (!notifyRef) {
        logger.warn('PayTabs webhook authentication failed (no signature, no tran_ref)');
        throw new AppError('Invalid PayTabs webhook signature.', 401);
      }
      const live = await this.queryTransaction(notifyRef);
      const liveStatus = (live?.payment_result as { response_status?: string } | undefined)
        ?.response_status;
      if (!live || !liveStatus) {
        logger.warn('PayTabs webhook authentication failed (query miss)', { notifyRef });
        throw new AppError('Invalid PayTabs webhook signature.', 401);
      }
      payload = { ...payload, ...live, tran_ref: String(live.tran_ref ?? notifyRef) };
      logger.info('PayTabs IPN accepted after query verify', { tran_ref: payload.tran_ref });
    }

    const { tran_ref, cart_id, payment_result, cart_amount, cart_currency } = payload as {
      tran_ref: string;
      cart_id: string;
      payment_result: { response_status: string };
      cart_amount?: number | string;
      cart_currency?: string;
    };

    if (!tran_ref || !cart_id) {
      throw new AppError('Invalid PayTabs webhook payload.', 400);
    }

    // Idempotency: already processed this gateway ref as paid
    const existingPaid = await prisma.payment.findFirst({
      where: { gateway: 'paytabs', gatewayRef: tran_ref, status: 'paid' },
    });
    if (existingPaid) {
      logger.info('PayTabs webhook idempotent skip', { tran_ref, invoiceId: existingPaid.invoiceId });
      return { duplicate: true, invoiceId: existingPaid.invoiceId };
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: cart_id } });
    if (!invoice) {
      // Booking payments use cart_id like BKG-{bookingId}
      if (cart_id.startsWith('BKG-')) {
        return this.handleBookingWebhook(cart_id.slice(4), tran_ref, payment_result?.response_status, payload);
      }
      logger.warn('PayTabs webhook: invoice not found', { cart_id });
      throw new AppError('Invoice not found.', 404);
    }

    if (cart_currency && String(cart_currency).toUpperCase() !== invoice.currency.toUpperCase()) {
      logger.warn('PayTabs webhook currency mismatch', { cart_currency, expected: invoice.currency });
      throw new AppError('Payment currency mismatch.', 400);
    }

    if (cart_amount !== undefined) {
      const paidAmount = Number(cart_amount);
      const expected = Number(invoice.total);
      if (Number.isFinite(paidAmount) && Math.abs(paidAmount - expected) > 0.01) {
        logger.warn('PayTabs webhook amount mismatch', { paidAmount, expected });
        throw new AppError('Payment amount mismatch.', 400);
      }
    }

    const status = payment_result?.response_status;

    if (status === 'A') {
      if (invoice.status === 'paid') {
        logger.info('PayTabs webhook: invoice already paid', { invoiceId: invoice.id, tran_ref });
        return { duplicate: true, invoiceId: invoice.id };
      }

      await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'paid', paidAt: new Date() },
        });

        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            userId: invoice.clientId,
            amount: invoice.total,
            currency: invoice.currency,
            status: 'paid',
            gateway: 'paytabs',
            gatewayRef: tran_ref,
            gatewayResponse: payload as object,
          },
        });
      });

      await notifyBillingEvent({
        userId: invoice.clientId,
        type: 'payment_received',
        title: 'Payment received',
        body: `Payment for invoice ${invoice.invoiceNumber} was successful.`,
        data: { invoiceId: invoice.id, tran_ref, invoiceNumber: invoice.invoiceNumber },
        invoiceNumber: invoice.invoiceNumber,
        amount: String(invoice.total),
        currency: invoice.currency,
      });

      await AuditService.log({
        action: 'invoice_paid_paytabs',
        entity: 'Invoice',
        entityId: invoice.id,
        after: { tran_ref, gateway: 'paytabs' },
      });

      logger.info('PayTabs payment successful', { invoiceId: invoice.id, tran_ref });
      return { paid: true, invoiceId: invoice.id };
    }

    if (status === 'D' || status === 'E') {
      const existingFail = await prisma.payment.findFirst({
        where: { gateway: 'paytabs', gatewayRef: tran_ref, status: 'failed' },
      });
      if (!existingFail) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            userId: invoice.clientId,
            amount: invoice.total,
            currency: invoice.currency,
            status: 'failed',
            gateway: 'paytabs',
            gatewayRef: tran_ref,
            gatewayResponse: payload as object,
          },
        });

        await notifyBillingEvent({
          userId: invoice.clientId,
          type: 'payment_failed',
          title: 'Payment failed',
          body: `Payment for invoice ${invoice.invoiceNumber} failed. Please try again.`,
          data: { invoiceId: invoice.id, tran_ref, invoiceNumber: invoice.invoiceNumber },
          invoiceNumber: invoice.invoiceNumber,
          amount: String(invoice.total),
          currency: invoice.currency,
        });
      }
      return { failed: true, invoiceId: invoice.id };
    }

    return { ignored: true };
  }

  private static async handleBookingWebhook(
    bookingId: string,
    tran_ref: string,
    status: string | undefined,
    payload: Record<string, unknown>,
  ) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      logger.warn('PayTabs webhook: booking not found', { bookingId });
      throw new AppError('Booking not found.', 404);
    }

    const existingPaid = await prisma.payment.findFirst({
      where: { bookingId, gateway: 'paytabs', gatewayRef: tran_ref, status: 'paid' },
    });
    if (existingPaid) return { duplicate: true, bookingId };

    if (status === 'A') {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'accepted', paidAt: new Date() },
        });
        await tx.payment.upsert({
          where: { bookingId },
          create: {
            bookingId,
            userId: booking.clientId,
            amount: booking.totalPrice ?? 0,
            currency: 'QAR',
            status: 'paid',
            gateway: 'paytabs',
            gatewayRef: tran_ref,
            gatewayResponse: payload as object,
          },
          update: {
            status: 'paid',
            gatewayRef: tran_ref,
            gatewayResponse: payload as object,
          },
        });
      });
      return { paid: true, bookingId };
    }

    return { ignored: true, bookingId };
  }

  /**
   * Process a refund via PayTabs
   */
  static async refund(transactionRef: string, amount: number, currency: string): Promise<void> {
    const payload = {
      profile_id: Number(env.PAYTABS_PROFILE_ID) || env.PAYTABS_PROFILE_ID,
      tran_type: 'refund',
      tran_class: 'ecom',
      tran_ref: transactionRef,
      cart_id: `REFUND-${Date.now()}`,
      cart_currency: currency,
      cart_amount: amount,
      cart_description: 'Refund',
    };

    await axios.post(env.PAYTABS_BASE_URL, payload, {
      headers: {
        authorization: env.PAYTABS_SERVER_KEY,
        'Content-Type': 'application/json',
      },
    });
  }
}
