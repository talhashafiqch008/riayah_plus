import { prisma } from '../config/database';

export type ReconInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  type: string;
  total: number;
  currency: string;
  paidAt: Date | null;
};

export type ReconPayment = {
  id: string;
  invoiceId: string | null;
  bookingId: string | null;
  amount: number;
  currency: string;
  status: string;
  type: string;
  gateway: string;
  gatewayRef: string | null;
};

export type ReconMismatch = {
  code:
    | 'paid_invoice_no_payment'
    | 'amount_mismatch'
    | 'currency_mismatch'
    | 'invoice_unpaid_with_payment'
    | 'orphan_settlement'
    | 'payment_missing_invoice';
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  invoiceTotal?: number;
  paymentTotal?: number;
  invoiceCurrency?: string;
  paymentCurrency?: string;
  gatewayRef?: string | null;
};

export type ReconMatch = {
  invoiceId: string;
  invoiceNumber: string;
  paymentIds: string[];
  amount: number;
  currency: string;
};

export type ReconciliationReport = {
  summary: {
    matchedCount: number;
    mismatchCount: number;
    paidInvoiceTotal: number;
    collectedPaymentTotal: number;
    delta: number;
  };
  matched: ReconMatch[];
  mismatches: ReconMismatch[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isRefund(p: ReconPayment): boolean {
  return p.type === 'refund' || p.status === 'refunded' || p.status === 'partially_refunded';
}

function isCollected(p: ReconPayment): boolean {
  return p.status === 'paid' || p.status === 'refunded' || p.status === 'partially_refunded';
}

function netCollected(payments: ReconPayment[]): number {
  let net = 0;
  for (const p of payments) {
    if (!isCollected(p)) continue;
    const amt = Number(p.amount) || 0;
    net += isRefund(p) ? -amt : amt;
  }
  return round2(net);
}

function billableInvoice(inv: ReconInvoice): boolean {
  return (inv.type || 'invoice') !== 'quotation';
}

/**
 * Match paid invoices to gateway settlements. Booking-only marketplace
 * payments (bookingId set, no invoiceId) are out of invoice reconciliation.
 */
export function reconcileInvoicesAndPayments(
  invoices: ReconInvoice[],
  payments: ReconPayment[],
): ReconciliationReport {
  const matched: ReconMatch[] = [];
  const mismatches: ReconMismatch[] = [];

  const byInvoice = new Map<string, ReconPayment[]>();
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const billable = invoices.filter(billableInvoice);
  const billableIds = new Set(billable.map((i) => i.id));

  for (const p of payments) {
    if (!p.invoiceId) continue;
    const list = byInvoice.get(p.invoiceId) ?? [];
    list.push(p);
    byInvoice.set(p.invoiceId, list);
  }

  for (const inv of billable) {
    const linked = byInvoice.get(inv.id) ?? [];
    const collected = linked.filter(isCollected);
    const net = netCollected(linked);
    const invoiceTotal = round2(Number(inv.total) || 0);

    if (inv.status === 'paid') {
      if (collected.length === 0) {
        mismatches.push({
          code: 'paid_invoice_no_payment',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceTotal,
          invoiceCurrency: inv.currency,
        });
        continue;
      }

      const paymentCurrency = collected[0]?.currency;
      const currencyClash = collected.some((p) => p.currency !== inv.currency);
      if (currencyClash) {
        mismatches.push({
          code: 'currency_mismatch',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceTotal,
          paymentTotal: net,
          invoiceCurrency: inv.currency,
          paymentCurrency,
        });
        continue;
      }

      if (Math.abs(net - invoiceTotal) > 0.009) {
        mismatches.push({
          code: 'amount_mismatch',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceTotal,
          paymentTotal: net,
          invoiceCurrency: inv.currency,
        });
        continue;
      }

      matched.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        paymentIds: collected.map((p) => p.id),
        amount: invoiceTotal,
        currency: inv.currency,
      });
      continue;
    }

    if (net > 0.009) {
      mismatches.push({
        code: 'invoice_unpaid_with_payment',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceTotal,
        paymentTotal: net,
        invoiceCurrency: inv.currency,
      });
    }
  }

  for (const p of payments) {
    if (!isCollected(p) || isRefund(p)) continue;

    if (p.invoiceId) {
      if (billableIds.has(p.invoiceId)) continue;
      if (invoiceById.has(p.invoiceId)) continue; // quotation / excluded type
      mismatches.push({
        code: 'payment_missing_invoice',
        paymentId: p.id,
        invoiceId: p.invoiceId,
        paymentTotal: round2(Number(p.amount) || 0),
        paymentCurrency: p.currency,
        gatewayRef: p.gatewayRef,
      });
      continue;
    }

    if (p.bookingId) continue;

    mismatches.push({
      code: 'orphan_settlement',
      paymentId: p.id,
      paymentTotal: round2(Number(p.amount) || 0),
      paymentCurrency: p.currency,
      gatewayRef: p.gatewayRef,
    });
  }

  const paidInvoiceTotal = round2(
    billable.filter((i) => i.status === 'paid').reduce((s, i) => s + (Number(i.total) || 0), 0),
  );

  const collectedPaymentTotal = round2(
    payments
      .filter((p) => isCollected(p) && (p.invoiceId || !p.bookingId))
      .reduce((s, p) => s + (isRefund(p) ? -(Number(p.amount) || 0) : Number(p.amount) || 0), 0),
  );

  return {
    summary: {
      matchedCount: matched.length,
      mismatchCount: mismatches.length,
      paidInvoiceTotal,
      collectedPaymentTotal,
      delta: round2(collectedPaymentTotal - paidInvoiceTotal),
    },
    matched,
    mismatches,
  };
}

export class ReconciliationService {
  static async report(opts?: { from?: Date; to?: Date }): Promise<ReconciliationReport> {
    const createdAt =
      opts?.from || opts?.to
        ? {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          }
        : undefined;

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: createdAt ? { createdAt } : undefined,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          type: true,
          total: true,
          currency: true,
          paidAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: createdAt ? { createdAt } : undefined,
        select: {
          id: true,
          invoiceId: true,
          bookingId: true,
          amount: true,
          currency: true,
          status: true,
          type: true,
          gateway: true,
          gatewayRef: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return reconcileInvoicesAndPayments(
      invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        type: i.type,
        total: Number(i.total),
        currency: i.currency,
        paidAt: i.paidAt,
      })),
      payments.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        bookingId: p.bookingId,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        type: p.type,
        gateway: p.gateway,
        gatewayRef: p.gatewayRef,
      })),
    );
  }
}
