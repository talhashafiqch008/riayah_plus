import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogOut, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleShellConfig } from '@/config/proposalRoleShells';
import { familyNavKey, getShellNavLabel } from '@/config/proposalRoleShells';
import { badgeLabel, fetchNavBadgesForShell, type NavBadgeMap } from '@/lib/api/navBadges';
import RoleNotificationBell from '@/components/roles/RoleNotificationBell';
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher';

interface HealthRoleLayoutProps {
  config: RoleShellConfig;
}

export function HealthRoleLayout({ config }: HealthRoleLayoutProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState<NavBadgeMap>({});
  const isFamily = config.key === 'family';
  const { t } = useTranslation('family');

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

  const navLabel = (href: string, fallback: string) => {
    if (!isFamily) return fallback;
    const key = familyNavKey(href, config.basePath);
    return t(`nav.${key}`, { defaultValue: fallback });
  };

  const pageTitle = (() => {
    if (!isFamily) return getShellNavLabel(config, pathname);
    const item = config.navigation.find((nav) =>
      nav.href === config.basePath
        ? pathname === config.basePath
        : pathname === nav.href || pathname.startsWith(`${nav.href}/`),
    );
    if (!item) return t('portalTitle');
    return navLabel(item.href, item.name);
  })();

  const portalTitle = isFamily ? t('portalTitle') : config.portalTitle;
  const roleBadge = isFamily ? t('roleBadge') : config.roleBadge;

  return (
    <div className="h-dvh overflow-hidden bg-stone-50 flex font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-50 w-64 bg-white border-e border-stone-100 flex flex-col transform transition-transform duration-300 lg:static lg:translate-x-0 lg:rtl:translate-x-0 lg:shrink-0 h-dvh ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="px-5 pt-6 pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <Link to={config.basePath} className="flex items-center gap-3 min-w-0" onClick={() => setSidebarOpen(false)}>
              <div className="size-9 bg-teal-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <Heart className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-stone-900 text-sm truncate">{portalTitle}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                  {roleBadge}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg shrink-0"
              aria-label={isFamily ? t('layout.closeSidebar') : 'Close sidebar'}
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
                <span className="flex-1 text-start">{navLabel(item.href, item.name)}</span>
                {count > 0 ? (
                  <span
                    className={`min-w-5 px-1.5 py-0.5 text-center text-[10px] font-bold rounded-full ${
                      active ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                    }`}
                    title={
                      isFamily
                        ? t('layout.badgeAttention', { count })
                        : `${count} need attention`
                    }
                  >
                    {badgeLabel(count)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100 space-y-2 shrink-0">
          {isFamily ? (
            <div className="px-3 pb-1">
              <LanguageSwitcher variant="dashboard" className="w-full justify-center" />
            </div>
          ) : null}
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-stone-900">
              {user?.firstName ?? (isFamily ? t('layout.userFallback') : 'User')}
            </p>
            <p className="text-xs text-stone-400 capitalize">
              {isFamily ? t('roleBadge') : user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut className="size-4" />
            {isFamily ? t('layout.signOut') : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 bg-white border-b border-stone-100 flex items-center gap-2 px-4 lg:px-6 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg"
            aria-label={isFamily ? t('layout.openMenu') : 'Open menu'}
          >
            <Menu className="size-5" />
          </button>
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg"
              aria-label={isFamily ? t('layout.closeMenu') : 'Close menu'}
            >
              <X className="size-5" />
            </button>
          )}
          <h1 className="font-semibold text-stone-900 flex-1 min-w-0 truncate">{pageTitle}</h1>
          {isFamily ? (
            <div className="hidden sm:block shrink-0">
              <LanguageSwitcher variant="dashboard" />
            </div>
          ) : null}
          <RoleNotificationBell shellBasePath={config.basePath} />
        </header>
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
          {config.key === 'family' && !user?.organizationId && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 text-start"
            >
              {t('layout.orgPending')}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
