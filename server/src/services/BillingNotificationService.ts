import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { EmailService } from './EmailService';
import { NotificationService } from './NotificationService';

export type BillingNotifyType =
  | 'invoice_generated'
  | 'invoice_sent'
  | 'quotation_generated'
  | 'payment_received'
  | 'payment_failed'
  | 'invoice_overdue';

export function billingEmailSubject(type: BillingNotifyType, invoiceNumber?: string): string {
  switch (type) {
    case 'invoice_generated':
    case 'invoice_sent':
      return invoiceNumber ? `Invoice ${invoiceNumber} is ready` : 'Invoice ready';
    case 'quotation_generated':
      return invoiceNumber ? `Quotation ${invoiceNumber} is ready` : 'Quotation ready';
    case 'payment_received':
      return invoiceNumber ? `Payment received for ${invoiceNumber}` : 'Payment received';
    case 'payment_failed':
      return invoiceNumber ? `Payment unsuccessful for ${invoiceNumber}` : 'Payment unsuccessful';
    case 'invoice_overdue':
      return invoiceNumber ? `Invoice ${invoiceNumber} is past due` : 'Invoice past due';
  }
}

/**
 * In-app + email for billing events. Never throws — clinical/ops paths must not fail
 * if mail or notifications are down.
 */
export async function notifyBillingEvent(opts: {
  userId: string;
  type: BillingNotifyType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  invoiceNumber?: string;
  amount?: string;
  currency?: string;
}): Promise<void> {
  try {
    await NotificationService.create({
      userId: opts.userId,
      title: opts.title,
      body: opts.body,
      type: opts.type,
      data: opts.data,
    });
  } catch (err) {
    logger.warn('Billing in-app notification failed', { type: opts.type, userId: opts.userId, err });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    const isInvoiceDoc =
      opts.type === 'invoice_generated' ||
      opts.type === 'invoice_sent' ||
      opts.type === 'quotation_generated';

    if (isInvoiceDoc && opts.invoiceNumber && opts.amount && opts.currency) {
      await EmailService.sendInvoice(user.email, {
        name: user.name ?? 'there',
        invoiceNumber: opts.invoiceNumber,
        amount: opts.amount,
        currency: opts.currency,
      });
      return;
    }

    const billingUrl = `${env.FRONTEND_URL}/family/invoices`;
    await EmailService.send({
      to: user.email,
      subject: billingEmailSubject(opts.type, opts.invoiceNumber),
      html: `<p>Hello ${user.name ?? ''},</p><p>${opts.body}</p><p><a href="${billingUrl}">Open billing</a></p>`,
      text: `${opts.body}\n\n${billingUrl}`,
    });
  } catch (err) {
    logger.warn('Billing email failed', { type: opts.type, userId: opts.userId, err });
  }
}
