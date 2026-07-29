import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

const emptyGoal = (): GoalInput => ({ title: '', description: '', measurement: '' });
const emptyItem = (): ItemInput => ({ serviceType: '', frequency: '', duration: '' });

export default function CoordinatorCarePlanBuilderPage() {
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
      setTitle(ep.title ? `Care plan — ${ep.title}` : 'Care plan');
      setSummary(ai);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load episode');
    }
  }, [episodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!title.trim()) {
      toast.error('Title is required');
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
      toast.success('Care plan created');
      navigate(`/coordinator/plans/${plan.id}`);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  }

  async function onAiDraft() {
    setAiBusy(true);
    try {
      await triggerAiCarePlanDraft(episodeId);
      toast.success('AI draft requested — loading plans…');
      const plans = await listCarePlans({ episodeId });
      const draft = plans.find((p) => p.status === 'draft' && p.isCurrentVersion);
      if (draft) navigate(`/coordinator/plans/${draft.id}`);
      else toast('Draft may still be processing — check Care Plans list');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'AI draft failed');
    } finally {
      setAiBusy(false);
    }
  }

  async function onApproveSummary() {
    try {
      const updated = await approveAiIntakeSummary(episodeId);
      setSummary(updated);
      toast.success('AI intake summary approved');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Approve failed');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/coordinator/plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4" /> Back to plans
      </Link>

      <div>
        <h2 className="text-2xl font-semibold text-stone-900">New care plan</h2>
        <p className="mt-1 text-stone-600">
          {episode ? episode.title : `Episode ${episodeId}`}
        </p>
      </div>

      {summary && (
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-stone-900">AI intake summary</h3>
            <span className="text-xs font-semibold uppercase text-teal-800">{summary.status}</span>
          </div>
          {summary.clinicalImpressions && (
            <p className="text-sm text-stone-700">{summary.clinicalImpressions}</p>
          )}
          {(summary.keyConcerns?.length ?? 0) > 0 && (
            <ul className="text-sm text-stone-600 list-disc pl-5">
              {summary.keyConcerns!.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {summary.status === 'draft' && (
            <button
              type="button"
              onClick={() => void onApproveSummary()}
              className="rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Approve summary
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">Goals</h3>
            <button
              type="button"
              onClick={() => setGoals((g) => [...g, emptyGoal()])}
              className="inline-flex items-center gap-1 text-sm text-teal-700"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
          {goals.map((g, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] border border-stone-100 rounded-xl p-3">
              <input
                placeholder="Goal title"
                value={g.title}
                onChange={(e) =>
                  setGoals((rows) => rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="Measurement"
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
                placeholder="Description"
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
            <h3 className="font-semibold text-stone-900">Services</h3>
            <button
              type="button"
              onClick={() => setItems((rows) => [...rows, emptyItem()])}
              className="inline-flex items-center gap-1 text-sm text-teal-700"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4 border border-stone-100 rounded-xl p-3">
              <input
                placeholder="Service type"
                value={item.serviceType}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, serviceType: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="Frequency"
                value={item.frequency ?? ''}
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, frequency: e.target.value } : r)),
                  )
                }
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="Duration"
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
                  placeholder="Unit cost"
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
            {saving ? 'Saving…' : 'Create draft'}
          </button>
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void onAiDraft()}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {aiBusy ? 'Generating…' : 'Generate AI Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
