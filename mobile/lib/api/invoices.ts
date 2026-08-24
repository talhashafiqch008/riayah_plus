import { apiClient } from './client';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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
  const { data } = await apiClient.get<{ data: Invoice[]; total?: number }>('/api/invoices', {
    params,
  });
  return data;
}

export async function getInvoice(id: string) {
  const { data } = await apiClient.get<{ data: Invoice }>(`/api/invoices/${id}`);
  return data.data;
}

export async function payInvoice(id: string, returnUrl?: string) {
  const { data } = await apiClient.post<PayInvoiceResult>(`/api/invoices/${id}/pay`, {
    returnUrl: returnUrl ?? `raiyah://family/invoices/${id}`,
  });
  return data;
}

export async function confirmInvoicePayment(id: string) {
  const { data } = await apiClient.post<{
    success?: boolean;
    paid?: boolean;
    alreadyPaid?: boolean;
    pending?: boolean;
    data?: Invoice;
  }>(`/api/invoices/${id}/pay/confirm`);
  return data;
}

export async function downloadInvoicePdf(id: string, fileName: string) {
  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('File storage is unavailable on this device.');
  const target = `${dir}${safeName}`;
  const baseURL = String(apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  const authHeader = apiClient.defaults.headers.common.Authorization;
  const result = await FileSystem.downloadAsync(`${baseURL}/api/invoices/${id}/pdf`, target, {
    headers: authHeader ? { Authorization: String(authHeader) } : undefined,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('Could not download PDF');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: safeName });
  }
  return result.uri;
}
