import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { notifyBillingEvent } from './BillingNotificationService';
import { AuditService } from './AuditService';
import { InvoicePDFService } from './InvoicePDFService';
import { resolveCatalogService } from './ServiceCatalog';

const DEFAULT_TAX_RATE = 0.05;
const DEFAULT_CURRENCY = 'QAR';
const DUE_DAYS = 14;

const SESSION_TYPE_SERVICE: Record<string, string> = {
  telehealth: 'medical_consultation',
  home_visit: 'home_nursing',
  in_person: 'medical_consultation',
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceType: string;
  category?: string;
};

export type CompletionInvoiceResult =
  | { created: false; reason: 'already_exists' | 'no_billable_amount' | 'not_completed'; invoiceId?: string }
  | { created: true; invoiceId: string; invoiceNumber: string; total: number; currency: string; status: string };

function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
}

function bookingMarker(bookingId: string): string {
  return `bookingId=${bookingId}`;
}

function calculateTotals(lineItems: InvoiceLineItem[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    total,
  };
}

/** Billable hours from minutes or check-in/out window. Minimum 0.25h when timed. */
export function billableHours(opts: {
  durationMinutes?: number | null;
  durationHours?: number | null;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
}): number {
  if (opts.checkInAt && opts.checkOutAt) {
    const ms = opts.checkOutAt.getTime() - opts.checkInAt.getTime();
    if (ms > 0) return Math.max(0.25, Math.round((ms / 3_600_000) * 100) / 100);
  }
  if (opts.durationHours != null && Number(opts.durationHours) > 0) {
    return Math.round(Number(opts.durationHours) * 100) / 100;
  }
  if (opts.durationMinutes != null && opts.durationMinutes > 0) {
    return Math.round((opts.durationMinutes / 60) * 100) / 100;
  }
  return 1;
}

