import { useState } from 'react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  bookRecurringSessions,
  bookSession,
  dayOfWeekLabel,
  listAvailability,
  listSessions,
  replaceAvailability,
  type AvailabilitySlot,
  type CareSession,
} from '@/lib/api/scheduling';

type SlotDraft = { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean };

export default function CoordinatorSchedulePage() {
  const [providerId, setProviderId] = useState('');
  const [slots, setSlots] = useState<SlotDraft[]>([
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
  ]);
  const [loadedSlots, setLoadedSlots] = useState<AvailabilitySlot[]>([]);

  const [episodeId, setEpisodeId] = useState('');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [duration, setDuration] = useState(60);
  const [assignTasks, setAssignTasks] = useState(true);
  const [recurCount, setRecurCount] = useState(1);
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadAvailability() {
    if (!providerId.trim()) {
      toast.error('Enter a provider / support worker user id');
      return;
    }
    try {
      const data = await listAvailability(providerId.trim());
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
      }
      toast.success(`Loaded ${data.slots.length} slot(s)`);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load availability');
    }
  }

  async function saveAvailability() {
    if (!providerId.trim()) {
      toast.error('Enter provider id');
      return;
    }
    setBusy(true);
    try {
      const data = await replaceAvailability(providerId.trim(), slots);
      setLoadedSlots(data.slots);
      toast.success('Availability saved');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Save failed');
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
    if (!episodeId.trim() || !providerId.trim() || !scheduledLocal) {
      toast.error('Episode, provider, and time are required');
      return;
    }
    setBusy(true);
    try {
      const scheduledAt = toIso(scheduledLocal);
      if (recurCount > 1) {
        const result = await bookRecurringSessions({
          episodeId: episodeId.trim(),
          providerId: providerId.trim(),
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
          episodeId: episodeId.trim(),
          providerId: providerId.trim(),
          scheduledAt,
          durationMinutes: duration,
          assignPendingTasks: assignTasks,
        });
        toast.success('Session booked');
      }
      await loadSessions();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  async function loadSessions() {
    if (!episodeId.trim()) return;
    try {
      const rows = await listSessions({ episodeId: episodeId.trim() });
      setSessions(rows);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to list sessions');
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Schedule</h2>
        <p className="mt-1 text-stone-600">
          Manage staff availability and book care sessions with conflict detection.
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-900">Staff availability</h3>
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Provider / support worker user ID</span>
          <input
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-mono"
            placeholder="uuid"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadAvailability()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold"
          >
            <RefreshCw className="size-4" /> Load
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAvailability()}
            className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save slots
          </button>
        </div>
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <select
                value={s.dayOfWeek}
                onChange={(e) =>
                  setSlots((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, dayOfWeek: Number(e.target.value) } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm"
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
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm"
              />
              <input
                type="time"
                value={s.endTime}
                onChange={(e) =>
                  setSlots((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, endTime: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-2 py-2 text-sm"
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
            className="text-sm text-teal-700 font-medium"
          >
            + Add row
          </button>
        </div>
        {loadedSlots.length > 0 && (
          <p className="text-xs text-stone-500">{loadedSlots.length} slot(s) on server</p>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
          <CalendarPlus className="size-5 text-teal-700" /> Book session
        </h3>
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Episode ID</span>
          <input
            value={episodeId}
            onChange={(e) => setEpisodeId(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-stone-600">Start (local)</span>
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => setScheduledLocal(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm text-stone-600">Duration (min)</span>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
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
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onBook()}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Book
          </button>
          <button
            type="button"
            onClick={() => void loadSessions()}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
          >
            List sessions
          </button>
        </div>
        <ul className="divide-y divide-stone-100">
          {sessions.map((s) => (
            <li key={s.id} className="py-2 text-sm">
              <span className="font-medium text-stone-900">
                {new Date(s.scheduledAt).toLocaleString()}
              </span>
              <span className="text-stone-500">
                {' '}
                · {s.durationMinutes ?? 60}m · {s.status}
              </span>
              {s.provider?.name && (
                <span className="text-stone-600"> · {s.provider.name}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
