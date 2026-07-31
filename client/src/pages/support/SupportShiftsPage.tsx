import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  endShift,
  getActiveShift,
  getShiftHistory,
  startShift,
  type Shift,
} from '@/lib/api/shifts';
import {
  RolePageHeader,
  RolePageShell,
  btnDangerClass,
  btnPrimaryClass,
} from '@/components/care/RolePageChrome';

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
      toast.error(extractApiError(error).message || 'Failed to load shifts');
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
      toast.error(extractApiError(error).message || 'Start failed');
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
      toast.error(extractApiError(error).message || 'End failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <RolePageShell>
      <RolePageHeader
        title="My Shifts"
        description="Start your shift, then work through assigned tasks."
        actions={
          <Link to="/support/tasks" className={btnPrimaryClass}>
            Open tasks
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                  <Clock className="size-5 shrink-0 text-teal-700" /> Active shift
                </h3>
                {active ? (
                  <p className="mt-2 text-sm text-stone-700">
                    Status: <span className="font-semibold capitalize">{active.status}</span>
                    <br />
                    Started: {new Date(active.startedAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">No shift in progress.</p>
                )}
              </div>
              {active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onEnd()}
                  className={`${btnDangerClass} shrink-0`}
                >
                  <Square className="size-4" /> End shift
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onStart()}
                  className={`${btnPrimaryClass} shrink-0`}
                >
                  <Play className="size-4" /> Start shift
                </button>
              )}
            </div>
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
                    className="rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <span className="font-medium capitalize text-stone-900">{s.status}</span>
                    <span className="mt-0.5 block text-stone-500 sm:mt-0 sm:inline">
                      <span className="hidden sm:inline"> · </span>
                      {new Date(s.startedAt).toLocaleString()}
                      {s.endedAt ? ` → ${new Date(s.endedAt).toLocaleString()}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </RolePageShell>
  );
}
