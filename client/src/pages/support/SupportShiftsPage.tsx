import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { familyDateLocale } from '@/lib/familyLanguage';
import {
  RolePageHeader,
  RolePageShell,
  btnDangerClass,
  btnPrimaryClass,
} from '@/components/care/RolePageChrome';

export default function SupportShiftsPage() {
  const { t } = useTranslation('support');
  const dateLocale = familyDateLocale();
  const [active, setActive] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const statusLabel = (status: string) =>
    t(`shifts.statusLabel.${status}`, { defaultValue: status.replace(/_/g, ' ') });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([getActiveShift(), getShiftHistory()]);
      setActive(a);
      setHistory(h);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('shifts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onStart() {
    setBusy(true);
    try {
      const result = await startShift();
      setActive(result.data);
      toast.success(result.message ?? t('shifts.startedToast'));
      await load();
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('shifts.startFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onEnd() {
    if (!active) return;
    setBusy(true);
    try {
      await endShift(active.id);
      toast.success(t('shifts.endedToast'));
      await load();
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('shifts.endFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <RolePageShell>
      <RolePageHeader
        title={t('shifts.title')}
        description={t('shifts.description')}
        actions={
          <Link to="/support/tasks" className={btnPrimaryClass}>
            {t('shifts.openTasks')}
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
                  <Clock className="size-5 shrink-0 text-teal-700" /> {t('shifts.activeShift')}
                </h3>
                {active ? (
                  <p className="mt-2 text-sm text-stone-700">
                    {t('shifts.status')}:{' '}
                    <span className="font-semibold">{statusLabel(active.status)}</span>
                    <br />
                    {t('shifts.started')}: {new Date(active.startedAt).toLocaleString(dateLocale)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">{t('shifts.noActive')}</p>
                )}
              </div>
              {active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onEnd()}
                  className={`${btnDangerClass} shrink-0`}
                >
                  <Square className="size-4" /> {t('shifts.end')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onStart()}
                  className={`${btnPrimaryClass} shrink-0`}
                >
                  <Play className="size-4" /> {t('shifts.start')}
                </button>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-stone-900">{t('shifts.history')}</h3>
            {history.length === 0 ? (
              <p className="text-sm text-stone-500">{t('shifts.noHistory')}</p>
            ) : (
              <ul className="space-y-2">
                {history.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <span className="font-medium text-stone-900">{statusLabel(s.status)}</span>
                    <span className="mt-0.5 block text-stone-500 sm:mt-0 sm:inline">
                      <span className="hidden sm:inline"> · </span>
                      {new Date(s.startedAt).toLocaleString(dateLocale)}
                      {s.endedAt ? ` → ${new Date(s.endedAt).toLocaleString(dateLocale)}` : ''}
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
