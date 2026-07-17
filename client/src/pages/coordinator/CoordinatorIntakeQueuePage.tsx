import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  getIntake,
  listIntakeQueue,
  reviewIntake,
  updateIntakeStatus,
  intakeDocumentDownloadUrl,
  type IntakeRecord,
  type ServiceCategory,
  type UrgencyLevel,
} from '@/lib/api/intake';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'validated', label: 'Validated' },
  { value: 'episode_created', label: 'Episode created' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const URGENCY_FILTERS = [
  { value: '', label: 'All urgency' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const CONCERN_OPTIONS = [
  'falls risk',
  'mobility',
  'medication management',
  'cognitive decline',
  'pain',
  'caregiver burnout',
  'post-discharge support',
];

const URGENCY_INDICATOR_OPTIONS = [
  'recent_discharge',
  'recent_fall',
  'worsening_symptoms',
  'no_informal_support',
  'time_sensitive_therapy',
];

const RISK_FLAG_OPTIONS = ['falls', 'polypharmacy', 'isolation', 'wound_care', 'dysphagia'];

const SERVICE_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'occupational_therapy', label: 'Occupational therapy' },
  { value: 'speech_therapy', label: 'Speech therapy' },
  { value: 'behavioral_support', label: 'Behavioral support' },
  { value: 'companion_care', label: 'Companion care' },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-amber-50 text-amber-800';
    case 'under_review':
      return 'bg-blue-50 text-blue-800';
    case 'validated':
      return 'bg-teal-50 text-teal-800';
    case 'episode_created':
      return 'bg-emerald-50 text-emerald-800';
    case 'withdrawn':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

function urgencyBadgeClass(urgency?: string | null) {
  switch (urgency) {
    case 'urgent':
      return 'bg-red-50 text-red-700';
    case 'high':
      return 'bg-orange-50 text-orange-700';
    case 'medium':
      return 'bg-yellow-50 text-yellow-800';
    case 'low':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-500';
  }
}

function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        selected
          ? 'bg-teal-600 border-teal-600 text-white'
          : 'bg-white border-stone-200 text-stone-700 hover:border-teal-300'
      }`}
    >
      {label}
    </button>
  );
}

export default function CoordinatorIntakeQueuePage() {
  const [status, setStatus] = useState('submitted');
  const [urgency, setUrgency] = useState('');
  const [rows, setRows] = useState<IntakeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IntakeRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [keyConcerns, setKeyConcerns] = useState<string[]>([]);
  const [urgencyIndicators, setUrgencyIndicators] = useState<string[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<ServiceCategory[]>([]);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [createEpisode, setCreateEpisode] = useState(true);
  const [episodeTitle, setEpisodeTitle] = useState('');

  const canReview = useMemo(() => {
    if (!detail) return false;
    return detail.status === 'submitted' || detail.status === 'under_review';
  }, [detail]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listIntakeQueue({
        status: status || undefined,
        urgency: urgency || undefined,
        limit: 50,
      });
      setRows(result.data);
      setTotal(result.total);
      if (selectedId && !result.data.some((r) => r.id === selectedId)) {
        // keep selection if still valid; otherwise leave as-is until click
      }
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load intake queue');
    } finally {
      setLoading(false);
    }
  }, [status, urgency, selectedId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setKeyConcerns([]);
    setUrgencyIndicators([]);
    setSuggestedServices([]);
    setRiskFlags([]);
    setNotes('');
    setCreateEpisode(true);
    setEpisodeTitle('');
    try {
      const data = await getIntake(id);
      setDetail(data);
      if (data.serviceInterests?.length) {
        setSuggestedServices(data.serviceInterests);
      }
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load intake');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggle = <T extends string>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleStartReview = async () => {
    if (!detail || detail.status !== 'submitted') return;
    setClaiming(true);
    try {
      await updateIntakeStatus(detail.id, 'under_review');
      toast.success('Marked under review');
      const refreshed = await getIntake(detail.id);
      setDetail(refreshed);
      await loadQueue();
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Could not update status');
    } finally {
      setClaiming(false);
    }
  };

  const handleReview = async () => {
    if (!detail) return;
    if (keyConcerns.length === 0) {
      toast.error('Select at least one key concern');
      return;
    }
    if (urgencyIndicators.length === 0) {
      toast.error('Select at least one urgency indicator');
      return;
    }
    if (suggestedServices.length === 0) {
      toast.error('Select at least one suggested service');
      return;
    }

    setReviewing(true);
    try {
      const result = await reviewIntake(detail.id, {
        keyConcerns,
        urgencyIndicators,
        suggestedServiceCategories: suggestedServices,
        riskFlags,
        createEpisode,
        episodeTitle: episodeTitle.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(
        createEpisode
          ? `Episode created (${result.episode?.id?.slice(0, 8)}…)`
          : 'Intake validated',
      );
      setDetail(result.intake);
      await loadQueue();
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Review failed');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Intake Queue</h2>
          <p className="mt-1 text-stone-600">
            Review family submissions with guided clinical fields — not free text only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadQueue()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
        >
          {URGENCY_FILTERS.map((o) => (
            <option key={o.value || 'all-u'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-stone-500 self-center">{total} result{total === 1 ? '' : 's'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-7 animate-spin text-teal-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">
              No intakes match these filters. Submit one via Family Onboarding first.
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((row) => {
                const active = row.id === selectedId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => void openDetail(row.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        active ? 'bg-teal-50' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-stone-900 text-sm">
                            {row.careRecipient?.name ?? 'Patient'}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {row.careUnit?.name ?? 'Care unit'} · {row.familyUser?.name ?? 'Family'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}
                          >
                            {row.status.replace(/_/g, ' ')}
                          </span>
                          {row.urgencyLevel && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgencyBadgeClass(row.urgencyLevel as UrgencyLevel)}`}
                            >
                              {row.urgencyLevel}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 mt-2 line-clamp-2">{row.reasonForCare}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 rounded-2xl border bg-white shadow-sm p-6 min-h-[420px]">
          {!selectedId && (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 py-16">
              <ClipboardCheck className="size-10 text-stone-300 mb-3" />
              <p className="text-sm">Select an intake from the queue to review.</p>
            </div>
          )}

          {selectedId && detailLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="size-7 animate-spin text-teal-600" />
            </div>
          )}

          {selectedId && !detailLoading && detail && (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-stone-900">
                    {detail.careRecipient?.name}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(detail.status)}`}
                  >
                    {detail.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-stone-600">
                  {detail.careUnit?.name} · Family: {detail.familyUser?.name} (
                  {detail.familyUser?.email})
                </p>
                {detail.submittedAt && (
                  <p className="text-xs text-stone-400 mt-1">
                    Submitted {new Date(detail.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">Reason for care</p>
                  <p className="text-stone-800">{detail.reasonForCare}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">Diagnoses</p>
                  <p className="text-stone-800">{detail.diagnoses?.join(', ') || '—'}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">Medical history</p>
                  <p className="text-stone-800">{detail.medicalHistory || '—'}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">Medications</p>
                  <p className="text-stone-800">{detail.currentMeds || '—'}</p>
                </div>
              </div>

              {(detail.documents?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-2">
                    Intake documents ({detail.documents!.length})
                  </p>
                  <ul className="space-y-2">
                    {detail.documents!.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 truncate">{doc.name}</p>
                          <p className="text-xs text-stone-500">
                            {(doc.category || 'other').replace(/_/g, ' ')}
                            {doc.size ? ` · ${Math.round(doc.size / 1024)} KB` : ''}
                          </p>
                        </div>
                        <a
                          href={intakeDocumentDownloadUrl(doc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              const res = await fetch(intakeDocumentDownloadUrl(doc.id), {
                                credentials: 'include',
                              });
                              if (!res.ok) {
                                const errBody = (await res.json().catch(() => null)) as {
                                  message?: string;
                                } | null;
                                toast.error(errBody?.message || 'Could not open document');
                                return;
                              }

                              const contentType = res.headers.get('content-type') || '';
                              const disposition = res.headers.get('content-disposition') || '';
                              const isFile =
                                disposition.includes('attachment') ||
                                contentType.includes('pdf') ||
                                contentType.includes('octet-stream') ||
                                contentType.includes('image/') ||
                                contentType.includes('msword') ||
                                contentType.includes('officedocument');

                              // S3 signed URL path returns JSON { data: { url } }
                              if (!isFile && contentType.includes('application/json')) {
                                const body = (await res.json()) as {
                                  data?: { url?: string };
                                };
                                if (body.data?.url) {
                                  window.open(body.data.url, '_blank', 'noopener,noreferrer');
                                  return;
                                }
                                toast.error('Document URL missing');
                                return;
                              }

                              const blob = await res.blob();
                              const objectUrl = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = doc.name;
                              a.target = '_blank';
                              a.rel = 'noreferrer';
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(objectUrl);
                            } catch {
                              toast.error('Could not open document');
                            }
                          }}
                        >
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(detail.consents?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-2">
                    Consents ({detail.consents!.length})
                  </p>
                  <ul className="space-y-2">
                    {detail.consents!.map((c) => (
                      <li
                        key={`${c.consentType}-${c.grantedAt}`}
                        className="rounded-lg bg-stone-50 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-stone-900 capitalize">
                            {c.consentType.replace(/_/g, ' ')}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            {c.granted ? 'granted' : 'revoked'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {c.documentVersion ? `v${c.documentVersion}` : '—'}
                          {c.grantedAt ? ` · ${new Date(c.grantedAt).toLocaleString()}` : ''}
                          {c.ipAddress ? ` · IP ${c.ipAddress}` : ''}
                          {c.signatureStatus ? ` · ${c.signatureStatus}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.status === 'submitted' && (
                <button
                  type="button"
                  disabled={claiming}
                  onClick={() => void handleStartReview()}
                  className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                >
                  {claiming ? 'Updating…' : 'Start review (mark under review)'}
                </button>
              )}

              {canReview ? (
                <div className="space-y-4 border-t border-stone-100 pt-5">
                  <h4 className="font-semibold text-stone-900">Structured review</h4>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">Key concerns *</p>
                    <div className="flex flex-wrap gap-2">
                      {CONCERN_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c}
                          label={c}
                          selected={keyConcerns.includes(c)}
                          onToggle={() => toggle(keyConcerns, c, setKeyConcerns)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">Urgency indicators *</p>
                    <div className="flex flex-wrap gap-2">
                      {URGENCY_INDICATOR_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c}
                          label={c.replace(/_/g, ' ')}
                          selected={urgencyIndicators.includes(c)}
                          onToggle={() => toggle(urgencyIndicators, c, setUrgencyIndicators)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">
                      Suggested services *
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c.value}
                          label={c.label}
                          selected={suggestedServices.includes(c.value)}
                          onToggle={() => toggle(suggestedServices, c.value, setSuggestedServices)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">Risk flags</p>
                    <div className="flex flex-wrap gap-2">
                      {RISK_FLAG_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c}
                          label={c.replace(/_/g, ' ')}
                          selected={riskFlags.includes(c)}
                          onToggle={() => toggle(riskFlags, c, setRiskFlags)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1.5 block">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm min-h-[72px]"
                      placeholder="Additional structured comment — not a substitute for chips above"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={createEpisode}
                      onChange={(e) => setCreateEpisode(e.target.checked)}
                    />
                    Create care episode on validate
                  </label>

                  {createEpisode && (
                    <input
                      value={episodeTitle}
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      placeholder="Episode title (optional)"
                    />
                  )}

                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => void handleReview()}
                    className="w-full sm:w-auto rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      'Submit structured review'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
                  {detail.status === 'episode_created' && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Linked episode
                      </p>
                      <p className="mt-1 font-medium text-stone-900">
                        {detail.careEpisode?.title || 'Care episode'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {detail.careEpisode?.status && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
                            {detail.careEpisode.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="font-mono text-stone-400">
                          {detail.careEpisode?.id ?? '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {detail.reviewSummary && (
                    <ReviewSummaryView summary={detail.reviewSummary} />
                  )}

                  {!['episode_created', 'validated'].includes(detail.status) && (
                    <p className="text-stone-600">This intake is not open for review.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ReviewSummary = {
  notes?: string | null;
  riskFlags?: string[];
  keyConcerns?: string[];
  urgencyIndicators?: string[];
  suggestedServiceCategories?: string[];
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function formatChipLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function ReviewSummaryView({ summary }: { summary: Record<string, unknown> | ReviewSummary }) {
  const data = summary as ReviewSummary;
  const keyConcerns = asStringList(data.keyConcerns);
  const urgencyIndicators = asStringList(data.urgencyIndicators);
  const services = asStringList(data.suggestedServiceCategories);
  const riskFlags = asStringList(data.riskFlags);
  const notes = typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null;

  const sections: { label: string; values: string[]; tone: string }[] = [
    { label: 'Key concerns', values: keyConcerns, tone: 'bg-teal-50 text-teal-800' },
    {
      label: 'Urgency indicators',
      values: urgencyIndicators,
      tone: 'bg-amber-50 text-amber-900',
    },
    { label: 'Suggested services', values: services, tone: 'bg-sky-50 text-sky-900' },
    { label: 'Risk flags', values: riskFlags, tone: 'bg-rose-50 text-rose-800' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Review summary</p>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 text-xs font-semibold text-stone-500">{section.label}</p>
          {section.values.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {section.values.map((value) => (
                <span
                  key={`${section.label}-${value}`}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${section.tone}`}
                >
                  {formatChipLabel(value)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">—</p>
          )}
        </div>
      ))}
      {notes && (
        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">Notes</p>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}
