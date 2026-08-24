import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  createAdminService,
  listAdminServices,
  updateAdminService,
  type AdminServiceType,
} from '@/lib/api/adminBilling';

function rateLabel(service: AdminServiceType): string {
  const n = typeof service.baseRate === 'string' ? parseFloat(service.baseRate) : Number(service.baseRate);
  return `${service.currency || 'QAR'} ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState<AdminServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminServiceType | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
    baseRate: '',
    currency: 'QAR' as 'QAR' | 'USD',
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdminServices(true));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load pricing catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q),
    );
  }, [query, rows]);

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setForm({
      code: '',
      name: '',
      category: '',
      description: '',
      baseRate: '',
      currency: 'QAR',
      isActive: true,
    });
  }

  function openEdit(service: AdminServiceType) {
    setCreating(false);
    setEditing(service);
    setForm({
      code: service.code,
      name: service.name,
      category: service.category ?? '',
      description: service.description ?? '',
      baseRate: String(service.baseRate),
      currency: (service.currency === 'USD' ? 'USD' : 'QAR') as 'QAR' | 'USD',
      isActive: service.isActive,
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const baseRate = parseFloat(form.baseRate);
    if (!form.name.trim() || !Number.isFinite(baseRate) || baseRate <= 0) {
      toast.error('Name and a positive base rate are required');
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        if (!form.code.trim()) {
          toast.error('Service code is required');
          return;
        }
        await createAdminService({
          code: form.code.trim(),
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          baseRate,
          currency: form.currency,
          isActive: form.isActive,
        });
        toast.success('Service added to catalog');
      } else if (editing) {
        await updateAdminService(editing.id, {
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          baseRate,
          currency: form.currency,
          isActive: form.isActive,
        });
        toast.success('Pricing updated');
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(service: AdminServiceType) {
    try {
      await updateAdminService(service.id, { isActive: !service.isActive });
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not update status');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Service pricing</h1>
          <p className="mt-1 text-sm text-stone-500">
            Catalog rates used for quotations and session invoices (QAR). Client-submitted unit costs cannot undercut these.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="size-4" /> Add service
          </button>
        </div>
      </div>

      <div className="max-w-md rounded-xl border border-stone-200 bg-white px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, name, or category"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {(creating || editing) && (
        <form onSubmit={onSubmit} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-stone-900">{creating ? 'New catalog service' : `Edit ${editing?.code}`}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {creating && (
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Code</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2"
                  required
                />
              </label>
            )}
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">Base rate</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.baseRate}
                onChange={(e) => setForm((f) => ({ ...f, baseRate: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">Currency</span>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as 'QAR' | 'USD' }))}
                className="w-full rounded-lg border border-stone-200 px-3 py-2"
              >
                <option value="QAR">QAR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">Category</span>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 sm:mt-7">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-stone-500">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-stone-200 px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center text-stone-500">
          <Tag className="mx-auto size-8 text-stone-300" />
          <p className="mt-2">No catalog services yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map((service) => (
                <tr key={service.id} className="hover:bg-stone-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{service.name}</p>
                    <p className="text-xs text-stone-500">
                      {service.code}
                      {service.category ? ` · ${service.category}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800">{rateLabel(service)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(service)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        service.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {service.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(service)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-teal-700 hover:bg-teal-50"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
