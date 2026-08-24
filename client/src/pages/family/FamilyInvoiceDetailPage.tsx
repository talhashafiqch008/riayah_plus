import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  canPayInvoice,
  confirmInvoicePayment,
  downloadInvoicePdf,
  formatMoney,
  getInvoice,
  invoiceLineItems,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  payInvoice,
  type Invoice,
} from '@/lib/api/invoices';

export default function FamilyInvoiceDetailPage() {
  const { id = '' } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let next = await getInvoice(id);
      if (canPayInvoice(next)) {
        try {
          const confirmed = await confirmInvoicePayment(id);
          if (confirmed.data) next = confirmed.data;
          if (confirmed.paid && !confirmed.alreadyPaid) {
            toast.success('Payment received');
          }
        } catch {
          /* PayTabs query is best-effort after hosted checkout */
        }
      }
      setInvoice(next);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPay() {
    if (!invoice) return;
    setBusy(true);
    try {
      const result = await payInvoice(invoice.id);
      if (result.alreadyPaid) {
        toast.success('This invoice is already paid');
        await load();
        return;
      }
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      toast.error('Payment could not be started');
    } catch (error: unknown) {
      const message = isApiError(error) ? error.message : 'Payment failed';
      if (isApiError(error) && error.statusCode === 503) {
        toast.error('Online payment is not available yet. Your care team can take payment another way.');
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!invoice) return;
    setBusy(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'PDF download failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl">
        <p className="text-stone-600">This document was not found.</p>
        <Link to="/family/billing" className="mt-4 inline-flex text-sm font-semibold text-teal-700">
          Back to billing
        </Link>
      </div>
    );
  }

  const isQuotation = invoice.type === 'quotation';
  const lines = invoiceLineItems(invoice);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to={isQuotation ? '/family/billing?tab=quotations' : '/family/billing'}
        className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" /> Billing
      </Link>

      <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {isQuotation ? 'Quotation' : 'Invoice'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900">{invoice.invoiceNumber}</h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusBadgeClass(String(invoice.status))}`}
          >
            {invoiceStatusLabel(String(invoice.status))}
          </span>
        </div>

        {isQuotation && (
          <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            This is an estimate from your approved care plan. You will receive a separate invoice after
            services are completed.
          </p>
        )}

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-stone-500">Total</dt>
            <dd className="font-semibold text-stone-900">
              {formatMoney(invoice.total, invoice.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Tax</dt>
            <dd className="text-stone-800">
              {formatMoney(invoice.taxAmount, invoice.currency)} (
              {(Number(invoice.taxRate) * 100).toFixed(0)}%)
            </dd>
          </div>
          {invoice.dueDate && (
            <div>
              <dt className="text-stone-500">Due</dt>
              <dd className="text-stone-800">{new Date(invoice.dueDate).toLocaleDateString('en-QA')}</dd>
            </div>
          )}
          {invoice.paidAt && (
            <div>
              <dt className="text-stone-500">Paid</dt>
              <dd className="text-stone-800">{new Date(invoice.paidAt).toLocaleDateString('en-QA')}</dd>
            </div>
          )}
        </dl>

        {lines.length > 0 && (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-stone-500">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium text-right">Qty</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.description}-${index}`} className="border-b border-stone-50">
                  <td className="py-2 text-stone-800">{line.description}</td>
                  <td className="py-2 text-right text-stone-600">{line.quantity}</td>
                  <td className="py-2 text-right text-stone-800">
                    {formatMoney(line.quantity * line.unitPrice, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {canPayInvoice(invoice) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPay()}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              Pay now
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onPdf()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-60"
          >
            <Download className="size-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
