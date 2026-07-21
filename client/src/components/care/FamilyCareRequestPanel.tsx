import { HeartHandshake } from 'lucide-react';
import {
  parseFamilyWizardSummary,
  type FamilyWizardSummary,
} from '@/lib/familyCareseekerIntake';

const FAMILY_STATUS: Record<string, string> = {
  submitted: 'Request received',
  under_review: 'Care team reviewing',
  validated: 'Care journey ready',
  episode_created: 'Care journey started',
  withdrawn: 'Withdrawn',
};

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
}: {
  intakes?: IntakeLike[] | null;
  variant?: 'family' | 'staff';
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
              {isFamily
                ? 'Details from your onboarding — our care team will follow up.'
                : 'From simple family onboarding'}
            </p>
          </div>
        </div>
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

      {summary ? (
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

      {(latest.serviceInterests?.length ?? 0) > 0 && (
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
