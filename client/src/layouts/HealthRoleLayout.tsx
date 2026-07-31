import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleShellConfig } from '@/config/proposalRoleShells';
import { getShellNavLabel } from '@/config/proposalRoleShells';
import { badgeLabel, fetchNavBadgesForShell, type NavBadgeMap } from '@/lib/api/navBadges';

interface HealthRoleLayoutProps {
  config: RoleShellConfig;
}

export function HealthRoleLayout({ config }: HealthRoleLayoutProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<NavBadgeMap>({});

  const refreshBadges = useCallback(() => {
    void fetchNavBadgesForShell(config.key).then(setBadges);
  }, [config.key]);

  useEffect(() => {
    refreshBadges();
    const id = window.setInterval(refreshBadges, 60_000);
    const onFocus = () => refreshBadges();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshBadges, pathname]);

  useEffect(() => {
    const role = user?.role?.toLowerCase();
    const onboardingStatus = (user as { onboarding_status?: string } | null)?.onboarding_status;
    const pending = onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed';
    if ((role === 'family' || role === 'patient') && pending && pathname !== '/family/onboarding') {
      navigate('/family/onboarding', { replace: true });
    }
  }, [user, pathname, navigate]);

  const isActive = (href: string) => {
    if (href === config.basePath) {
      return pathname === config.basePath;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const pageTitle = getShellNavLabel(config, pathname);

  return (
    <div className="h-dvh overflow-hidden bg-stone-50 flex font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-100 flex flex-col transform transition-transform duration-300 lg:static lg:translate-x-0 lg:shrink-0 h-dvh ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pt-6 pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center justify-between">
            <Link to={config.basePath} className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div className="size-9 bg-teal-600 rounded-lg flex items-center justify-center text-white">
                <Heart className="size-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900 text-sm">{config.portalTitle}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                  {config.roleBadge}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 min-h-0">
          {config.navigation.map((item) => {
            const active = isActive(item.href);
            const count = badges[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {count > 0 ? (
                  <span
                    className={`min-w-5 px-1.5 py-0.5 text-center text-[10px] font-bold rounded-full ${
                      active ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                    }`}
                    title={`${count} need attention`}
                  >
                    {badgeLabel(count)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100 space-y-2 shrink-0">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-stone-900">{user?.firstName ?? 'User'}</p>
            <p className="text-xs text-stone-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 bg-white border-b border-stone-100 flex items-center px-4 lg:px-6 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg mr-3"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
            {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg mr-1"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          )}
          <h1 className="font-semibold text-stone-900">{pageTitle}</h1>
        </header>
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
