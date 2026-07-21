import type { ReactNode } from 'react';
import { HeartHandshake } from 'lucide-react';
import {
  parseFamilyWizardSummary,
  type FamilyWizardDraft,
  type FamilyWizardSummary,
} from '@/lib/familyCareseekerIntake';

const FAMILY_STATUS: Record<string, string> = {
  submitted: 'Request received',
  under_review: 'Care team reviewing',
  validated: 'Care journey ready',
  episode_created: 'Care journey started',
  withdrawn: 'Withdrawn',
};

const ACCOUNT_OPTIONS = [
  { id: 'myself', label: 'Individual (for myself)' },
  { id: 'family_member', label: 'Family Guardian' },
  { id: 'support_coordinator', label: 'Support Coordinator' },
];

const COUNTRY_OPTIONS = [
  { id: 'QAT', label: 'Qatar' },
  { id: 'SAU', label: 'Saudi Arabia' },
  { id: 'EGY', label: 'Egypt' },
  { id: 'AUS', label: 'Australia' },
];

const LANGUAGE_OPTIONS = ['ENGLISH', 'ARABIC', 'FRENCH', 'URDU', 'HINDI'];

const SUPPORT_OPTIONS = [
  { id: 'aged_care', label: 'Home Care' },
  { id: 'disability_support', label: 'Disability' },
  { id: 'child_family', label: 'Babysitting' },
  { id: 'allied_health', label: 'Therapy' },
  { id: 'home_support', label: 'Home Visit' },
];

const GENDER_OPTIONS = [
  { id: 'female', label: 'Female only' },
  { id: 'male', label: 'Male only' },
  { id: 'no_preference', label: 'No preference' },
];

const PROVIDER_LANG_OPTIONS = ['Arabic', 'English', 'French', 'Urdu', 'Hindi'];

const CARE_LOCATION_OPTIONS = [
  { id: 'home', label: 'In-person / at home' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'telehealth', label: 'Virtual' },
  { id: 'flexible', label: 'Flexible' },
];

const SCHEDULE_OPTIONS = [
  { id: 'one_time', label: 'One-time' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'daily', label: 'Daily' },
  { id: 'flexible', label: 'As needed' },
];

const DAY_OPTIONS = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
];

const TIME_OPTIONS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'overnight', label: 'Overnight' },
];

