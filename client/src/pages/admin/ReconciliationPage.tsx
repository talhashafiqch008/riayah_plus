import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  fetchReconciliation,
  type ReconciliationReport,
} from '@/lib/api/adminBilling';

function money(amount: number, currency = 'QAR') {
  return `${currency} ${amount.toFixed(2)}`;
}

function mismatchLabel(code: string): string {
  const labels: Record<string, string> = {
    paid_invoice_no_payment: 'Paid invoice with no settlement',
    amount_mismatch: 'Amount mismatch',
    currency_mismatch: 'Currency mismatch',
    invoice_unpaid_with_payment: 'Payment on unpaid invoice',
    orphan_settlement: 'Orphan settlement',
    payment_missing_invoice: 'Payment missing invoice',
  };
  return labels[code] ?? code.replace(/_/g, ' ');
}

export default function AdminReconciliationPage() {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(
        await fetchReconciliation({
          from: from || undefined,
          to: to || undefined,
        }),
      );
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Payment reconciliation</h1>
          <p className="mt-1 text-sm text-stone-500">
            Match paid invoices to gateway settlements. Marketplace booking-only payments are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-stone-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-stone-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <RefreshCw className="size-4" /> Run
          </button>
          <Link
            to="/admin/invoices"
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            Invoices
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : !report || !summary ? (
        <p className="text-sm text-stone-500">No report available.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Matched', value: String(summary.matchedCount) },
              { label: 'Mismatches', value: String(summary.mismatchCount) },
              { label: 'Paid invoices', value: money(summary.paidInvoiceTotal) },
              { label: 'Collected', value: money(summary.collectedPaymentTotal) },
              { label: 'Delta', value: money(summary.delta) },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{card.label}</p>
                <p className="mt-1 text-xl font-semibold text-stone-900">{card.value}</p>
              </div>
            ))}
          </div>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-800">
              <AlertTriangle className="size-4" /> Mismatches ({report.mismatches.length})
            </h2>
            {report.mismatches.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-6 text-sm text-emerald-800">
                No mismatches in this range.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-stone-100 text-sm">
                  <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Issue</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Amounts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {report.mismatches.map((row, idx) => (
                      <tr key={`${row.code}-${row.invoiceId ?? row.paymentId ?? idx}`}>
                        <td className="px-4 py-3 font-medium text-rose-800">{mismatchLabel(row.code)}</td>
                        <td className="px-4 py-3 text-stone-700">
                          {row.invoiceId ? (
                            <Link to={`/admin/invoices?focus=${row.invoiceId}`} className="text-teal-700 hover:underline">
                              {row.invoiceNumber ?? row.invoiceId}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {row.paymentId ?? '—'}
                          {row.gatewayRef ? (
                            <span className="block text-xs text-stone-400">{row.gatewayRef}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-stone-700">
                          {row.invoiceTotal != null
                            ? money(row.invoiceTotal, row.invoiceCurrency)
                            : '—'}
                          {' / '}
                          {row.paymentTotal != null
                            ? money(row.paymentTotal, row.paymentCurrency)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-800">
              <CheckCircle2 className="size-4" /> Matched ({report.matched.length})
            </h2>
            {report.matched.length === 0 ? (
              <p className="text-sm text-stone-500">No matched paid invoices.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-stone-100 text-sm">
                  <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {report.matched.map((row) => (
                      <tr key={row.invoiceId}>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/invoices?focus=${row.invoiceId}`}
                            className="font-medium text-teal-700 hover:underline"
                          >
                            {row.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{money(row.amount, row.currency)}</td>
                        <td className="px-4 py-3 text-xs text-stone-500">{row.paymentIds.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
