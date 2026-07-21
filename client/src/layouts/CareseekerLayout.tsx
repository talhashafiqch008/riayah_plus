import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Home, Search, Calendar, MessageCircle, FileText, Users, Settings,
  CreditCard, Bot, Gift, Store, Heart, Menu, X, Bell, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number | null;
}

export function CareseekerLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/careseeker/dashboard', icon: Home },
    { name: 'Raiyah AI', href: '/careseeker/raiyah', icon: Bot, badge: 'Beta' },
    { name: 'Find Providers', href: '/careseeker/providers', icon: Search },
    { name: 'My Bookings', href: '/careseeker/bookings', icon: Calendar },
    { name: 'Messages', href: '/careseeker/messages', icon: MessageCircle },
    { name: 'Offers', href: '/careseeker/offers', icon: Gift },
    { name: 'Marketplace', href: '/careseeker/marketplace', icon: Store },
    { name: 'Documents', href: '/careseeker/documents', icon: FileText },
    { name: 'Family', href: '/careseeker/family', icon: Users },
    { name: 'Billing', href: '/careseeker/wallet', icon: CreditCard },
    { name: 'Settings', href: '/careseeker/settings', icon: Settings },
  ];

  const isActive = (href: string) =>
    href === '/careseeker/dashboard'
      ? pathname === '/careseeker' || pathname === '/careseeker/dashboard'
      : pathname.startsWith(href);

  const pageTitle =
    navigation.find((n) => isActive(n.href))?.name ?? 'Dashboard';

  return (
    <div className="h-dvh overflow-hidden bg-stone-100 flex">
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col transform transition-transform duration-300 lg:static lg:translate-x-0 lg:shrink-0 h-dvh ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-stone-100 shrink-0">
          <Link to="/careseeker/dashboard" className="flex items-center gap-2">
            <div className="size-7 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-bold text-stone-900">Raiyah</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded text-stone-400">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 min-h-0">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-teal-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100 shrink-0">
          <div className="flex items-center gap-3 p-2">
            <div className="size-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {user?.firstName?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{user?.firstName}</p>
              <p className="text-xs text-stone-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 bg-white border-b border-stone-200 flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg">
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-medium text-stone-500">
              <Link to="/careseeker/dashboard" className="hover:text-teal-600">Home</Link>
              <ChevronRight className="size-4" />
              <span className="text-stone-900 font-semibold">{pageTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg">
              <Bell className="size-5" />
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
