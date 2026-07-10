import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';

interface RoleShellDashboardProps {
  shellKey: keyof typeof ROLE_SHELLS;
}

export default function RoleShellDashboard({ shellKey }: RoleShellDashboardProps) {
  const shell = ROLE_SHELLS[shellKey];
  const { dashboard, navigation } = shell;

  const quickLinks = navigation.filter((item) => item.href !== shell.basePath).slice(0, 3);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">{dashboard.title}</h2>
        <p className="mt-2 text-stone-600">{dashboard.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {dashboard.stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{stat.value}</p>
          </div>
        ))}
      </div>

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
          <p className="mt-4 text-xs text-stone-400">
            Full workflows arrive in Milestone 2 — this shell is ready for integration.
          </p>
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
    </div>
  );
}
