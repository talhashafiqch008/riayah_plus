import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  endShift,
  getActiveShift,
  getShiftHistory,
  startShift,
  type Shift,
} from '@/lib/api/shifts';

export default function SupportShiftsPage() {
  const [active, setActive] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([getActiveShift(), getShiftHistory()]);
      setActive(a);
      setHistory(h);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onStart() {
    setBusy(true);
    try {
      const result = await startShift();
      setActive(result.data);
      toast.success(result.message ?? 'Shift started');
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Start failed');
    } finally {
      setBusy(false);
    }
  }

  async function onEnd() {
    if (!active) return;
    setBusy(true);
    try {
      await endShift(active.id);
      toast.success('Shift ended');
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'End failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">My Shifts</h2>
          <p className="mt-1 text-stone-600">Start your shift, then work through assigned tasks.</p>
        </div>
        <Link
          to="/support/tasks"
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white text-center"
        >
          Open tasks
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-stone-900 inline-flex items-center gap-2">
              <Clock className="size-5 text-teal-700" /> Active shift
            </h3>
            {active ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-700">
                  Status: <span className="font-semibold">{active.status}</span>
                  <br />
                  Started: {new Date(active.startedAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onEnd()}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
                >
                  <Square className="size-4" /> End shift
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onStart()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Play className="size-4" /> Start shift
              </button>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-stone-900">History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-stone-500">No past shifts.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-stone-100 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <span className="font-medium text-stone-900">{s.status}</span>
                    <span className="text-stone-500">
                      {' '}
                      · {new Date(s.startedAt).toLocaleString()}
                      {s.endedAt ? ` → ${new Date(s.endedAt).toLocaleString()}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
