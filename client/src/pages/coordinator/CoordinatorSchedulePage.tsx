import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';
import {
  bookRecurringSessions,
  bookSession,
  completeSession,
  dayOfWeekLabel,
  listAvailability,
  listScheduleStaff,
  listSessions,
  replaceAvailability,
  scheduleStaffRoleLabel,
  type AvailabilitySlot,
  type CareSession,
  type ScheduleStaffOption,
} from '@/lib/api/scheduling';
import {
  RolePageHeader,
  RolePageShell,
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';
import StaffPersonCard from '@/components/care/StaffPersonCard';

type SlotDraft = { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean };

const DEFAULT_SLOTS: SlotDraft[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
];

function episodeOptionLabel(ep: CareEpisode): string {
  const patient = ep.careRecipient?.name || ep.patient?.name;
  const status = ep.status.replace(/_/g, ' ');
  return patient ? `${ep.title} · ${patient} (${status})` : `${ep.title} (${status})`;
}

function staffOptionLabel(s: ScheduleStaffOption): string {
  const langs = s.languages?.length ? ` · ${s.languages.slice(0, 2).join(', ')}` : '';
  return `${s.name} · ${scheduleStaffRoleLabel(s.role)}${langs}`;
}

export default function CoordinatorSchedulePage() {
  const [staff, setStaff] = useState<ScheduleStaffOption[]>([]);
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [bootLoading, setBootLoading] = useState(true);

  const [providerId, setProviderId] = useState('');
  const [slots, setSlots] = useState<SlotDraft[]>(DEFAULT_SLOTS);
  const [loadedSlots, setLoadedSlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [episodeId, setEpisodeId] = useState('');
  const [sessionType, setSessionType] = useState<'telehealth' | 'in_person' | 'home_visit'>('telehealth');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [duration, setDuration] = useState(60);
  const [assignTasks, setAssignTasks] = useState(true);
  const [recurCount, setRecurCount] = useState(1);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [busy, setBusy] = useState(false);

  const selectedStaff = useMemo(
    () => staff.find((s) => s.id === providerId) ?? null,
    [staff, providerId],
  );

  const boot = useCallback(async () => {
    setBootLoading(true);
    try {
      const [staffRows, epResult] = await Promise.all([
        listScheduleStaff(),
        listEpisodes({ limit: 50 }),
      ]);
      setStaff(staffRows);
      setEpisodes(epResult.data);
      setProviderId((current) => current || (staffRows.length === 1 ? staffRows[0].id : ''));
      setEpisodeId((current) => current || (epResult.data.length === 1 ? epResult.data[0].id : ''));
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Failed to load schedule options');
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  const loadAvailability = useCallback(
    async (id: string, quiet = false) => {
      if (!id) return;
      setAvailabilityLoading(true);
      try {
        const data = await listAvailability(id);
        setLoadedSlots(data.slots);
        if (data.slots.length) {
          setSlots(
            data.slots.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              isAvailable: s.isAvailable,
            })),
          );
        } else {
          setSlots(DEFAULT_SLOTS);
        }
        if (!quiet) toast.success(`Loaded ${data.slots.length} slot(s)`);
      } catch (error: unknown) {
        toast.error(extractApiError(error).message || 'Failed to load availability');
      } finally {
        setAvailabilityLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!providerId) {
      setLoadedSlots([]);
      setSlots(DEFAULT_SLOTS);
      return;
    }
    void loadAvailability(providerId, true);
  }, [providerId, loadAvailability]);

  const loadSessions = useCallback(async (id: string, quiet = false) => {
    if (!id) {
      setSessions([]);
      return;
    }
    try {
      const rows = await listSessions({ episodeId: id });
      setSessions(rows);
      if (!quiet) toast.success(`${rows.length} session(s)`);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Failed to list sessions');
    }
  }, []);

  useEffect(() => {
    if (!episodeId) {
      setSessions([]);
      return;
    }
    void loadSessions(episodeId, true);
  }, [episodeId, loadSessions]);

  async function saveAvailability() {
    if (!providerId) {
      toast.error('Select a staff member');
      return;
    }
    setBusy(true);
    try {
      const data = await replaceAvailability(providerId, slots);
      setLoadedSlots(data.slots);
      toast.success(`Saved availability for ${selectedStaff?.name ?? 'staff'}`);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function toIso(local: string) {
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid datetime');
    return d.toISOString();
  }

  async function onBook() {
    if (!episodeId || !providerId || !scheduledLocal) {
      toast.error('Select episode, staff, and start time');
      return;
    }
    setBusy(true);
    try {
      const scheduledAt = toIso(scheduledLocal);
      if (recurCount > 1) {
        const result = await bookRecurringSessions({
          episodeId,
          providerId,
          type: sessionType,
          scheduledAt,
          durationMinutes: duration,
          assignPendingTasks: assignTasks,
          recurrence: { frequency: 'weekly', count: recurCount },
        });
        toast.success(`Created ${result.created} session(s)`);
        if (result.skipped.length) {
          toast(`${result.skipped.length} occurrence(s) skipped (conflict)`, { icon: '⚠️' });
        }
      } else {
        await bookSession({
          episodeId,
          providerId,
          type: sessionType,
          scheduledAt,
          durationMinutes: duration,
          assignPendingTasks: assignTasks,
        });
        toast.success(
          assignTasks
            ? 'Session booked — pending tasks assigned to this worker'
            : 'Session booked',
        );
      }
      await loadSessions(episodeId, true);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  if (bootLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <RolePageShell>
      <RolePageHeader
        title="Schedule"
        description="Set staff availability and book care sessions — pick people and episodes from your org."
        actions={
          <button type="button" onClick={() => void boot()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" /> Refresh lists
          </button>
        }
      />

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-semibold text-stone-900">Staff availability</h3>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Staff member</span>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select staff…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {staffOptionLabel(s)}
              </option>
            ))}
          </select>
          {staff.length === 0 && (
            <p className="text-xs text-amber-700">
              No schedulable staff in your organization yet. Invite support or clinical staff from
              the Org portal.
            </p>
          )}
          {selectedStaff ? (
            <div className="pt-2">
              <StaffPersonCard
                staff={selectedStaff}
                variant={
                  selectedStaff.role === 'support_worker' || selectedStaff.role === 'caregiver'
                    ? 'support'
                    : 'clinician'
                }
              />
            </div>
          ) : null}
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={!providerId || availabilityLoading}
            onClick={() => void loadAvailability(providerId)}
            className={btnSecondaryClass}
          >
            {availabilityLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}{' '}
            Reload slots
          </button>
          <button
            type="button"
            disabled={busy || !providerId}
            onClick={() => void saveAvailability()}
            className={btnPrimaryClass}
          >
            Save slots
          </button>
        </div>

        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={s.dayOfWeek}
                onChange={(e) =>
                  setSlots((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, dayOfWeek: Number(e.target.value) } : r)),
                  )
                }
                className={fieldClass}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {dayOfWeekLabel(d)}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={s.startTime}
                onChange={(e) =>
                  setSlots((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, startTime: e.target.value } : r)),
                  )
                }
                className={fieldClass}
              />
              <input
                type="time"
                value={s.endTime}
                onChange={(e) =>
                  setSlots((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, endTime: e.target.value } : r)),
                  )
                }
                className={fieldClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSlots((rows) => [
                ...rows,
                { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isAvailable: true },
              ])
            }
            className="min-h-11 text-sm font-medium text-teal-700"
          >
            + Add row
          </button>
        </div>
        {loadedSlots.length > 0 && (
          <p className="text-xs text-stone-500">{loadedSlots.length} slot(s) on server</p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="flex items-center gap-2 font-semibold text-stone-900">
          <CalendarPlus className="size-5 text-teal-700" /> Book session
        </h3>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Care episode</span>
          <select
            value={episodeId}
            onChange={(e) => setEpisodeId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select episode…</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {episodeOptionLabel(ep)}
              </option>
            ))}
          </select>
          {episodes.length === 0 && (
            <p className="text-xs text-amber-700">
              No episodes yet. Complete intake review to create a care journey first.
            </p>
          )}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Assign to staff</span>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select staff…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {staffOptionLabel(s)}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-500">
            Same staff list as availability — prefer a support worker for in-home delivery tasks.
          </p>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Session type</span>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as typeof sessionType)}
            className={fieldClass}
          >
            <option value="telehealth">Telehealth (video call)</option>
            <option value="in_person">In-person</option>
            <option value="home_visit">Home visit</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Start (local)</span>
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => setScheduledLocal(e.target.value)}
            className={fieldClass}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm text-stone-600">Duration (min)</span>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
              className={fieldClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-stone-600">Weekly occurrences</span>
            <input
              type="number"
              min={1}
              max={52}
              value={recurCount}
              onChange={(e) => setRecurCount(Number(e.target.value) || 1)}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={assignTasks}
            onChange={(e) => setAssignTasks(e.target.checked)}
          />
          Assign pending episode tasks to this worker
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={busy || !episodeId || !providerId || !scheduledLocal}
            onClick={() => void onBook()}
            className={btnPrimaryClass}
          >
            Book
          </button>
          <button
            type="button"
            disabled={!episodeId}
            onClick={() => void loadSessions(episodeId)}
            className={btnSecondaryClass}
          >
            Refresh sessions
          </button>
        </div>

        <ul className="divide-y divide-stone-100">
          {sessions.length === 0 && episodeId && (
            <li className="py-2 text-sm text-stone-500">No sessions booked for this episode yet.</li>
          )}
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span className="font-medium text-stone-900">
                  {new Date(s.scheduledAt).toLocaleString()}
                </span>
                <span className="text-stone-500">
                  {' '}· {s.durationMinutes ?? 60}m
                </span>
                <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  s.status === 'completed' ? 'bg-teal-50 text-teal-700' :
                  s.status === 'accepted' ? 'bg-blue-50 text-blue-700' :
                  s.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                  'bg-stone-100 text-stone-600'
                }`}>
                  {s.status}
                </span>
                {s.provider?.name && (
                  <span className="ml-1.5 text-stone-600">· {s.provider.name}</span>
                )}
              </div>
              {(s.status === 'accepted' || s.status === 'in_progress') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await completeSession(s.id);
                      toast.success('Session completed — invoice generated');
                      await loadSessions(episodeId, true);
                    } catch (error: unknown) {
                      toast.error(extractApiError(error).message || 'Could not complete session');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="shrink-0 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Complete
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </RolePageShell>
  );
}
