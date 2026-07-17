import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  listAssessments,
  updateAssessment,
  type Assessment,
} from '@/lib/api/assessments';

function statusClass(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-50 text-blue-800';
    case 'completed':
      return 'bg-emerald-50 text-emerald-800';
    case 'cancelled':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

type Mode = 'clinical' | 'family';

export default function AssessmentSchedulePage({
  mode = 'clinical',
}: {
  mode?: Mode;
}) {
  const [rows, setRows] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(mode === 'clinical' ? 'scheduled' : '');
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [completing, setCompleting] = useState(false);

  const [mobility, setMobility] = useState('');
  const [pain, setPain] = useState('');
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [reportUrl, setReportUrl] = useState('');

  const title = mode === 'clinical' ? 'Assessment Schedule' : 'Assessment Bookings';
  const description =
    mode === 'clinical'
      ? 'Assessments assigned to you — complete with findings and report.'
      : 'Assessments scheduled for your care episodes.';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAssessments({
        status: status || undefined,
        limit: 50,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openComplete = (row: Assessment) => {
    setSelected(row);
    setMobility('');
    setPain('');
    setSummary('');
    setRecommendations('');
    setReportUrl('');
  };

  const handleComplete = async () => {
    if (!selected) return;
    if (!mobility.trim() && !pain.trim() && !summary.trim()) {
      toast.error('Enter at least one findings field');
      return;
    }
    if (!recommendations.trim() && !reportUrl.trim()) {
      toast.error('Add recommendations or a report URL');
      return;
    }

    setCompleting(true);
    try {
      await updateAssessment(selected.id, {
        status: 'completed',
        findings: {
          mobility: mobility.trim() || null,
          pain: pain.trim() || null,
          summary: summary.trim() || null,
        },
        recommendations: recommendations.trim() || undefined,
        reportUrl: reportUrl.trim() || undefined,
      });
      toast.success('Assessment completed');
      setSelected(null);
      await load();
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Complete failed');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
          <p className="mt-1 text-stone-600">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-sm text-stone-500">{total} result{total === 1 ? '' : 's'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden divide-y">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-stone-500">No assessments match these filters.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => (mode === 'clinical' && row.status === 'scheduled' ? openComplete(row) : setSelected(row))}
                className={`w-full text-left p-4 hover:bg-teal-50/40 transition-colors ${
                  selected?.id === row.id ? 'bg-teal-50/60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-teal-50 p-2 text-teal-700">
                    <CalendarClock className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-900 capitalize">{row.type}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500 truncate">
                      {row.episode?.title || 'Episode'}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {new Date(row.scheduledAt).toLocaleString()}
                      {row.assessor?.name ? ` · ${row.assessor.name}` : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3 rounded-2xl border bg-white shadow-sm p-5 min-h-[320px]">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 py-16">
              <CalendarClock className="size-10 mb-3 opacity-40" />
              <p className="text-sm">Select an assessment to view details.</p>
            </div>
          ) : mode === 'clinical' && selected.status === 'scheduled' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900 capitalize">
                  Complete {selected.type} assessment
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  {selected.episode?.title} · {new Date(selected.scheduledAt).toLocaleString()}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs font-semibold text-stone-500">Mobility findings</span>
                  <input
                    value={mobility}
                    onChange={(e) => setMobility(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                    placeholder="e.g. needs walker indoors"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs font-semibold text-stone-500">Pain findings</span>
                  <input
                    value={pain}
                    onChange={(e) => setPain(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                    placeholder="e.g. 4/10 knee"
                  />
                </label>
                <label className="sm:col-span-2 text-sm">
                  <span className="text-xs font-semibold text-stone-500">Summary metrics / notes</span>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 min-h-[72px]"
                  />
                </label>
                <label className="sm:col-span-2 text-sm">
                  <span className="text-xs font-semibold text-stone-500">Recommendations</span>
                  <textarea
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 min-h-[64px]"
                  />
                </label>
                <label className="sm:col-span-2 text-sm">
                  <span className="text-xs font-semibold text-stone-500">Report URL (optional if recommendations set)</span>
                  <input
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                    placeholder="https://…"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void handleComplete()}
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {completing && <Loader2 className="size-4 animate-spin" />}
                  Mark completed
                </button>
                <button
                  type="button"
                  disabled={completing}
                  onClick={async () => {
                    try {
                      await updateAssessment(selected.id, { status: 'cancelled' });
                      toast.success('Assessment cancelled');
                      setSelected(null);
                      await load();
                    } catch (error: unknown) {
                      if (isApiError(error)) toast.error(error.message);
                    }
                  }}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel assessment
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-lg font-semibold text-stone-900 capitalize">{selected.type}</h3>
                <span className={`inline-block mt-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-stone-500">Episode</dt>
                  <dd className="mt-0.5 text-stone-900">{selected.episode?.title || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">Scheduled</dt>
                  <dd className="mt-0.5 text-stone-900">{new Date(selected.scheduledAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">Assessor</dt>
                  <dd className="mt-0.5 text-stone-900">{selected.assessor?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">Report</dt>
                  <dd className="mt-0.5 text-stone-900">
                    {selected.reportUrl ? (
                      <a href={selected.reportUrl} className="text-teal-700 underline" target="_blank" rel="noreferrer">
                        Open report
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
              {selected.findings && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 mb-1">Findings</p>
                  <pre className="rounded-xl bg-stone-50 border p-3 text-xs overflow-auto">
                    {JSON.stringify(selected.findings, null, 2)}
                  </pre>
                </div>
              )}
              {selected.recommendations && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 mb-1">Recommendations</p>
                  <p className="text-stone-800 whitespace-pre-wrap">{selected.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
