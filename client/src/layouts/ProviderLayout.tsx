import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, MessageCircle, FileText, Settings,
  DollarSign, Star, ShoppingBag, Store, Menu, X, Bell, ChevronRight,
  ClipboardList, Clock, Briefcase, Award, UserCog,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number | null;
}

export function ProviderLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/provider/dashboard', icon: LayoutDashboard },
    { name: 'Schedule', href: '/provider/schedule', icon: Calendar },
    { name: 'Job Requests', href: '/provider/job-requests', icon: Briefcase },
    { name: 'Clients', href: '/provider/clients', icon: Users },
    { name: 'Messages', href: '/provider/messages', icon: MessageCircle },
    { name: 'Marketplace', href: '/provider/marketplace', icon: Store },
    { name: 'Offers', href: '/provider/offers', icon: ShoppingBag },
    { name: 'Earnings', href: '/provider/earnings', icon: DollarSign },
    { name: 'Payouts', href: '/provider/payouts', icon: DollarSign },
    { name: 'Reviews', href: '/provider/reviews', icon: Star },
    { name: 'Documents', href: '/provider/documents', icon: FileText },
    { name: 'Tasks', href: '/provider/tasks', icon: ClipboardList },
    { name: 'Availability', href: '/provider/availability', icon: Clock },
    { name: 'Training', href: '/provider/training', icon: Award },
    { name: 'Pricing', href: '/provider/pricing', icon: DollarSign },
    { name: 'Account', href: '/provider/account', icon: UserCog },
    { name: 'Settings', href: '/provider/settings', icon: Settings },
  ];

  const isActive = (href: string) =>
    href === '/provider/dashboard'
      ? pathname === '/provider' || pathname === '/provider/dashboard'
      : pathname.startsWith(href);

  const pageTitle = navigation.find((n) => isActive(n.href))?.name ?? 'Dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/provider/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
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
        <div className="flex items-center justify-between h-16 px-4 border-b border-stone-100">
          <Link to="/provider/dashboard" className="flex items-center gap-2">
            <div className="size-7 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-bold text-stone-900">Raiyah</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded text-stone-400">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
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
                  <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100">
          <div className="flex items-center gap-3 p-2">
            <div className="size-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {user?.firstName?.[0] ?? 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{user?.firstName}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-stone-100 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg">
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-medium text-stone-500">
              <Link to="/provider/dashboard" className="hover:text-teal-600">Provider</Link>
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

        <main id="main-content" className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
