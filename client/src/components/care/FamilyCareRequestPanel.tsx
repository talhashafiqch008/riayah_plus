import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartHandshake } from 'lucide-react';
import {
  parseFamilyWizardSummary,
  type FamilyWizardDraft,
  type FamilyWizardSummary,
} from '@/lib/familyCareseekerIntake';
import {
  familyEnumLabel,
  formatFamilyDateTime,
  familyIntakeStatusLabel,
} from '@/lib/familyLanguage';
import {
  localizeAccountTypeLabel,
  localizeChip,
} from '@/lib/localizeStoredEnglish';

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

const SUPPORT_EN_TO_ID: Record<string, string> = {
  'Home Care': 'aged_care',
  Disability: 'disability_support',
  Babysitting: 'child_family',
  Therapy: 'allied_health',
  'Home Visit': 'home_support',
};

const GENDER_EN_TO_ID: Record<string, string> = {
  'Female provider only': 'female_only',
  'Male provider only': 'male_only',
  'No preference': 'no_preference',
};

const CARE_LOCATION_EN_TO_ID: Record<string, string> = {
  'In-person / at home': 'home',
  Clinic: 'clinic',
  Virtual: 'telehealth',
  Flexible: 'flexible',
  'In-person': 'home',
};

function localizeSummaryToken(group: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  let slug = trimmed;
  if (group === 'support' && SUPPORT_EN_TO_ID[trimmed]) slug = SUPPORT_EN_TO_ID[trimmed];
  if (group === 'gender' && GENDER_EN_TO_ID[trimmed]) slug = GENDER_EN_TO_ID[trimmed];
  if (group === 'careLocation' && CARE_LOCATION_EN_TO_ID[trimmed]) {
    slug = CARE_LOCATION_EN_TO_ID[trimmed];
  }
  const translated = familyEnumLabel(group, slug);
  return translated !== slug.replace(/_/g, ' ') ? translated : trimmed;
}

function joinLocalized(group: string, parts: string[], separator: string): string {
  return parts.map((p) => localizeSummaryToken(group, p)).join(separator);
}

function SummaryGrid({ summary }: { summary: FamilyWizardSummary }) {
  const { t } = useTranslation('family');
  const rows: { label: string; value: string }[] = [
    summary.accountType ? { label: t('careUnit.summary.accountType'), value: localizeAccountTypeLabel(summary.accountType) } : null,
    summary.country ? { label: t('careUnit.summary.location'), value: summary.country } : null,
    summary.preferredLanguage
      ? { label: t('careUnit.summary.language'), value: localizeChip(summary.preferredLanguage) }
      : null,
    summary.supportCategories.length
      ? {
          label: t('careUnit.summary.supportNeeded'),
          value: joinLocalized('support', summary.supportCategories, ', '),
        }
      : null,
    summary.specificNeeds.length
      ? {
          label: t('careUnit.summary.specificNeeds'),
          value: summary.specificNeeds.map((n) => localizeChip(n)).join(' · '),
        }
      : null,
    summary.practitionerGender
      ? {
          label: t('careUnit.summary.providerGender'),
          value: localizeSummaryToken('gender', summary.practitionerGender),
        }
      : null,
    summary.providerLanguages.length
      ? {
          label: t('careUnit.summary.providerLanguages'),
          value: summary.providerLanguages.map((l) => localizeChip(l)).join(', '),
        }
      : null,
    summary.careLocation
      ? {
          label: t('careUnit.summary.careLocation'),
          value: localizeSummaryToken('careLocation', summary.careLocation),
        }
      : null,
    summary.address ? { label: t('careUnit.summary.address'), value: summary.address } : null,
    summary.scheduleType
      ? {
          label: t('careUnit.summary.schedule'),
          value: localizeSummaryToken('schedule', summary.scheduleType),
        }
      : null,
    summary.preferredDays.length
      ? {
          label: t('careUnit.summary.preferredDays'),
          value: joinLocalized('day', summary.preferredDays, ', '),
        }
      : null,
    summary.preferredTimeSlots.length
      ? {
          label: t('careUnit.summary.preferredTimes'),
          value: joinLocalized('time', summary.preferredTimeSlots, ', '),
        }
      : null,
    summary.startTiming ? { label: t('careUnit.summary.startTiming'), value: summary.startTiming } : null,
    summary.ndisPlanType ? { label: t('careUnit.summary.ndisPlan'), value: summary.ndisPlanType } : null,
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
  localeNs,
  editing = false,
  draft,
  onDraftChange,
  actions,
}: {
  intakes?: IntakeLike[] | null;
  variant?: 'family' | 'staff';
  /** Coordinator Arabic shell: translate staff chrome via coordinator ns. */
  localeNs?: 'family' | 'coordinator';
  editing?: boolean;
  draft?: FamilyWizardDraft;
  onDraftChange?: (draft: FamilyWizardDraft) => void;
  actions?: ReactNode;
}) {
  const isFamily = variant === 'family';
  const isCoordinator = localeNs === 'coordinator';
  const { t } = useTranslation(isCoordinator ? 'coordinator' : 'family');
  const latest = intakes?.[0];
  if (!latest) return null;

  const summary = parseFamilyWizardSummary(latest.wizardPayload);
  const statusLabel = isCoordinator
    ? t(`intake.status.${latest.status}`, {
        defaultValue: familyIntakeStatusLabel(latest.status),
      })
    : familyIntakeStatusLabel(latest.status);

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
              <HeartHandshake className="size-5 text-teal-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-900">
                {isFamily
                  ? t('careUnit.requestTitle')
                  : isCoordinator
                    ? t('patientDetail.familyRequestSummary')
                    : 'Family request summary'}
              </p>
              <p className="text-xs text-teal-800/80 mt-0.5">
                {editing
                  ? isFamily
                    ? t('careUnit.requestEditHint')
                    : isCoordinator
                      ? t('patientDetail.fromSimpleOnboarding')
                      : 'Edit care request'
                  : isFamily
                    ? t('careUnit.requestHint')
                    : isCoordinator
                      ? t('patientDetail.fromSimpleOnboarding')
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
                  {isCoordinator
                    ? formatFamilyDateTime(latest.submittedAt)
                    : t('careUnit.submitted', {
                        date: formatFamilyDateTime(latest.submittedAt),
                      })}
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
              {isFamily ? t('careUnit.reasonForCare') : 'Reason for care'}
            </p>
            <p className="text-sm text-stone-800 mt-0.5">{latest.reasonForCare}</p>
          </div>
        )
      )}

      {!editing && (latest.serviceInterests?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80 mb-1.5">
            {isFamily ? t('careUnit.servicesRequested') : isCoordinator ? t('patientDetail.mappedServices') : 'Mapped service interests'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {latest.serviceInterests!.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white border border-teal-200 px-2.5 py-0.5 text-xs font-medium text-teal-900"
              >
                {isCoordinator
                  ? t(`intake.services.${s}`, {
                      defaultValue: s.replace(/_/g, ' '),
                    })
                  : s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
