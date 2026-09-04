import { client } from './client';
import { extractApiError } from '@/lib/errors';

export type InvoiceDocType = 'invoice' | 'quotation';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'overdue'
  | 'paid'
  | 'cancelled'
  | 'disputed';

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceType?: string;
  category?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  type: InvoiceDocType | string;
  status: InvoiceStatus | string;
  currency: string;
  subtotal: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  total: string | number;
  notes?: string | null;
  dueDate?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  lineItems: InvoiceLineItem[] | unknown;
  episodeId?: string | null;
  clientId?: string;
  client?: { id: string; name: string; email?: string | null } | null;
};

export type PayInvoiceResult = {
  success?: boolean;
  alreadyPaid?: boolean;
  paymentUrl?: string;
  invoiceId?: string;
  message?: string;
};

function asNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(amount: string | number | null | undefined, currency = 'QAR'): string {
  return `${currency} ${asNumber(amount).toFixed(2)}`;
}

export function invoiceLineItems(invoice: Invoice): InvoiceLineItem[] {
  const raw = invoice.lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is InvoiceLineItem => Boolean(row && typeof row === 'object'));
}

export function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Preparing',
    sent: 'Due',
    overdue: 'Overdue',
    paid: 'Paid',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}

export function invoiceStatusBadgeClass(status: string): string {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-800';
  if (status === 'overdue') return 'bg-rose-50 text-rose-800';
  if (status === 'sent') return 'bg-amber-50 text-amber-800';
  if (status === 'disputed') return 'bg-orange-50 text-orange-800';
  if (status === 'cancelled') return 'bg-stone-100 text-stone-500';
  return 'bg-stone-100 text-stone-600';
}

export function canPayInvoice(invoice: Invoice): boolean {
  return invoice.type !== 'quotation' && ['sent', 'overdue', 'disputed'].includes(String(invoice.status));
}

export async function listInvoices(params?: {
  type?: InvoiceDocType | string;
  status?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { data } = await client.get<{ data: Invoice[]; total?: number }>('/invoices', { params });
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function getInvoice(id: string) {
  try {
    const { data } = await client.get<{ data: Invoice }>(`/invoices/${id}`);
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function sendInvoice(id: string) {
  try {
    const { data } = await client.post<{ data: Invoice }>(`/invoices/${id}/send`);
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function markInvoicePaid(id: string, opts?: { gatewayRef?: string; method?: string }) {
  try {
    const { data } = await client.post<{ data: Invoice }>(`/invoices/${id}/mark-paid`, opts ?? {});
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function payInvoice(id: string) {
  try {
    const origin = window.location.origin;
    const { data } = await client.post<PayInvoiceResult>(
      `/invoices/${id}/pay`,
      { returnUrl: `${origin}/family/billing/${id}` },
      { __retryCount: 3 } as never,
    );
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export type ConfirmInvoicePaymentResult = {
  success?: boolean;
  paid?: boolean;
  alreadyPaid?: boolean;
  pending?: boolean;
  data?: Invoice;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll PayTabs confirm after hosted checkout — gateway may lag a few seconds behind redirect. */
export async function confirmInvoicePayment(
  id: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<ConfirmInvoicePaymentResult> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const intervalMs = options?.intervalMs ?? 1200;

  let last: ConfirmInvoicePaymentResult = {};
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { data } = await client.post<ConfirmInvoicePaymentResult>(
        `/invoices/${id}/pay/confirm`,
      );
      last = data;
      if (data.paid || data.alreadyPaid) {
        if (!data.data) {
          last = { ...data, data: await getInvoice(id) };
        }
        return last;
      }
      if (!data.pending) return last;
    } catch (error) {
      if (attempt === maxAttempts - 1) throw extractApiError(error);
    }
    if (attempt < maxAttempts - 1) await sleep(intervalMs);
  }
  return last;
}

export async function downloadInvoicePdf(id: string, fileName: string) {
  try {
    const { data } = await client.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' });
    if (data.type.includes('json')) {
      const text = await data.text();
      let message = 'Could not download PDF';
      try {
        message = JSON.parse(text).message ?? message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw extractApiError(error);
  }
}
