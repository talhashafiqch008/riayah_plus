import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { RoleShellConfig } from '@/config/proposalRoleShells';
import { getShellNavLabel } from '@/config/proposalRoleShells';

interface HealthRoleLayoutProps {
  config: RoleShellConfig;
}

export function HealthRoleLayout({ config }: HealthRoleLayoutProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === config.basePath) {
      return pathname === config.basePath;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const pageTitle = getShellNavLabel(config, pathname);

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-100 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pt-6 pb-4 border-b border-stone-100">
          <Link to={config.basePath} className="flex items-center gap-3">
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
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {config.navigation.map((item) => {
            const active = isActive(item.href);
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
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100 space-y-2">
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-stone-100 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg mr-3"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden hidden p-2"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
          <h1 className="font-semibold text-stone-900">{pageTitle}</h1>
        </header>
        <main id="main-content" className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
