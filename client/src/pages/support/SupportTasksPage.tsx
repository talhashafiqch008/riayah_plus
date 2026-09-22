import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import { completeTask, listMyTasks, type Task } from '@/lib/api/shifts';
import { familyDateLocale } from '@/lib/familyLanguage';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';
import {
  RolePageHeader,
  RolePageShell,
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

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

function taskContext(task: Task) {
  const ep = task.careEpisode;
  if (!ep) return null;
  const who = ep.careRecipient?.name || ep.patient?.name;
  return {
    who,
    episodeTitle: ep.title,
    coordinator: ep.coordinator?.name,
    assigner: task.assigner?.name,
    dueAt: task.dueAt,
  };
}

export default function SupportTasksPage() {
  const { t } = useTranslation('support');
  const dateLocale = familyDateLocale();
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
      toast.error(extractApiError(error).message || t('tasks.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onComplete(task: Task) {
    setBusyId(task.id);
    try {
      const evidence = evidenceById[task.id]?.trim();
      await completeTask(task.id, {
        completionEvidence: evidence || undefined,
        notes: evidence ? undefined : t('tasks.defaultNotes'),
      });
      toast.success(t('tasks.completedToast'));
      await load();
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('tasks.completeFailed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RolePageShell>
      <RolePageHeader
        title={t('tasks.title')}
        description={t('tasks.description')}
        actions={
          <Link to="/support/shifts" className={btnSecondaryClass}>
            {t('tasks.myShifts')}
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center sm:p-10">
          <ClipboardList className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">{t('tasks.empty')}</p>
          <p className="mt-1 text-sm text-stone-500">{t('tasks.emptyHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const ctx = taskContext(task);
            return (
              <li
                key={task.id}
                className="space-y-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold text-stone-900">
                      {localizeGeneratedLabel(task.title) || task.title}
                    </h3>
                    {ctx && (
                      <dl className="mt-2 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                        {ctx.who && (
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                              {t('tasks.client')}
                            </span>
                            <p className="font-medium text-stone-800">
                              {localizeGeneratedLabel(ctx.who) || ctx.who}
                            </p>
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                            {t('tasks.careJourney')}
                          </span>
                          <p className="break-words">
                            {localizeGeneratedLabel(ctx.episodeTitle) || ctx.episodeTitle}
                          </p>
                        </div>
                        {(ctx.coordinator || ctx.assigner) && (
                          <p className="text-xs text-stone-500 sm:col-span-2">
                            {t('tasks.assignedBy', {
                              name: ctx.assigner || ctx.coordinator,
                            })}
                            {ctx.dueAt
                              ? ` · ${t('tasks.due', {
                                  date: new Date(ctx.dueAt).toLocaleString(dateLocale),
                                })}`
                              : ''}
                          </p>
                        )}
                      </dl>
                    )}
                    {task.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-600">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(task.status)}`}
                  >
                    {t(`tasks.status.${task.status}`, {
                      defaultValue: task.status.replace(/_/g, ' '),
                    })}
                  </span>
                </div>

                {task.status !== 'completed' && (
                  <div className="space-y-2">
                    <input
                      value={evidenceById[task.id] ?? ''}
                      onChange={(e) =>
                        setEvidenceById((m) => ({ ...m, [task.id]: e.target.value }))
                      }
                      placeholder={t('tasks.evidencePlaceholder')}
                      className={fieldClass}
                    />
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => void onComplete(task)}
                      className={btnPrimaryClass}
                    >
                      <CheckCircle2 className="size-4" /> {t('tasks.complete')}
                    </button>
                  </div>
                )}

                {task.completionEvidence && (
                  <p className="text-xs text-stone-500">
                    {t('tasks.evidence')}:{' '}
                    <a
                      href={task.completionEvidence}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-teal-700 hover:underline"
                    >
                      {task.completionEvidence}
                    </a>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </RolePageShell>
  );
}
