import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { completeTask, listMyTasks, type Task } from '@/lib/api/shifts';

function statusClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-800';
    case 'in_progress':
      return 'bg-blue-50 text-blue-800';
    case 'cancelled':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-amber-50 text-amber-800';
  }
}

export default function SupportTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [evidenceById, setEvidenceById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMyTasks();
      setTasks(result.data);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onComplete(task: Task) {
    setBusyId(task.id);
    try {
      const evidence = evidenceById[task.id]?.trim();
      await completeTask(task.id, {
        completionEvidence: evidence || undefined,
        notes: evidence ? undefined : 'Completed on shift',
      });
      toast.success('Task completed');
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Complete failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Tasks</h2>
          <p className="mt-1 text-stone-600">
            Complete assigned care tasks and attach evidence URLs when needed.
          </p>
        </div>
        <Link
          to="/support/shifts"
          className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 text-center"
        >
          My shifts
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">No tasks assigned to you yet.</p>
          <p className="mt-1 text-sm text-stone-500">
            Ask your coordinator to assign episode tasks or book a session with task assignment.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-stone-900">{task.title}</h3>
                  {task.description && (
                    <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(task.status)}`}
                >
                  {task.status}
                </span>
              </div>

              {task.status !== 'completed' && (
                <div className="space-y-2">
                  <input
                    value={evidenceById[task.id] ?? ''}
                    onChange={(e) =>
                      setEvidenceById((m) => ({ ...m, [task.id]: e.target.value }))
                    }
                    placeholder="Evidence URL (optional)"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => void onComplete(task)}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-4" /> Complete
                  </button>
                </div>
              )}

              {task.completionEvidence && (
                <p className="text-xs text-stone-500">
                  Evidence:{' '}
                  <a
                    href={task.completionEvidence}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 hover:underline break-all"
                  >
                    {task.completionEvidence}
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
