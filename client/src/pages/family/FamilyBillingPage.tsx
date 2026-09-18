import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { familyDateLocale } from '@/lib/familyLanguage';
import {
  canPayInvoice,
  confirmInvoicePayment,
  formatMoney,
  getInvoice,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  listInvoices,
  type Invoice,
} from '@/lib/api/invoices';

type Tab = 'invoices' | 'quotations';

function InvoiceCard({
  invoice,
  dateLocale,
  t,
}: {
  invoice: Invoice;
  dateLocale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const isQuotation = invoice.type === 'quotation';
  return (
    <Link
      to={`/family/billing/${invoice.id}`}
      className={`block rounded-xl border p-4 shadow-sm transition ${
        invoice.status === 'overdue'
          ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
          : invoice.status === 'sent' && !isQuotation
            ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
            : 'border-stone-100 bg-white hover:border-teal-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {isQuotation ? t('billing.quotation') : t('billing.invoice')}
          </p>
          <h3 className="mt-0.5 font-semibold text-stone-900">{invoice.invoiceNumber}</h3>
          <p className="mt-1 text-sm text-stone-600">
            {formatMoney(invoice.total, invoice.currency)}
            {invoice.dueDate
              ? ` · ${t('common.due', {
                  date: new Date(invoice.dueDate).toLocaleDateString(dateLocale),
                })}`
              : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusBadgeClass(String(invoice.status))}`}
        >
          {invoiceStatusLabel(String(invoice.status))}
        </span>
      </div>
    </Link>
  );
}

export default function FamilyBillingPage() {
  const { t } = useTranslation('family');
  const dateLocale = familyDateLocale();
  const [params] = useSearchParams();
  const invoiceId = params.get('invoiceId');
  const tab = (params.get('tab') === 'quotations' ? 'quotations' : 'invoices') as Tab;
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let next = (await listInvoices()).data ?? [];
      const payable = next.filter((row) => canPayInvoice(row));
      if (payable.length) {
        const updates = await Promise.all(
          payable.map(async (row) => {
            try {
              const confirmed = await confirmInvoicePayment(row.id, { maxAttempts: 10, intervalMs: 1500 });
              if (confirmed.data) return confirmed.data;
              if (confirmed.paid || confirmed.alreadyPaid) return getInvoice(row.id);
              return row;
            } catch {
              return row;
            }
          }),
        );
        const byId = new Map(updates.map((row) => [row.id, row]));
        next = next.map((row) => byId.get(row.id) ?? row);
        if (updates.some((row, i) => row.status === 'paid' && payable[i]?.status !== 'paid')) {
          toast.success(t('billing.paymentReceived'));
        }
      }
      setRows(next);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('billing.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const quotations = useMemo(() => rows.filter((r) => r.type === 'quotation'), [rows]);
  const invoices = useMemo(() => rows.filter((r) => r.type !== 'quotation'), [rows]);
  const visible = tab === 'quotations' ? quotations : invoices;

  if (invoiceId) {
    return <Navigate to={`/family/billing/${invoiceId}`} replace />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{t('billing.title')}</h2>
          <p className="mt-1 text-stone-600">{t('billing.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          <RefreshCw className="size-4" /> {t('common.refresh')}
        </button>
      </div>

      <div className="flex gap-2">
        {(
          [
            { id: 'invoices' as const, label: t('billing.invoices'), count: invoices.length },
            { id: 'quotations' as const, label: t('billing.quotations'), count: quotations.length },
          ] as const
        ).map((item) => (
          <Link
            key={item.id}
            to={`/family/billing?tab=${item.id}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === item.id
                ? 'bg-teal-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {item.label} ({item.count})
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <Receipt className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">
            {tab === 'quotations' ? t('billing.emptyQuotations') : t('billing.emptyInvoices')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} dateLocale={dateLocale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
