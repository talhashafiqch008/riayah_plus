import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import { fetchShellStats, type ShellStat } from '@/lib/api/shellStats';
import { isApiError } from '@/lib/errors';

interface RoleShellDashboardProps {
  shellKey: keyof typeof ROLE_SHELLS;
}

const FAMILY_PRIMARY_LINKS = [
  { name: 'Care request', href: '/family/onboarding', hint: 'Start or update a request' },
  { name: 'Care Journey', href: '/family/episodes', hint: 'See where you are' },
  { name: 'Appointments', href: '/family/bookings', hint: 'Consultations & bookings' },
  { name: 'Video sessions', href: '/family/telehealth', hint: 'Join the waiting room' },
  { name: 'Messages', href: '/family/messages', hint: 'Talk with your care team' },
  { name: 'Care Plans', href: '/family/care-plans', hint: 'Review and approve plans' },
  { name: 'Billing', href: '/family/billing', hint: 'Quotations and invoices' },
  { name: 'Documents', href: '/family/documents', hint: 'Upload or review files' },
] as const;

const FAMILY_LATER_LINKS: readonly { name: string; href: string; hint: string }[] = [];

export default function RoleShellDashboard({ shellKey }: RoleShellDashboardProps) {
  const shell = ROLE_SHELLS[shellKey];
  const { dashboard, navigation } = shell;
  const isFamily = shellKey === 'family';

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
      else toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [shellKey]);

  useEffect(() => {
    setStats(ROLE_SHELLS[shellKey].dashboard.stats);
    setLoaded(false);
    void load();
  }, [load, shellKey]);

  const quickLinks = navigation.filter((item) => item.href !== shell.basePath).slice(0, 3);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{dashboard.title}</h2>
          <p className="mt-2 text-stone-600">{dashboard.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              {!loaded && loading ? '…' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {isFamily ? (
        <div className={`grid gap-6 ${FAMILY_LATER_LINKS.length > 0 ? 'lg:grid-cols-2' : ''}`}>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-1">What you can do</h3>
            <p className="text-sm text-stone-500 mb-4">
              Request care and stay informed — our care team handles clinical detail.
            </p>
            <div className="space-y-2">
              {FAMILY_PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/50 transition-colors"
                >
                  <span>
                    <span className="block text-sm font-medium text-stone-800">{link.name}</span>
                    <span className="block text-xs text-stone-500">{link.hint}</span>
                  </span>
                  <ArrowRight className="size-4 text-teal-600 shrink-0" />
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/family/onboarding"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Start care request
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/family/care-unit"
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100"
              >
                View my care unit
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {FAMILY_LATER_LINKS.length > 0 && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-1">Coming later</h3>
            <p className="text-sm text-stone-500 mb-4">
              These stay in the menu so you know what is ahead — they are not live tools yet.
            </p>
            <div className="space-y-2">
              {FAMILY_LATER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center justify-between rounded-lg border border-dashed border-stone-200 px-4 py-3 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  <span>
                    <span className="block font-medium text-stone-600">{link.name}</span>
                    <span className="block text-xs">{link.hint}</span>
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    Soon
                  </span>
                </Link>
              ))}
            </div>
          </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-4">Suggested next steps</h3>
            <ul className="space-y-3">
              {dashboard.nextSteps.map((step) => (
                <li key={step} className="flex items-start gap-2 text-sm text-stone-600">
                  <ArrowRight className="size-4 text-teal-600 mt-0.5 shrink-0" />
                  {step}
                </li>
              ))}
            </ul>
            {shellKey === 'coordinator' && (
              <Link
                to="/coordinator/intake"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Open intake queue
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-900 mb-4">Quick links</h3>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center justify-between rounded-lg border border-stone-100 px-4 py-3 text-sm font-medium text-stone-700 hover:border-teal-200 hover:bg-teal-50/50 transition-colors"
                >
                  {link.name}
                  <ArrowRight className="size-4 text-teal-600" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
