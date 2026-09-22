import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { createCarePlan, listCarePlans, type GoalInput, type ItemInput } from '@/lib/api/carePlans';
import {
  approveAiIntakeSummary,
  getAiIntakeSummary,
  triggerAiCarePlanDraft,
  type AiIntakeSummary,
} from '@/lib/api/clinicalNotes';
import { getEpisode, type CareEpisode } from '@/lib/api/episodes';
import { localizeChip, localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';

const emptyGoal = (): GoalInput => ({ title: '', description: '', measurement: '' });
const emptyItem = (): ItemInput => ({ serviceType: '', frequency: '', duration: '' });

export default function CoordinatorCarePlanBuilderPage() {
  const { t } = useTranslation('coordinator');
  const { episodeId = '' } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<CareEpisode | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState<GoalInput[]>([emptyGoal()]);
  const [items, setItems] = useState<ItemInput[]>([emptyItem()]);
  const [summary, setSummary] = useState<AiIntakeSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const load = useCallback(async () => {
    if (!episodeId) return;
    try {
      const [ep, ai] = await Promise.all([
        getEpisode(episodeId),
        getAiIntakeSummary(episodeId).catch(() => null),
      ]);
      setEpisode(ep);
      setTitle(
        ep.title
          ? t('plans.builder.carePlanPrefix', { title: localizeGeneratedLabel(ep.title) })
          : t('plans.builder.carePlanDefault'),
      );
      setSummary(ai);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.builder.loadFailed'));
    }
  }, [episodeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!title.trim()) {
      toast.error(t('plans.builder.titleRequired'));
      return;
    }
    setSaving(true);
    try {
      const plan = await createCarePlan({
        episodeId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        goals: goals.filter((g) => g.title.trim()),
        items: items.filter((i) => i.serviceType.trim()),
      });
      toast.success(t('plans.builder.created'));
      navigate(`/coordinator/plans/${plan.id}`);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.builder.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function onAiDraft() {
    setAiBusy(true);
    try {
      await triggerAiCarePlanDraft(episodeId);
      toast.success(t('plans.builder.aiRequested'));
      const plans = await listCarePlans({ episodeId });
      const draft = plans.find((p) => p.status === 'draft' && p.isCurrentVersion);
      if (draft) navigate(`/coordinator/plans/${draft.id}`);
      else toast(t('plans.builder.aiProcessing'));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.builder.aiFailed'));
    } finally {
      setAiBusy(false);
    }
  }

  async function onApproveSummary() {
    try {
      await approveAiIntakeSummary(episodeId);
      toast.success(t('plans.builder.summaryApproved'));
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.builder.approveFailed'));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/coordinator/plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4 rtl-flip" /> {t('plans.builder.back')}
      </Link>

      <div>
        <h2 className="text-2xl font-semibold text-stone-900">{t('plans.builder.title')}</h2>
        <p className="mt-1 text-stone-600">
          {episode
            ? localizeGeneratedLabel(episode.title)
            : t('plans.builder.episodeFallback', { id: episodeId.slice(0, 8) })}
        </p>
      </div>

      {summary && (
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-stone-900">{t('plans.builder.aiSummary')}</h3>
            <span className="text-xs font-semibold uppercase text-teal-800">
              {t(`plans.status.${summary.status}`, { defaultValue: summary.status })}
            </span>
          </div>
          {summary.clinicalImpressions && (
            <p className="text-sm text-stone-700">{summary.clinicalImpressions}</p>
          )}
          {(summary.keyConcerns?.length ?? 0) > 0 && (
            <ul className="text-sm text-stone-600 list-disc ps-5">
              {summary.keyConcerns!.map((c) => (
                <li key={c}>{localizeChip(c)}</li>
              ))}
            </ul>
          )}
          {summary.status === 'draft' && (
            <button
              type="button"
              onClick={() => void onApproveSummary()}
              className="rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white"
            >
              {t('plans.builder.approveSummary')}
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">{t('plans.builder.fieldTitle')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">{t('plans.builder.fieldNotes')}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t('plans.builder.goals')}</h3>
            <button
              type="button"
              onClick={() => setGoals((g) => [...g, emptyGoal()])}
              className="inline-flex items-center gap-1 text-sm text-teal-700"
            >
              <Plus className="size-4" /> {t('plans.builder.add')}
            </button>
          </div>
          {goals.map((g, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] border border-stone-100 rounded-xl p-3">
              <input
                placeholder={t('plans.builder.goalTitle')}
                value={g.title}
                onChange={(e) =>
                  setGoals((rows) => rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder={t('plans.builder.measurement')}
                value={g.measurement ?? ''}
                onChange={(e) =>
                  setGoals((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, measurement: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setGoals((rows) => rows.filter((_, j) => j !== i))}
                className="text-stone-400 hover:text-rose-600"
              >
                <Trash2 className="size-4" />
              </button>
              <input
                placeholder={t('plans.builder.description')}
                value={g.description ?? ''}
                onChange={(e) =>
                  setGoals((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)),
                  )
                }
                className="sm:col-span-3 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t('plans.builder.services')}</h3>
            <button
              type="button"
              onClick={() => setItems((rows) => [...rows, emptyItem()])}
              className="inline-flex items-center gap-1 text-sm text-teal-700"
            >
              <Plus className="size-4" /> {t('plans.builder.add')}
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4 border border-stone-100 rounded-xl p-3">
              <input
                placeholder={t('plans.builder.serviceType')}
                value={item.serviceType}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, serviceType: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder={t('plans.builder.frequency')}
                value={item.frequency ?? ''}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, frequency: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder={t('plans.builder.duration')}
                value={item.duration ?? ''}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, duration: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={t('plans.builder.unitCost')}
                  value={item.unitCost ?? ''}
                  onChange={(e) =>
                    setItems((rows) =>
                      rows.map((r, j) =>
                        j === i
                          ? { ...r, unitCost: e.target.value ? Number(e.target.value) : undefined }
                          : r,
                      ),
                    )
                  }
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setItems((rows) => rows.filter((_, j) => j !== i))}
                  className="text-stone-400 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void onCreate()}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? t('plans.builder.saving') : t('plans.builder.createDraft')}
          </button>
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void onAiDraft()}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {aiBusy ? t('plans.builder.generating') : t('plans.builder.generateAi')}
          </button>
        </div>
      </div>
    </div>
  );
}
