import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  cosignCarePlan,
  getCarePlan,
  type CarePlan,
} from '@/lib/api/carePlans';

export default function ClinicalCarePlanPage() {
  const { id = '' } = useParams();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlan(await getCarePlan(id));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCosign() {
    setBusy(true);
    try {
      const result = await cosignCarePlan(id, notes.trim() || undefined);
      setPlan(result.data);
      toast.success(result.message);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Co-sign failed');
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

  if (!plan) return <p className="text-stone-600">Plan not found.</p>;

  const already =
    plan.approvalLogs?.some((l) => l.action === 'clinical_cosign') ?? false;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/clinical/notes"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{plan.title}</h2>
          <p className="mt-1 text-sm text-stone-500">Read-only clinical review · v{plan.version}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
        >
          {carePlanStatusLabel(plan.status)}
        </span>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-2">
        <h3 className="font-semibold text-stone-900">Goals</h3>
        {(plan.goals ?? []).map((g) => (
          <p key={g.id} className="text-sm text-stone-700">
            • {g.title}
            {g.status === 'achieved' ? ' (achieved)' : ''}
          </p>
        ))}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-2">
        <h3 className="font-semibold text-stone-900">Services</h3>
        {(plan.items ?? []).map((i) => (
          <p key={i.id} className="text-sm text-stone-700">
            • {i.serviceType}
            {i.frequency ? ` · ${i.frequency}` : ''}
          </p>
        ))}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-3">Approval log</h3>
        <ul className="space-y-2 text-sm">
          {(plan.approvalLogs ?? []).map((log) => (
            <li key={log.id} className="text-stone-700">
              <span className="font-medium">{log.action}</span>
              <span className="text-stone-500">
                {' '}
                · {new Date(log.createdAt).toLocaleString()}
              </span>
              {log.notes && <p className="text-stone-600">{log.notes}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-teal-100 bg-teal-50/40 p-5 space-y-3">
        <h3 className="font-semibold text-stone-900 inline-flex items-center gap-2">
          <PenLine className="size-4 text-teal-700" /> Clinical co-sign
        </h3>
        <p className="text-sm text-stone-600">
          Optional attestation — does not change plan status. Allowed when submitted, approved, or
          active.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional co-sign notes"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCosign()}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {already ? 'Co-sign again (idempotent)' : 'Co-sign plan'}
        </button>
      </section>
    </div>
  );
}