function SummaryGrid({ summary }: { summary: FamilyWizardSummary }) {
  const rows: { label: string; value: string }[] = [
    summary.accountType ? { label: 'Account type', value: summary.accountType } : null,
    summary.country ? { label: 'Location', value: summary.country } : null,
    summary.preferredLanguage
      ? { label: 'Language', value: summary.preferredLanguage }
      : null,
    summary.supportCategories.length
      ? { label: 'Support needed', value: summary.supportCategories.join(', ') }
      : null,
    summary.specificNeeds.length
      ? { label: 'Specific needs', value: summary.specificNeeds.join(' · ') }
      : null,
    summary.practitionerGender
      ? { label: 'Provider gender', value: summary.practitionerGender }
      : null,
    summary.providerLanguages.length
      ? { label: 'Provider languages', value: summary.providerLanguages.join(', ') }
      : null,
    summary.careLocation ? { label: 'Care location', value: summary.careLocation } : null,
    summary.address ? { label: 'Address', value: summary.address } : null,
    summary.scheduleType ? { label: 'Schedule', value: summary.scheduleType } : null,
    summary.preferredDays.length
      ? { label: 'Preferred days', value: summary.preferredDays.join(', ') }
      : null,
    summary.preferredTimeSlots.length
      ? { label: 'Preferred times', value: summary.preferredTimeSlots.join(', ') }
      : null,
    summary.startTiming ? { label: 'Start timing', value: summary.startTiming } : null,
    summary.ndisPlanType ? { label: 'NDIS plan', value: summary.ndisPlanType } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (rows.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-xl bg-white border border-teal-100 px-3 py-2"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80">
            {row.label}
          </p>
          <p className="text-sm text-stone-800 mt-0.5 break-words">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80">
      {children}
    </span>
  );
}

function ChipToggle({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
        selected
          ? 'bg-teal-600 text-white border-teal-600'
          : 'bg-white text-teal-900 border-teal-200 hover:border-teal-400'
      }`}
    >
      {label}
    </button>
  );
}

function RequestEditForm({
  draft,
  onChange,
}: {
  draft: FamilyWizardDraft;
  onChange: (next: FamilyWizardDraft) => void;
}) {
  const set = <K extends keyof FamilyWizardDraft>(key: K, value: FamilyWizardDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const toggleIn = (key: 'careCategories' | 'languages' | 'preferredDays' | 'preferredTimeSlots', id: string) => {
    const list = draft[key];
    set(
      key,
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm space-y-1">
        <FieldLabel>Account type</FieldLabel>
        <select
          value={draft.careRecipientType}
          onChange={(e) => set('careRecipientType', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
        >
          {ACCOUNT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <FieldLabel>Location</FieldLabel>
        <select
          value={draft.country}
          onChange={(e) => set('country', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
        >
          {COUNTRY_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <FieldLabel>Language</FieldLabel>
        <select
          value={draft.preferredLanguage}
          onChange={(e) => set('preferredLanguage', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <FieldLabel>Provider gender</FieldLabel>
        <select
          value={draft.practitionerGender}
          onChange={(e) => set('practitionerGender', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2 space-y-1.5">
        <FieldLabel>Support needed</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORT_OPTIONS.map((o) => (
            <ChipToggle
              key={o.id}
              label={o.label}
              selected={draft.careCategories.includes(o.id)}
              onClick={() => toggleIn('careCategories', o.id)}
            />
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 space-y-1.5">
        <FieldLabel>Provider languages</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDER_LANG_OPTIONS.map((lang) => (
            <ChipToggle
              key={lang}
              label={lang}
              selected={draft.languages.includes(lang)}
              onClick={() => toggleIn('languages', lang)}
            />
          ))}
        </div>
      </div>

      <label className="text-sm space-y-1">
        <FieldLabel>Care location</FieldLabel>
        <select
          value={draft.careLocation}
          onChange={(e) => set('careLocation', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
        >
          {CARE_LOCATION_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm space-y-1">
        <FieldLabel>Schedule</FieldLabel>
        <select
          value={draft.scheduleType}
          onChange={(e) => set('scheduleType', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
        >
          {SCHEDULE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="sm:col-span-2 text-sm space-y-1">
        <FieldLabel>Address</FieldLabel>
        <input
          value={draft.address}
          onChange={(e) => set('address', e.target.value)}
          className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm"
          placeholder="Street, home number"
        />
      </label>

      <div className="sm:col-span-2 space-y-1.5">
        <FieldLabel>Preferred days</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map((o) => (
            <ChipToggle
              key={o.id}
              label={o.label}
              selected={draft.preferredDays.includes(o.id)}
              onClick={() => toggleIn('preferredDays', o.id)}
            />
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 space-y-1.5">
        <FieldLabel>Preferred times</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {TIME_OPTIONS.map((o) => (
            <ChipToggle
              key={o.id}
              label={o.label}
              selected={draft.preferredTimeSlots.includes(o.id)}
              onClick={() => toggleIn('preferredTimeSlots', o.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type IntakeLike = {
  id: string;
  status: string;
  submittedAt?: string;
  reasonForCare?: string;
  serviceInterests?: string[];
  wizardPayload?: Record<string, unknown> | null;
};

/** Family-facing card: latest care request from simple onboarding. */
export function FamilyCareRequestPanel({
  intakes,
  variant = 'family',
  editing = false,
  draft,
  onDraftChange,
  actions,
}: {
  intakes?: IntakeLike[] | null;
  variant?: 'family' | 'staff';
  editing?: boolean;
  draft?: FamilyWizardDraft;
  onDraftChange?: (draft: FamilyWizardDraft) => void;
  actions?: ReactNode;
}) {
  const latest = intakes?.[0];
  if (!latest) return null;

  const summary = parseFamilyWizardSummary(latest.wizardPayload);
  const statusLabel =
    FAMILY_STATUS[latest.status] ?? latest.status.replace(/_/g, ' ');
  const isFamily = variant === 'family';

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
              <HeartHandshake className="size-5 text-teal-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-900">
                {isFamily ? 'Your care request' : 'Family request summary'}
              </p>
              <p className="text-xs text-teal-800/80 mt-0.5">
                {editing
                  ? 'Update your request details, then Save.'
                  : isFamily
                    ? 'Details from your onboarding — our care team will follow up.'
                    : 'From simple family onboarding'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {actions}
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="rounded-full bg-white border border-teal-200 px-2.5 py-0.5 text-xs font-semibold text-teal-900">
                {statusLabel}
              </span>
              {latest.submittedAt && (
                <span className="text-[11px] text-teal-800/70">
                  Submitted {new Date(latest.submittedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

      {editing && draft && onDraftChange ? (
        <RequestEditForm draft={draft} onChange={onDraftChange} />
      ) : summary ? (
        <SummaryGrid summary={summary} />
      ) : (
        latest.reasonForCare && (
          <div className="rounded-xl bg-white border border-teal-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80">
              Reason for care
            </p>
            <p className="text-sm text-stone-800 mt-0.5">{latest.reasonForCare}</p>
          </div>
        )
      )}

      {!editing && (latest.serviceInterests?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80 mb-1.5">
            {isFamily ? 'Services requested' : 'Mapped service interests'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {latest.serviceInterests!.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white border border-teal-200 px-2.5 py-0.5 text-xs font-medium text-teal-900"
              >
                {s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
