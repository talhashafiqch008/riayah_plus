import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import { fetchShellStats, type ShellStat } from '@/lib/api/shellStats';
import { isApiError } from '@/lib/errors';

interface RoleShellDashboardProps {
  shellKey: keyof typeof ROLE_SHELLS;
}

const FAMILY_PRIMARY_LINK_KEYS = [
  'onboarding',
  'episodes',
  'bookings',
  'telehealth',
  'messages',
  'care-plans',
  'billing',
  'documents',
] as const;

const FAMILY_PRIMARY_HREFS: Record<(typeof FAMILY_PRIMARY_LINK_KEYS)[number], string> = {
  onboarding: '/family/onboarding',
  episodes: '/family/episodes',
  bookings: '/family/bookings',
  telehealth: '/family/telehealth',
  messages: '/family/messages',
  'care-plans': '/family/care-plans',
  billing: '/family/billing',
  documents: '/family/documents',
};

const COORD_STEP_KEYS = ['reviewIntake', 'requestDocs', 'scheduleConsults', 'escalate'] as const;
const CLINICAL_STEP_KEYS = ['joinVideo', 'reviewSchedule', 'completeNotes', 'updateAssessments'] as const;
const SUPPORT_STEP_KEYS = ['checkIn', 'completeTasks', 'submitNotes'] as const;
const ORG_STEP_KEYS = ['assignCoordinators', 'inviteStaff', 'routePending'] as const;

function shellNs(shellKey: string): string {
  if (shellKey === 'family') return 'family';
  if (shellKey === 'coordinator') return 'coordinator';
  if (shellKey === 'clinical') return 'clinical';
  if (shellKey === 'support') return 'support';
  if (shellKey === 'org') return 'org';
  return 'family';
}

export default function RoleShellDashboard({ shellKey }: RoleShellDashboardProps) {
  const shell = ROLE_SHELLS[shellKey];
  const { dashboard, navigation } = shell;
  const isFamily = shellKey === 'family';
  const isCoordinator = shellKey === 'coordinator';
  const isClinical = shellKey === 'clinical';
  const isSupport = shellKey === 'support';
  const isOrg = shellKey === 'org';
  const localized = isFamily || isCoordinator || isClinical || isSupport || isOrg;
  const { t } = useTranslation(shellNs(String(shellKey)));

  const [stats, setStats] = useState<ShellStat[]>(dashboard.stats);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const live = await fetchShellStats(String(shellKey));
      if (live.length) setStats(live);
      setLoaded(true);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(localized ? t('dashboard.loadError') : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [shellKey, localized, t]);

  useEffect(() => {
    setStats(ROLE_SHELLS[shellKey].dashboard.stats);
    setLoaded(false);
    void load();
  }, [load, shellKey]);

  const quickLinks = navigation.filter((item) => item.href !== shell.basePath).slice(0, 3);

  const statLabel = (stat: ShellStat) => {
    if (localized && stat.id) return t(`stats.${stat.id}`);
    return stat.label;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">
            {localized ? t('dashboard.title') : dashboard.title}
          </h2>
          <p className="mt-2 text-stone-600">
            {localized ? t('dashboard.description') : dashboard.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {localized ? t('dashboard.refresh') : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.id ?? stat.label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">{statLabel(stat)}</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {!loaded && loading ? '…' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {isFamily ? (
        <div className="grid gap-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-1">{t('dashboard.whatYouCanDo')}</h3>
            <p className="text-sm text-stone-500 mb-4">{t('dashboard.whatYouCanDoHint')}</p>
            <div className="space-y-2">
              {FAMILY_PRIMARY_LINK_KEYS.map((key) => (
                <Link
                  key={key}
                  to={FAMILY_PRIMARY_HREFS[key]}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/50 transition-colors"
                >
                  <span className="text-start">
                    <span className="block text-sm font-medium text-stone-800">
                      {t(`dashboard.links.${key}.name`)}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {t(`dashboard.links.${key}.hint`)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-teal-600 shrink-0 rtl-flip" />
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/family/onboarding"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {t('dashboard.startCareRequest')}
                <ArrowRight className="size-4 rtl-flip" />
              </Link>
              <Link
                to="/family/care-unit"
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
              >
                {t('dashboard.viewCareUnit')}
                <ArrowRight className="size-4 rtl-flip" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-4">
              {isCoordinator || isClinical || isSupport || isOrg
                ? t('dashboard.nextStepsTitle')
                : 'Suggested next steps'}
            </h3>
            <ul className="space-y-3">
              {(isCoordinator
                ? COORD_STEP_KEYS
                : isClinical
                  ? CLINICAL_STEP_KEYS
                  : isSupport
                    ? SUPPORT_STEP_KEYS
                    : isOrg
                      ? ORG_STEP_KEYS
                      : dashboard.nextSteps
              ).map((step) => (
                <li key={step} className="flex items-start gap-2 text-sm text-stone-600">
                  <ArrowRight className="size-4 text-teal-600 mt-0.5 shrink-0 rtl-flip" />
                  {isCoordinator || isClinical || isSupport || isOrg
                    ? t(`dashboard.steps.${step}`)
                    : step}
                </li>
              ))}
            </ul>
            {isCoordinator && (
              <Link
                to="/coordinator/intake"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {t('dashboard.openIntake')}
                <ArrowRight className="size-4 rtl-flip" />
              </Link>
            )}
            {isClinical && (
              <Link
                to="/clinical/schedule"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {t('dashboard.openSchedule')}
                <ArrowRight className="size-4 rtl-flip" />
              </Link>
            )}
            {isSupport && (
              <Link
                to="/support/shifts"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {t('dashboard.openShifts')}
                <ArrowRight className="size-4 rtl-flip" />
              </Link>
            )}
            {isOrg && (
              <Link
                to="/org/pending"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                {t('dashboard.openPending')}
                <ArrowRight className="size-4 rtl-flip" />
              </Link>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-4">
              {isCoordinator || isClinical || isSupport || isOrg
                ? t('dashboard.quickLinksTitle')
                : 'Quick links'}
            </h3>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-4 py-3 text-sm font-medium text-stone-700 hover:border-teal-200 hover:bg-teal-50/50 transition-colors"
                >
                  {isCoordinator || isClinical || isSupport || isOrg
                    ? t(
                        `nav.${link.href.replace(`/${String(shellKey)}/`, '').split('/')[0] || 'dashboard'}`,
                        { defaultValue: link.name },
                      )
                    : link.name}
                  <ArrowRight className="size-4 text-teal-600 rtl-flip" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
