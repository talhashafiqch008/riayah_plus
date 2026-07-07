import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

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
    try {
      const payload = {
        profile_id: env.PAYTABS_PROFILE_ID,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: opts.invoiceId,
        cart_currency: opts.currency,
        cart_amount: opts.amount,
        cart_description: opts.description ?? `Invoice payment - ${opts.invoiceId}`,
        callback: opts.callbackUrl,
        return: opts.returnUrl,
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
        // Enable local Qatari banks via NAPS
        payment_methods: ['naps', 'visa', 'mastercard'],
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
        throw new AppError('Payment gateway error.', 502);
      }
      throw err;
    }
  }

  /**
   * Verify payment webhook from PayTabs
   */
  static async handleWebhook(payload: Record<string, unknown>) {
    const { tran_ref, cart_id, payment_result } = payload as {
      tran_ref: string;
      cart_id: string;
      payment_result: { response_status: string };
    };

    const status = payment_result?.response_status;

    const invoice = await prisma.invoice.findUnique({ where: { id: cart_id } });
    if (!invoice) {
      logger.warn('PayTabs webhook: invoice not found', { cart_id });
      return;
    }

    if (status === 'A') {
      // Approved
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'paid', paidAt: new Date() },
      });

      await prisma.payment.create({
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

      logger.info('PayTabs payment successful', { invoiceId: invoice.id, tran_ref });
    } else if (status === 'D' || status === 'E') {
      // Declined or Error
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
    }
  }

  /**
   * Process a refund via PayTabs
   */
  static async refund(transactionRef: string, amount: number, currency: string): Promise<void> {
    const payload = {
      profile_id: env.PAYTABS_PROFILE_ID,
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
