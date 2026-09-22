import { apiClient } from './client';
import i18n from '../../i18n/config';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { deleteTempFile } from '../sessionCleanup';

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
  const normalized = String(status).toLowerCase();
  const key = `status.invoice.${normalized}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  return status.replace(/_/g, ' ');
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
      const { data } = await apiClient.post<ConfirmInvoicePaymentResult>(
        `/api/invoices/${id}/pay/confirm`,
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
      if (attempt === maxAttempts - 1) throw error;
    }
    if (attempt < maxAttempts - 1) await sleep(intervalMs);
  }
  return last;
}

export async function downloadInvoicePdf(id: string, fileName: string) {
  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('File storage is unavailable on this device.');
  const target = `${dir}invoice-${Date.now()}-${safeName}`;
  const baseURL = String(apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  const authHeader = apiClient.defaults.headers.common.Authorization;
  const result = await FileSystem.downloadAsync(`${baseURL}/api/invoices/${id}/pdf`, target, {
    headers: authHeader ? { Authorization: String(authHeader) } : undefined,
  });
  if (result.status < 200 || result.status >= 300) {
    await deleteTempFile(result.uri);
    throw new Error('Could not download PDF');
  }
  try {
    if (await Sharing.isAvailableAsync()) {
      // MOB-08: warn before PHI leaves the app
      await new Promise<void>((resolve) => {
        Alert.alert(
          'Share invoice?',
          'This PDF may contain protected health information. Only share with people who are authorized to see it.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Share',
              onPress: () => {
                void Sharing.shareAsync(result.uri, {
                  mimeType: 'application/pdf',
                  dialogTitle: safeName,
                }).finally(() => resolve());
              },
            },
          ],
        );
      });
    }
  } finally {
    setTimeout(() => {
      void deleteTempFile(result.uri);
    }, 60_000);
  }
  return result.uri;
}
