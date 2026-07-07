import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, Variants } from "framer-motion";
import { useAuth } from '../../contexts/AuthContext';
import { useCareseekerDashboard } from '../../hooks/useCareseekerDashboard';
import { getDocumentsStatistics } from '../../lib/api/documents';
import { SkeletonScreen } from '../../components/SkeletonScreen';

import {
  Heart,
  Search,
  Calendar,
  MessageCircle,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Video,
  Upload,
  Users,
  CreditCard,
  Bell,
  Star,
  TrendingUp,
  Activity,
  Shield,
  MapPin,
  Zap,
  Sparkles,
  ChevronRight,
  Phone
} from 'lucide-react';

interface UpcomingSession {
  id: string;
  providerName: string;
  date: string;
  time: string;
  type: 'in-person' | 'video' | 'phone';
  status: 'confirmed' | 'pending';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export default function CareseekerDashboard() {
  const { user: authUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const { data, isLoading: dashboardLoading, error } = useCareseekerDashboard();
  const [docStats, setDocStats] = useState<{ total: number; approved: number; pending: number } | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (authUser) {
      setUser(authUser as unknown as Record<string, unknown>);
    }
  }, [authUser]);

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user && user.onboarding_status && user.onboarding_status !== 'complete' && user.onboarding_status !== 'completed') {
      navigate('/careseeker/onboarding');
    }
  }, [user]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const fetchDocStats = async () => {
      try {
        const response = await getDocumentsStatistics();
        if (response?.data) {
          setDocStats({
            total: response.data.total || 0,
            approved: response.data.by_status?.approved || 0,
            pending: response.data.by_status?.pending || 0,
          });
        }
      } catch (e) {
        console.error('Failed to fetch document stats:', e);
      }
    };
    fetchDocStats();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const displaySessions = data?.upcomingSessions.map((s) => ({
    id: s.id,
    providerName: s.providerName,
    date: formatDate(s.scheduledAt),
    time: formatTime(s.scheduledAt),
    type: s.type === 'telehealth' ? 'video' : s.type,
    status: s.status === 'scheduled' ? 'confirmed' : s.status
  })) || [];

  const displayNotifications = (data?.alerts || []).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    title: a.title as string,
    message: a.body as string,
    time: new Date(a.created_at as string).toLocaleDateString(),
    read: false,
    type: 'info'
  })) || [];

  const quickActions = [
    {
      name: 'Find Providers',
      description: 'Browse verified care',
      href: '/careseeker/providers',
      icon: Search,
      color: 'bg-teal-500',
      bg: 'bg-teal-50',
      text: 'text-teal-700'
    },
    {
      name: 'Emergency',
      description: 'Urgent request',
      href: '/careseeker/emergency',
      icon: AlertCircle,
      color: 'bg-rose-500',
      bg: 'bg-rose-50',
      text: 'text-rose-700'
    },
    {
      name: 'Bookings',
      description: 'View schedule',
      href: '/careseeker/bookings',
      icon: Calendar,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700'
    },
    {
      name: 'Wallet',
      description: 'Credits & top-ups',
      href: '/careseeker/wallet',
      icon: CreditCard,
      color: 'bg-green-500',
      bg: 'bg-green-50',
      text: 'text-green-700'
    },
    {
      name: 'Documents',
      description: 'Medical records',
      href: '/careseeker/documents',
      icon: FileText,
      color: 'bg-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-700'
    },
    {
      name: 'Messages',
      description: 'Chat with team',
      href: '/careseeker/messages',
      icon: MessageCircle,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700'
    },
  ];

  const stats = [
    { label: 'Active Providers', value: data?.summary.activeProviders || 0, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', trend: 'Care active' },
    { label: 'Upcoming Sessions', value: data?.summary.upcomingSessionsCount || 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50', trend: 'Next: Soon' },
    { label: 'Unread Messages', value: data?.summary.unreadMessages || 0, icon: MessageCircle, color: 'text-teal-500', bg: 'bg-teal-50', trend: 'Check inbox' },
    { label: 'Documents', value: docStats?.total || 0, icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', trend: docStats && docStats.total > 0 ? `${docStats.approved} verified` : 'No documents' },
  ];

  const containerVariant: Variants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      };

  const itemVariant: Variants = prefersReducedMotion
    ? { hidden: {}, visible: {} }
    : {
        hidden: { y: 20, opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: {
            type: 'spring',
            stiffness: 100
          }
        }
      };

  const careStatus: 'active' | 'ready' | 'incomplete' =
    ((data?.summary.activeProviders || 0) > 0 ? 'active' : 'ready') as 'active' | 'ready' | 'incomplete';

  if (dashboardLoading || !user) {
    return <SkeletonScreen />;
  }

  return (
    <m.div
      initial="hidden"
      animate="visible"
      variants={containerVariant}
      className="min-h-0 bg-transparent p-0"
    >
      <div className="w-full space-y-8">

        {/* Welcome Component */}
        <m.div variants={itemVariant} className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-stone-900 border border-stone-800 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="absolute top-0 right-0 p-12 opacity-20">
            <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#14b8a6" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.2,-19.2,96.6,-4.8C95,9.6,85,23.5,74.6,35.6C64.2,47.7,53.4,58,41.2,65.8C29,73.6,15.5,78.9,1.2,76.8C-13,74.7,-27.1,65.2,-40.5,56.1C-53.9,47,-66.6,38.3,-75.7,26.4C-84.8,14.5,-90.3,-0.6,-87.3,-14.2C-84.3,-27.8,-72.8,-39.9,-61.2,-48.6C-49.6,-57.3,-37.9,-62.6,-25.9,-71C-13.9,-79.4,-1.6,-90.9,9.4,-88.8C20.4,-86.7,30.5,-101,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
          </div>

          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider shadow-[0_2px_8px_rgba(20,184,166,0.1)]">
                  <Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Careseeker Dashboard
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold text-white mb-4 tracking-tight [text-wrap:balance]">
                Hello, {(user?.firstName as string) || 'Guest'}
              </h1>
              <p className="text-stone-400 text-lg max-w-xl leading-relaxed">
                Welcome back. Your care network is active and running smoothly.
                Find new providers or manage your current sessions below.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/careseeker/providers"
                className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-[var(--radius-lg)] transition-transform duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <Search className="size-5" strokeWidth={1.5} aria-hidden="true" />
                Find Care
              </Link>
              <Link
                to="/careseeker/emergency"
                className="px-8 py-4 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-[var(--radius-lg)] transition-transform duration-300 border border-stone-700 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
              >
                <Zap className="size-5 text-amber-400" aria-hidden="true" />
                Urgent Request
              </Link>
            </div>
          </div>
        </m.div>

        {/* Status Bar */}
        <m.div variants={itemVariant} className="flex flex-col gap-6 lg:gap-10">
          {/* Care Readiness */}
          <div className={`w-full lg:flex-1 lg:min-w-0 rounded-[var(--radius-2xl)] p-6 border transition-transform duration-300 ${careStatus === 'incomplete' ? 'bg-amber-50/50 border-amber-100' : careStatus === 'active' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white ring-1 ring-stone-100/50 '}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-[var(--radius-xl)] ${careStatus === 'incomplete' ? 'bg-amber-100 text-amber-600' : careStatus === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
                {careStatus === 'incomplete' ? <AlertCircle className="size-6" strokeWidth={1.5} /> :
                  careStatus === 'active' ? <CheckCircle className="size-6" strokeWidth={1.5} /> :
                    <Shield className="size-6" strokeWidth={1.5} />}
              </div>
              <div>
                <h3 className={`font-semibold text-lg mb-1 ${careStatus === 'incomplete' ? 'text-amber-900' : careStatus === 'active' ? 'text-emerald-900' : 'text-stone-900'}`}>
                  {careStatus === 'incomplete' ? 'Profile Incomplete' :
                    careStatus === 'active' ? 'Care Active' :
                      'Account Active'}
                </h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-3">
                  {careStatus === 'incomplete' ? 'Complete your profile to unlock all features.' :
                    careStatus === 'active' ? 'Your provider is scheduled and active.' :
                      'You are ready to match with providers.'}
                </p>
                {careStatus !== 'active' && (
                  <Link to={careStatus === 'incomplete' ? '/careseeker/onboarding' : '/careseeker/providers'} className="inline-flex items-center gap-1 text-sm font-bold text-teal-600 hover:text-teal-700">
                    {careStatus === 'incomplete' ? 'Complete Profile' : 'Find Providers'} <ArrowRight className="size-4" strokeWidth={1.5} />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
            {stats.map((stat, index) => (
              <div key={stat.label} className={`bg-white/90 backdrop-blur-xl rounded-[var(--radius-2xl)] p-6 sm:p-8 ring-1 ring-stone-100/50 flex flex-col justify-between group transition-transform duration-300 hover:-translate-y-1 ${index === 0 ? 'md:col-span-2 md:row-span-2' : index === 3 ? 'md:col-span-2' : ''}`}>
                <div>
                  <div className={`${index === 0 ? 'size-14' : 'size-10'} rounded-[var(--radius-xl)] ${stat.bg} ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={index === 0 ? 'size-7' : 'size-5'} strokeWidth={1.5} />
                  </div>
                  <div className={`font-bold text-stone-800 ${index === 0 ? 'text-4xl md:text-5xl' : 'text-2xl'}`}>{stat.value}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1 line-clamp-1">{stat.label}</div>
                  <div className="text-xs text-stone-800 font-medium bg-stone-50 inline-block px-2 py-1 rounded-[var(--radius-md)]">{stat.trend}</div>
                </div>
              </div>
            ))}
          </div>
        </m.div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-20">

            {/* Quick Actions */}
            <m.div variants={itemVariant}>
              <h2 className="text-3xl md:text-4xl font-semibold text-stone-800 mb-6 flex items-center gap-2 [text-wrap:balance]">
                <Zap className="size-6 text-amber-500" strokeWidth={1.5} /> Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <Link key={action.name} to={action.href} className="block h-full">
                    <div className="group bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-5 ring-1 ring-stone-100/50 shadow-lg shadow-stone-200/40 transition-transform duration-300 hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden h-full">
                      <div className="absolute top-0 right-0 size-24 bg-gradient-to-br from-stone-50 to-transparent rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                      <div className="relative">
                        <div className={`size-12 rounded-[var(--radius-lg)] ${action.bg} ${action.text} flex items-center justify-center mb-4 transition-transform group-hover:rotate-6`}>
                          <action.icon className="size-6" strokeWidth={1.5} />
                        </div>
                        <h3 className="font-semibold text-stone-800 mb-1">{action.name}</h3>
                        <p className="text-xs text-stone-500 font-medium">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </m.div>

            {/* Recent Activity / Sessions */}
            <m.div variants={itemVariant}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl md:text-4xl font-semibold text-stone-800 flex items-center gap-2 [text-wrap:balance]">
                  <Calendar className="size-6 text-blue-500" strokeWidth={1.5} /> Upcoming Sessions
                </h2>
                <Link to="/careseeker/bookings" className="text-sm font-bold text-teal-600 hover:text-teal-700">View Schedule</Link>
              </div>

              {displaySessions.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-xl rounded-[var(--radius-2xl)] p-12 text-center ring-1 ring-stone-100/50 ">
                  <div className="size-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="size-8 text-stone-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800 mb-2">No upcoming sessions</h3>
                  <Link to="/careseeker/providers">
                    <button className="px-6 py-2 bg-stone-900 text-white text-sm font-bold rounded-[var(--radius-lg)] hover:bg-stone-800 transition-colors">
                      Book a Session
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {displaySessions.map((session) => (
                    <div key={session.id} className="group bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-6 ring-1 ring-stone-100/50 shadow-lg shadow-stone-200/40 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-transform duration-300 hover:-translate-y-1">
                      <div className="flex items-center gap-5">
                        <div className="size-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-[var(--radius-lg)] flex items-center justify-center text-white text-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.04)] shadow-teal-200">
                          {session.providerName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-stone-900 mb-1">{session.providerName}</h3>
                          <div className="flex items-center gap-3 text-sm font-medium text-stone-500">
                            <span className="flex items-center gap-1.5 bg-stone-50 px-3 py-1 rounded-lg">
                              <Clock className="size-3.5" strokeWidth={1.5} />
                              {session.date}, {session.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                        <div className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-bold flex items-center gap-2 ${session.type === 'video' ? 'bg-purple-50 text-purple-700' : session.type === 'phone' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'}`}>
                          {session.type === 'video' && <Video className="size-4" strokeWidth={1.5} />}
                          {session.type === 'phone' && <Phone className="size-4" strokeWidth={1.5} />}
                          {session.type !== 'video' && session.type !== 'phone' && <MapPin className="size-4" strokeWidth={1.5} />}
                          <span className="capitalize">{session.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </m.div>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">

            {/* Notifications */}
            <m.div variants={itemVariant} className="bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-6 ring-1 ring-stone-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                  <Bell className="size-5 text-rose-500" strokeWidth={1.5} /> Alerts
                </h3>
                <div className="size-6 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {displayNotifications.filter(n => !n.read).length}
                </div>
              </div>

              <div className="space-y-2">
                {displayNotifications.length === 0 ? (
                  <p className="text-sm text-center text-stone-500 py-4">No new alerts</p>
                ) : (
                  displayNotifications.map((notification) => (
                    <div key={notification.id} className={`p-4 rounded-[var(--radius-lg)] transition-colors ${notification.read ? 'bg-white hover:bg-stone-50' : 'bg-rose-50/50 hover:bg-rose-50'}`}>
                      <div className="flex gap-4">
                        <div className={`mt-1 flex-shrink-0 size-2 rounded-full ${notification.read ? 'bg-stone-200' : 'bg-rose-500'}`}></div>
                        <div>
                          <h4 className={`text-sm font-semibold mb-0.5 ${notification.read ? 'text-stone-700' : 'text-stone-900'}`}>{notification.title}</h4>
                          <p className="text-xs text-stone-500 leading-relaxed mb-2">{notification.message}</p>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">{notification.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </m.div>

            {/* Recent Activity */}
            <m.div variants={itemVariant} className="bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-6 ring-1 ring-stone-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.08)] relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-semibold mb-6 flex items-center gap-2 text-stone-800">
                  <Activity className="size-5 text-teal-500" strokeWidth={1.5} /> Recent Activity
                </h3>
                <div className="space-y-4">
                  {(data?.recentActivity || []).length === 0 ? (
                    <p className="text-sm text-stone-500">No recent activity</p>
                  ) : (
                    (data?.recentActivity || []).map((activity: Record<string, unknown>, index: number) => {
                      const typeConfig = {
                        'report_created': { label: 'Report Created', icon: FileText, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                        'booking_pending_payment': { label: 'Payment Pending', icon: CreditCard, bg: 'bg-amber-50', text: 'text-amber-600' },
                        'booking_completed': { label: 'Session Completed', icon: CheckCircle, bg: 'bg-blue-50', text: 'text-blue-600' },
                        'booking_confirmed': { label: 'Booking Confirmed', icon: Calendar, bg: 'bg-purple-50', text: 'text-purple-600' },
                        'default': { label: 'Activity', icon: Activity, bg: 'bg-stone-50', text: 'text-stone-600' }
                      };

                      const config = typeConfig[activity.type as keyof typeof typeConfig] || typeConfig['default'];
                      const Icon = config.icon;

                      const getRelativeTime = (dateStr: string) => {
                        const date = new Date(dateStr);
                        const now = new Date();
                        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

                        if (diffInSeconds < 60) return 'Just now';
                        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
                        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                        return `${Math.floor(diffInSeconds / 86400)}d ago`;
                      };

                      const handleClick = () => {
                        const activityType = activity.type as string;
                        const activityId = activity.id as string;
                        if (!activityId) return;

                        if (activityType.includes('booking')) {
                          navigate('/careseeker/bookings');
                        } else if (activityType === 'report_created') {
                          navigate('/careseeker/care-summary');
                        }
                      };

                      return (
                        <div
                          key={(activity.id as string) || `activity-${activity.type}-${activity.date}-${index}`}
                          className="flex items-center gap-4 cursor-pointer hover:bg-stone-50 rounded-[var(--radius-lg)] p-2 transition-colors"
                          onClick={handleClick}
                        >
                          <div className={`size-10 rounded-[var(--radius-md)] ${config.bg} ${config.text} flex items-center justify-center`}>
                            <Icon className="size-5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-stone-800" title={activity.description as string}>{config.label}</div>
                            <div className="text-xs text-stone-500 font-medium">{getRelativeTime(activity.date as string)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </m.div>

          </div>
        </div>
      </div>
    </m.div>
  );
}
