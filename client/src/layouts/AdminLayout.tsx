import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, CreditCard, ShieldCheck, LogOut, Menu, X,
  FileText, AlertTriangle, Settings, BarChart3, Building2, UserCheck, Bell,
  ChevronDown, ChevronRight, DollarSign, BookOpen, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { STORAGE_KEYS } from '@/lib/storage-keys';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAVIGATION: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Users',
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Providers', href: '/admin/providers', icon: UserCheck },
      { name: 'Staff', href: '/admin/staff', icon: Building2 },
      { name: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
      { name: 'Payments', href: '/admin/payments', icon: CreditCard },
      { name: 'Payouts', href: '/admin/payouts', icon: DollarSign },
      { name: 'Assignments', href: '/admin/assignments', icon: ClipboardList },
      { name: 'Sessions', href: '/admin/sessions', icon: BookOpen },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { name: 'Documents', href: '/admin/documents', icon: FileText },
      { name: 'Compliance', href: '/admin/compliance', icon: ShieldCheck },
      { name: 'Incidents', href: '/admin/incidents', icon: AlertTriangle },
      { name: 'Disputes', href: '/admin/disputes', icon: AlertTriangle },
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    ],
  },
  {
    title: 'Config',
    items: [
      { name: 'Services', href: '/admin/services', icon: Building2 },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.adminSidebarExpanded);
      return saved ? JSON.parse(saved) : ['overview', 'users', 'operations'];
    } catch {
      return ['overview', 'users', 'operations'];
    }
  });

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SESSION_TIMEOUT = 30 * 60 * 1000;
  const WARNING_BEFORE = 5 * 60 * 1000;

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, updateActivity));
    return () => events.forEach((e) => window.removeEventListener(e, updateActivity));
  }, [updateActivity]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= WARNING_BEFORE && remaining > 0) {
        setShowTimeoutWarning(true);
      } else if (remaining <= 0) {
        logout().then(() => navigate('/admin/login'));
      } else {
        setShowTimeoutWarning(false);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [logout, navigate, SESSION_TIMEOUT, WARNING_BEFORE]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.adminSidebarExpanded, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title],
    );
  };

  const isActiveRoute = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin' || pathname === '/admin/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans selection:bg-teal-500/30">
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-stone-100 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="size-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="text-xl font-bold text-stone-900 tracking-tight">Raiyah</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-stone-400 hover:text-stone-600 rounded">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 my-4">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-teal-600 rounded-xl flex items-center justify-center font-bold text-white">
                {user?.firstName?.[0] ?? 'A'}
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">{user?.firstName ?? 'Admin'}</p>
                <div className="flex items-center gap-1 text-teal-600">
                  <ShieldCheck className="size-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Super Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
          {NAVIGATION.map((group) => {
            const isExpanded = expandedGroups.includes(group.title.toLowerCase());
            return (
              <div key={group.title}>
                <button
                  onClick={() => toggleGroup(group.title.toLowerCase())}
                  className="w-full flex items-center justify-between px-3 mb-1 text-[11px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors"
                >
                  <span>{group.title}</span>
                  <ChevronDown className={`size-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <div className={`space-y-0.5 ${isExpanded ? 'block' : 'hidden'}`}>
                  {group.items.map((item) => {
                    const active = isActiveRoute(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          active
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                        }`}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {item.badge ? (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-stone-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg">
              <Menu className="size-5" />
            </button>
            <nav className="hidden lg:flex items-center text-sm font-medium text-stone-500">
              <Link to="/admin" className="hover:text-stone-900">Admin</Link>
              {pathname !== '/admin' && pathname !== '/admin/dashboard' && (
                <>
                  <ChevronRight className="size-4 mx-2 text-stone-400" />
                  <span className="text-stone-900 capitalize font-bold">
                    {pathname.split('/').pop()?.replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-xl">
              <Bell className="size-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="size-8 bg-stone-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {user?.firstName?.[0] ?? 'A'}
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto p-4 lg:p-8 bg-stone-50">
          <Outlet />
        </main>
      </div>

      {/* Session timeout warning */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="size-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="size-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Session Timeout Warning</h3>
            <p className="text-stone-500 mb-6">
              Your session will expire in {Math.ceil(timeRemaining / 1000)} seconds due to inactivity.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setShowTimeoutWarning(false); handleLogout(); }}
                className="px-6 py-3 ring-1 ring-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50"
              >
                Logout Now
              </button>
              <button
                onClick={updateActivity}
                className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700"
              >
                Extend Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
