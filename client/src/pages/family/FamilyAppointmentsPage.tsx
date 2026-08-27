import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { listSessions, type CareSession } from '@/lib/api/scheduling';
import StaffPersonCard from '@/components/care/StaffPersonCard';

function statusClass(status: string) {
  switch (status) {
    case 'pending':
    case 'accepted':
      return 'bg-blue-50 text-blue-800';
    case 'in_progress':
      return 'bg-teal-50 text-teal-800';
    case 'completed':
      return 'bg-emerald-50 text-emerald-800';
    case 'cancelled':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

export default function FamilyAppointmentsPage() {
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await listSessions());
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upcoming = useMemo(() => {
    const t = Date.now();
    return sessions
      .filter(
        (s) =>
          ['pending', 'accepted', 'in_progress'].includes(s.status) &&
          new Date(s.scheduledAt).getTime() >= t,
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [sessions]);
  const past = useMemo(
    () =>
      sessions
        .filter((s) => !upcoming.some((u) => u.id === s.id))
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [sessions, upcoming],
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Appointments</h2>
          <p className="mt-1 text-stone-600">
            Care sessions with your assigned clinician. Your coordinator assigns who you see —
            you pick an open time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          <Link
            to="/family/bookings/book"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Book session
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <CalendarClock className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">No care sessions yet.</p>
          <Link
            to="/family/bookings/book"
            className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Book session
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-800">
                Upcoming
              </h3>
              {upcoming.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Past
              </h3>
              {past.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: CareSession }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-stone-900">
            {new Date(session.scheduledAt).toLocaleString()}
            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
          </p>
          <p className="mt-0.5 text-sm text-stone-500 capitalize">
            {(session.type || 'session').replace(/_/g, ' ')}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(session.status)}`}
        >
          {session.status.replace(/_/g, ' ')}
        </span>
      </div>
      {session.provider ? (
        <StaffPersonCard staff={session.provider} variant="clinician" />
      ) : null}
      {session.type === 'telehealth' &&
      ['accepted', 'in_progress'].includes(session.status) ? (
        <Link
          to={`/family/telehealth/${session.id}`}
          className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Join video →
        </Link>
      ) : null}
    </article>
  );
}
