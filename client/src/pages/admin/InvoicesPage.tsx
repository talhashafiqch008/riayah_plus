import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  downloadInvoicePdf,
  formatMoney,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  listInvoices,
  markInvoicePaid,
  sendInvoice,
  type Invoice,
} from '@/lib/api/invoices';

type Tab = 'all' | 'invoice' | 'quotation';

export default function AdminInvoicesPage() {
  const [params] = useSearchParams();
  const focusId = params.get('focus');
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listInvoices({
        limit: 100,
        status: status || undefined,
        type: tab === 'all' ? undefined : tab,
      });
      setRows(result.data ?? []);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [status, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!focusId) return rows;
    return [...rows].sort((a, b) => Number(a.id === focusId) * -1 + Number(b.id === focusId));
  }, [focusId, rows]);

  async function onSend(id: string) {
    setBusyId(id);
    try {
      await sendInvoice(id);
      toast.success('Invoice sent');
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Send failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onMarkPaid(id: string) {
    setBusyId(id);
    try {
      await markInvoicePaid(id, { method: 'manual_admin' });
      toast.success('Marked paid');
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Mark paid failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onPdf(invoice: Invoice) {
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'PDF download failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Invoices</h1>
          <p className="mt-1 text-sm text-stone-500">
            Oversight for quotations and invoices across all families. Manual mark-paid is admin-only.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/payments/reconciliation"
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            Reconciliation
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'invoice', 'quotation'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === key ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {key === 'all' ? 'All' : key === 'invoice' ? 'Invoices' : 'Quotations'}
          </button>
        ))}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
        >
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="disputed">Disputed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center text-stone-500">
          <Receipt className="mx-auto size-8 text-stone-300" />
          <p className="mt-2">No documents match these filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {visible.map((invoice) => {
                const focused = invoice.id === focusId;
                const isQuotation = invoice.type === 'quotation';
                return (
                  <tr
                    key={invoice.id}
                    id={`invoice-${invoice.id}`}
                    className={focused ? 'bg-teal-50/50' : 'hover:bg-stone-50/80'}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{invoice.invoiceNumber}</p>
                      <p className="text-xs capitalize text-stone-500">{isQuotation ? 'Quotation' : 'Invoice'}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {invoice.client?.name ?? '—'}
                      {invoice.client?.email ? (
                        <span className="block text-xs text-stone-400">{invoice.client.email}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusBadgeClass(
                          String(invoice.status),
                        )}`}
                      >
                        {invoiceStatusLabel(String(invoice.status))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void onPdf(invoice)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                        >
                          PDF
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            type="button"
                            disabled={busyId === invoice.id}
                            onClick={() => void onSend(invoice.id)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                          >
                            Send
                          </button>
                        )}
                        {!isQuotation && ['sent', 'overdue', 'disputed'].includes(String(invoice.status)) && (
                          <button
                            type="button"
                            disabled={busyId === invoice.id}
                            onClick={() => void onMarkPaid(invoice.id)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Mark paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
