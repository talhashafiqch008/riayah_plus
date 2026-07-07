import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, MessageCircle, FileText, User, Clock, ClipboardList, Menu, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function StaffLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'Messages', href: '/staff/messages', icon: MessageCircle },
    { name: 'Notes', href: '/staff/notes', icon: FileText },
    { name: 'Profile', href: '/staff/profile', icon: User },
    { name: 'Shifts', href: '/staff/shifts', icon: Clock },
    { name: 'Tasks', href: '/staff/tasks', icon: ClipboardList },
  ];

  const isActive = (href: string) =>
    href === '/staff/dashboard'
      ? pathname === '/staff' || pathname === '/staff/dashboard'
      : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-stone-100 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-stone-100">
          <span className="font-bold text-stone-900">Staff Portal</span>
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
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-stone-100 text-sm text-stone-600 px-5 pb-4">
          <p className="font-semibold">{user?.firstName}</p>
          <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-stone-100 flex items-center px-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg mr-3">
            <Menu className="size-5" />
          </button>
          <span className="font-semibold text-stone-900">
            {navigation.find((n) => isActive(n.href))?.name ?? 'Staff'}
          </span>
        </header>
        <main id="main-content" className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
