import { adminApi } from '@/lib/admin/api';
import { extractApiError } from '@/lib/errors';

export type AdminServiceType = {
  id: string;
  code: string;
  name: string;
  label?: string | null;
  description?: string | null;
  category?: string | null;
  baseRate: string | number;
  currency: string;
  isActive: boolean;
};

export type ReconciliationMismatch = {
  code: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  invoiceTotal?: number;
  paymentTotal?: number;
  invoiceCurrency?: string;
  paymentCurrency?: string;
  gatewayRef?: string | null;
};

export type ReconciliationMatch = {
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
  matched: ReconciliationMatch[];
  mismatches: ReconciliationMismatch[];
};

export async function listAdminServices(includeInactive = true) {
  const data = await adminApi.get('/admin/services', { includeInactive: includeInactive ? 'true' : 'false' });
  return (data.services ?? data.data ?? []) as AdminServiceType[];
}

export async function createAdminService(payload: {
  code: string;
  name: string;
  baseRate: number;
  currency?: 'QAR' | 'USD';
  category?: string;
  description?: string;
  isActive?: boolean;
}) {
  try {
    return await adminApi.post('/admin/services', payload);
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function updateAdminService(
  id: string,
  payload: Partial<{
    name: string;
    baseRate: number;
    currency: 'QAR' | 'USD';
    category: string;
    description: string;
    isActive: boolean;
  }>,
) {
  try {
    return await adminApi.patch(`/admin/services/${id}`, payload);
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function fetchReconciliation(params?: { from?: string; to?: string }) {
  try {
    const data = await adminApi.get('/admin/payments/reconciliation', params);
    return data as ReconciliationReport & { success?: boolean };
  } catch (error) {
    throw extractApiError(error);
  }
}