async function persistInvoice(opts: {
  clientId: string;
  episodeId?: string | null;
  sessionId?: string | null;
  lineItems: InvoiceLineItem[];
  notes: string;
  alreadyPaid: boolean;
  actorUserId?: string;
  notify: boolean;
}): Promise<CompletionInvoiceResult> {
  const { subtotal, taxAmount, total } = calculateTotals(opts.lineItems, DEFAULT_TAX_RATE);
  if (!(total > 0)) {
    return { created: false, reason: 'no_billable_amount' };
  }

  const invoiceNumber = generateInvoiceNumber();
  const dueDate = new Date(Date.now() + DUE_DAYS * 24 * 60 * 60 * 1000);
  const status = opts.alreadyPaid ? 'paid' : 'sent';

  const invoice = await prisma.invoice.create({
    data: {
      clientId: opts.clientId,
      episodeId: opts.episodeId ?? undefined,
      sessionId: opts.sessionId ?? undefined,
      invoiceNumber,
      type: 'invoice',
      status,
      currency: DEFAULT_CURRENCY,
      subtotal,
      taxRate: DEFAULT_TAX_RATE,
      taxAmount,
      total,
      sentAt: new Date(),
      paidAt: opts.alreadyPaid ? new Date() : null,
      dueDate,
      notes: opts.notes,
      lineItems: opts.lineItems,
    },
  });

  if (opts.notify && !opts.alreadyPaid) {
    await notifyBillingEvent({
      userId: opts.clientId,
      type: 'invoice_generated',
      title: 'Invoice ready',
      body: `Invoice ${invoiceNumber} for ${DEFAULT_CURRENCY} ${total.toFixed(2)} is ready. Due ${dueDate.toLocaleDateString('en-QA')}.`,
      data: { invoiceId: invoice.id, invoiceNumber },
      invoiceNumber,
      amount: total.toFixed(2),
      currency: DEFAULT_CURRENCY,
    });
  }

  if (opts.actorUserId) {
    try {
      await AuditService.log({
        userId: opts.actorUserId,
        action: 'invoice_auto_created',
        entity: 'Invoice',
        entityId: invoice.id,
        after: { invoiceNumber, total, currency: DEFAULT_CURRENCY, status },
      });
    } catch (err) {
      logger.warn('Invoice audit failed', { invoiceId: invoice.id, err });
    }
  }

  void InvoicePDFService.generateAndUpload(invoice.id).catch((err) => {
    logger.warn('Invoice PDF upload skipped/failed', {
      invoiceId: invoice.id,
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return {
    created: true,
    invoiceId: invoice.id,
    invoiceNumber,
    total,
    currency: DEFAULT_CURRENCY,
    status,
  };
}

/**
 * Auto-invoice after a care session is completed. Idempotent via Invoice.sessionId unique.
 */
export class InvoiceService {
  static async createFromSessionCompletion(
    sessionId: string,
    actorUserId?: string,
  ): Promise<CompletionInvoiceResult> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        invoice: { select: { id: true } },
        episode: { select: { id: true, patientId: true, careUnit: { select: { familyUserId: true } } } },
      },
    });
    if (!session) throw new AppError('Session not found.', 404);

    if (session.status !== 'completed') {
      return { created: false, reason: 'not_completed' };
    }
    if (session.invoice) {
      return { created: false, reason: 'already_exists', invoiceId: session.invoice.id };
    }

    const serviceCode = SESSION_TYPE_SERVICE[session.type] ?? 'medical_consultation';
    const catalog = await resolveCatalogService(serviceCode);
    const unitPrice = catalog ? Number(catalog.baseRate) : 0;
    if (!(unitPrice > 0)) {
      logger.warn('Invoice skipped — no catalog rate for session', { sessionId, serviceCode });
      return { created: false, reason: 'no_billable_amount' };
    }

    const hours = billableHours({
      durationMinutes: session.durationMinutes,
      checkInAt: session.checkInAt,
      checkOutAt: session.checkOutAt,
    });

    const label = catalog?.name ?? serviceCode;
    const typeLabel =
      session.type === 'telehealth' ? 'Telehealth' : session.type === 'home_visit' ? 'Home visit' : 'In-person';

    const clientId =
      session.episode?.careUnit?.familyUserId ?? session.episode?.patientId ?? session.clientId;

    return persistInvoice({
      clientId,
      episodeId: session.episodeId,
      sessionId: session.id,
      lineItems: [
        {
          description: `${typeLabel} session — ${label} (${hours}h)`,
          quantity: hours,
          unitPrice,
          serviceType: serviceCode,
          category: catalog?.category ?? 'medical',
        },
      ],
      notes: `Auto-generated on session completion. sessionId=${session.id}.`,
      alreadyPaid: false,
      actorUserId,
      notify: true,
    });
  }

  static async createFromBookingCompletion(
    bookingId: string,
    actorUserId?: string,
  ): Promise<CompletionInvoiceResult> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new AppError('Booking not found.', 404);
    if (booking.status !== 'completed') {
      return { created: false, reason: 'not_completed' };
    }

    const marker = bookingMarker(bookingId);
    const existing = await prisma.invoice.findFirst({
      where: { type: 'invoice', notes: { contains: marker } },
      select: { id: true },
    });
    if (existing) {
      return { created: false, reason: 'already_exists', invoiceId: existing.id };
    }

    const serviceType = booking.serviceType?.trim() || 'medical_consultation';
    const catalog = await resolveCatalogService(serviceType);
    const hours = billableHours({ durationHours: booking.durationHours ? Number(booking.durationHours) : null });

    let unitPrice = 0;
    let quantity = hours;
    const bookedAmount = Number(booking.totalAmount ?? booking.totalPrice ?? 0);
    if (bookedAmount > 0) {
      unitPrice = bookedAmount;
      quantity = 1;
    } else if (catalog && Number(catalog.baseRate) > 0) {
      unitPrice = Number(catalog.baseRate);
    }

    if (!(unitPrice > 0)) {
      logger.warn('Invoice skipped — no amount for booking', { bookingId });
      return { created: false, reason: 'no_billable_amount' };
    }

    const alreadyPaid =
      booking.paidWithCredits ||
      Boolean(booking.paidAt) ||
      booking.payment?.status === 'paid' ||
      booking.payment?.status === 'refunded';

    const label = catalog?.name ?? serviceType;

    return persistInvoice({
      clientId: booking.clientId,
      lineItems: [
        {
          description: alreadyPaid
            ? `${label} (${hours}h) — settled with booking`
            : `${label} (${hours}h)`,
          quantity,
          unitPrice,
          serviceType,
          category: catalog?.category ?? 'general',
        },
      ],
      notes: `Auto-generated on booking completion. ${marker}.${alreadyPaid ? ' Settled via existing payment.' : ''}`,
      alreadyPaid,
      actorUserId,
      notify: !alreadyPaid,
    });
  }

  /** Never throw — used from complete hooks so clinical/ops flow cannot break. */
  static async tryFromSession(sessionId: string, actorUserId?: string): Promise<CompletionInvoiceResult | null> {
    try {
      return await this.createFromSessionCompletion(sessionId, actorUserId);
    } catch (err) {
      logger.error('Session invoice generation failed', {
        sessionId,
        message: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  static async tryFromBooking(bookingId: string, actorUserId?: string): Promise<CompletionInvoiceResult | null> {
    try {
      return await this.createFromBookingCompletion(bookingId, actorUserId);
    } catch (err) {
      logger.error('Booking invoice generation failed', {
        bookingId,
        message: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /** Mark past-due sent invoices overdue and notify the family. Quotations are skipped. */
  static async markOverdueInvoices(now = new Date()): Promise<{ marked: number }> {
    const due = await prisma.invoice.findMany({
      where: { status: 'sent', type: 'invoice', dueDate: { lt: now } },
      select: {
        id: true,
        clientId: true,
        invoiceNumber: true,
        total: true,
        currency: true,
      },
      take: 100,
    });
    if (!due.length) return { marked: 0 };

    await prisma.invoice.updateMany({
      where: { id: { in: due.map((i) => i.id) } },
      data: { status: 'overdue' },
    });

    for (const inv of due) {
      await notifyBillingEvent({
        userId: inv.clientId,
        type: 'invoice_overdue',
        title: 'Invoice overdue',
        body: `Invoice ${inv.invoiceNumber} (${inv.currency} ${inv.total}) is past due.`,
        data: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber },
        invoiceNumber: inv.invoiceNumber,
        amount: String(inv.total),
        currency: inv.currency,
      });
    }

    return { marked: due.length };
  }
}
