import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { listSessions, type CareSession } from '@/lib/api/scheduling';
import { formatFamilyDateTime, familySessionStatusLabel } from '@/lib/familyLanguage';

function isJoinable(session: CareSession): boolean {
  return session.type === 'telehealth' && ['accepted', 'in_progress'].includes(session.status);
}

export default function FamilyTelehealthPage() {
  const { t } = useTranslation('family');
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listSessions();
      setSessions(rows.filter((s) => s.type === 'telehealth'));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('telehealth.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const upcoming = useMemo(
    () =>
      sessions
        .filter(isJoinable)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [sessions],
  );
  const past = useMemo(
    () =>
      sessions
        .filter((s) => !isJoinable(s))
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [sessions],
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{t('telehealth.title')}</h2>
          <p className="mt-1 text-stone-600">{t('telehealth.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          <RefreshCw className="size-4" /> {t('common.refresh')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <Video className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">{t('telehealth.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-800">
                {t('telehealth.upcoming')}
              </h3>
              {upcoming.map((session) => (
                <article
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm"
                >
                  <div>
                    <h3 className="font-semibold text-stone-900">
                      {session.provider?.name ?? t('common.careTeam')}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatFamilyDateTime(session.scheduledAt)}
                    </p>
                  </div>
                  <Link
                    to={`/family/telehealth/${session.id}`}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    {t('telehealth.joinWaitingRoom')}
                  </Link>
                </article>
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                {t('telehealth.past')}
              </h3>
              {past.map((session) => (
                <article
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 bg-white p-4 text-sm text-stone-600"
                >
                  <div>
                    <span className="font-semibold text-stone-800">
                      {session.provider?.name ?? t('common.careTeam')}
                    </span>
                    {' · '}
                    {formatFamilyDateTime(session.scheduledAt)}
                    {' · '}
                    {familySessionStatusLabel(session.status)}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
