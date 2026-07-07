
import { lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useProviderDashboard } from '../../hooks/useProviderDashboard';
import { Link } from 'react-router-dom';
import { m, LazyMotion, domAnimation } from "framer-motion";
import {
 Calendar as CalendarIcon,
 DollarSign,
 MoreHorizontal,
 ArrowUpRight,
 Clock,
 MapPin,
 Briefcase,
 Zap,
 TrendingUp,
 Filter,
 ChevronDown,
 Bell,
 CheckCircle2,
 XCircle,
 AlertCircle,
 User,
 FileText,
 Loader2,
 Wallet,
 Star
} from 'lucide-react';
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
} from '../../components/charts/ChartWrapper';
import { Button } from '../../components/ui/button';
import { isApiError } from '../../lib/errors';
import toast from 'react-hot-toast';
import { BCard } from '../../components/BCard';
import { StatPill } from '../../components/StatPill';
import { ModernHeader } from '../../components/ModernHeader';
import { SkeletonScreen } from '../../components/SkeletonScreen';

const SessionDistributionMap = lazy(() => import('../../components/maps/SessionDistributionMap')) as React.ComponentType<{ sessionDistribution: DashboardStats['sessionDistribution'] }>;

// Define the interface for the dashboard stats
interface DashboardStats {
 weeklyRevenue: {
 amount: number;
 growth: number;
 currency: string;
 };
 schedule: {
 todayCount: number;
 nextAppointment: {
 id: number;
 clientName: string;
 scheduledAt: string;
 serviceType: string;
 } | null;
 };
 responseRate: {
 rate: number;
 totalRequests: number;
 responded: number;
 };
 patients: {
 totalActive: {
 count: number;
 growth: number;
 };
 newThisMonth: {
 count: number;
 growth: number;
 };
 };
  averageRating?: number;
  ratingCount?: number;
  sessionDistribution: {
  country: string;
  count: number;
  percentage: number;
  }[];
  sessionHistory: {
  id: number;
  clientName: string;
  clientAvatar: string | null;
  serviceType: string;
  date: string;
  amount: number;
  status: string;
  }[];
}

const verificationConfig: Record<string, { label: string; message: string; icon: React.ReactNode; bg: string; border: string; text: string; badge: string }> = {
 approved: {
 label: 'Verified',
 message: 'Your account is fully verified and active.',
 icon: <CheckCircle2 className="size-4" />,
 bg: 'bg-emerald-50',
 border: 'border-emerald-100',
 text: 'text-emerald-900',
 badge: 'text-emerald-800 bg-white/50',
 },
 rejected: {
 label: 'Rejected',
 message: 'Your verification was rejected. Please contact support.',
 icon: <XCircle className="size-4" />,
 bg: 'bg-red-50',
 border: 'border-red-100',
 text: 'text-red-900',
 badge: 'text-red-800 bg-white/50',
 },
 needs_review: {
 label: 'Needs Review',
 message: 'Additional documents are required for verification.',
 icon: <AlertCircle className="size-4" />,
 bg: 'bg-amber-50',
 border: 'border-amber-100',
 text: 'text-amber-900',
 badge: 'text-amber-800 bg-white/50',
 },
 pending: {
 label: 'Pending Review',
 message: 'Your documents are under review.',
 icon: <Clock className="size-4" />,
 bg: 'bg-teal-50',
 border: 'border-teal-100',
 text: 'text-teal-900',
 badge: 'text-teal-800 bg-white/50',
 },
};

function VerificationStatusCard({ status }: { status: string }) {
 const config = verificationConfig[status] || verificationConfig.pending;
 return (
 <div className={`${config.bg} ${config.border} relative rounded-[var(--radius-lg)] p-6 border`}>
 <div className={`absolute -right-6 -top-6 size-24 rounded-full blur-[40px] opacity-60 ${config.bg.replace('bg-', 'bg-').replace('50', '100')}`} />
 <h4 className={`font-semibold ${config.text} relative z-10`}>{config.label}</h4>
 <p className={`text-sm mt-1 mb-4 relative z-10 opacity-80 ${config.text}`}>{config.message}</p>
 <div className={`flex items-center gap-2 text-xs font-bold p-2 rounded-lg w-fit ${config.badge}`}>
 {config.icon} {status === 'pending' ? 'Estimated: 2 days' : `Status: ${status}`}
 </div>
 </div>
 );
}

export default function ProviderDashboard() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
   const [isMounted, setIsMounted] = useState(false);
   const hasRefreshed = useRef(false);
   const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'history'>('overview');

   const [verificationStatus, setVerificationStatus] = useState<string>('pending');

   const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useProviderDashboard();
   const stats = (dashboardData?.stats as unknown as DashboardStats) ?? null;
   const earningsData = dashboardData?.earningsData ?? null;

   useEffect(() => {
   setIsMounted(true);
   }, []);

  useEffect(() => {
  if (loading) return;
  if (!user && !hasRefreshed.current) {
  hasRefreshed.current = true;
  refreshUser();
  return;
  }
  const onboardingStatus = user?.onboarding_status;
 if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
 navigate('/provider/onboarding');
 return;
 }
 setVerificationStatus((user as { verification_status?: string }).verification_status || 'pending');
 }, [user, loading, navigate, refreshUser]);

 useEffect(() => {
 if (!dashboardError) return;
 if (isApiError(dashboardError)) {
 toast.error(dashboardError.message || "Failed to load dashboard data");
 } else {
 toast.error("Failed to load dashboard data");
 }
 }, [dashboardError]);

 if (loading || !isMounted || !user || dashboardLoading) {
  return <SkeletonScreen />;
  }

 return (
 <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 lg:p-12 font-sans">
 <div className="max-w-7xl mx-auto">
 <ModernHeader activeTab={activeTab} onTabChange={setActiveTab} />

 {activeTab === 'overview' && (
 <div className="grid grid-cols-1 md:grid-cols-12 gap-5 grid-rows-[auto_auto_auto]">

 {/* 1. Main Stats Row (Top) */}
 <BCard className="md:col-span-8 flex-row items-center justify-between gap-4 sm:gap-8 min-h-[140px] sm:min-h-[160px]">
 <div className="flex flex-col justify-between h-full py-2">
 <div>
 <h3 className="text-lg font-semibold text-stone-900 font-[family-name:var(--font-display)]">Weekly Revenue</h3>
 <p className="text-sm text-stone-400 font-medium">Current Week</p>
 </div>
 <div className="mt-auto">
 <span className="text-4xl font-extrabold text-stone-900 tracking-tighter">
 {stats?.weeklyRevenue.currency} {stats?.weeklyRevenue.amount.toLocaleString()}
 </span>
 <div className={`flex items-center gap-2 mt-2 text-sm font-medium ${stats && stats.weeklyRevenue.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
 <TrendingUp className={`size-4 ${stats && stats.weeklyRevenue.growth < 0 ? 'rotate-180' : ''}`} />
 <span>{stats && stats.weeklyRevenue.growth > 0 ? '+' : ''}{stats?.weeklyRevenue.growth}% from last week</span>
 </div>
 </div>
 </div>
 <div className="hidden sm:flex flex-col items-end justify-center">
 <div className={`text-sm font-semibold ${(stats?.weeklyRevenue.growth ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
 {(stats?.weeklyRevenue.growth ?? 0) >= 0 ? '+' : ''}{stats?.weeklyRevenue.growth ?? 0}%
 </div>
 <div className="text-xs text-stone-400">vs last week</div>
 </div>
 </BCard>

 {/* RESPONSE RATE CARD: UPDATED DESIGN */}
 <BCard className="md:col-span-4 bg-white relative overflow-hidden min-h-[140px] sm:min-h-[160px] group border-teal-100/50">
 <div className="absolute top-0 right-0 size-32 bg-teal-50 rounded-full blur-[40px] opacity-60 translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-700" />
 <div className="relative z-10 flex flex-col h-full justify-between p-2">
 <div className="flex justify-between items-start">
 <div className="flex flex-col">
 <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest">Response Rate</h3>
 <div className="text-5xl font-black tracking-tighter text-stone-900 mt-2">
 {stats?.responseRate.rate}<span className="text-teal-500 text-3xl">%</span>
 </div>
 </div>
 <div className="p-3 bg-teal-50 rounded-[var(--radius-xl)] text-teal-600 group-hover:rotate-12 transition-transform">
 <Zap className="size-6 fill-current" />
 </div>
 </div>
 <div className="mt-auto">
 <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
 <span className="size-2 rounded-full bg-teal-500 animate-pulse" />
 {stats && stats.responseRate.totalRequests > 0 ?
 `${stats.responseRate.responded} / ${stats.responseRate.totalRequests} responded` :
 'No requests yet'}
 </div>
 </div>
 </div>
 </BCard>

 {/* 2. Middle Row: Schedule & Details */}
 <div className="md:col-span-8 grid grid-cols-1 gap-5">
 {/* Upcoming Sessions List */}
 <BCard className="min-h-[300px] sm:min-h-[400px]" noPad>
 <div className="p-6 border-b border-stone-100 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-stone-900 [text-wrap:balance]">
 Schedule <span className="text-stone-400 text-sm ml-2 font-medium">(Today: {stats?.schedule.todayCount})</span>
 </h3>

 </div>
 <div className="p-2">
 {stats?.schedule.nextAppointment ? (
 <div className="group flex items-start gap-4 p-4 rounded-[var(--radius-xl)] bg-teal-50/50 border border-teal-100/50 hover:bg-teal-50 transition-colors cursor-pointer mb-2">
 <div className="flex-shrink-0 size-12 rounded-[var(--radius-lg)] bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-lg">
 {stats.schedule.nextAppointment.clientName.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex justify-between items-start mb-1">
 <h4 className="text-base font-semibold text-stone-900 truncate">
 {stats.schedule.nextAppointment.clientName}
 <span className="ml-2 text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Next Up</span>
 </h4>
 <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700">
 Scheduled
 </span>
 </div>
 <p className="text-sm font-medium text-stone-500 mb-2 capitalize">{stats.schedule.nextAppointment.serviceType}</p>
 <div className="flex items-center gap-4 text-xs font-medium text-stone-400">
 <span className="flex items-center gap-1.5">
 <Clock className="size-3.5" />
 {new Date(stats.schedule.nextAppointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 <span className="flex items-center gap-1.5"><CalendarIcon className="size-3.5" />{new Date(stats.schedule.nextAppointment.scheduledAt).toLocaleDateString()}</span>
 </div>
 </div>
 <button className="p-2 bg-white border border-stone-200 rounded-lg shadow-sm text-stone-600 hover:text-teal-600 transition-all">
 <ArrowUpRight className="size-4" />
 </button>
 </div>
 ) : (
 <div className="p-8 text-center text-stone-400">
 <CalendarIcon className="size-12 mx-auto mb-3 opacity-20" />
 <p>No upcoming appointments found</p>
 </div>
 )}

 {/* Placeholder for other sessions if list was available, or keep mock data for visual fullness if preferred by user, but let's stick to real data emphasis */}
 </div>
 <div className="p-4 border-t border-stone-50 text-center">
 <Link to="/provider/schedule">
 <button className="text-xs font-bold text-stone-400 hover:text-teal-600 transition-colors uppercase tracking-widest">View Full Calendar</button>
 </Link>
 </div>
 </BCard>
 </div>

 <div className="md:col-span-4 grid grid-cols-1 gap-5">
 {/* Mini Stats Column */}
 <BCard>
 <div className="flex items-center gap-3 mb-6">
 <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><User className="size-5" /></div>
 <h4 className="font-semibold text-stone-900">Patients</h4>
 </div>
 <StatPill
 label="Total Active"
 value={stats?.patients.totalActive.count.toLocaleString() || "0"}
 trend={`${(stats?.patients.totalActive.growth ?? 0) > 0 ? '+' : ''}${stats?.patients.totalActive.growth ?? 0}%`}
 trendUp={(stats?.patients.totalActive.growth ?? 0) >= 0}
 />
 <div className="mt-6 pt-6 border-t border-stone-100">
 <StatPill
 label="New This Month"
 value={stats?.patients.newThisMonth.count.toLocaleString() || "0"}
 trend={`${(stats?.patients.newThisMonth.growth ?? 0) > 0 ? '+' : ''}${stats?.patients.newThisMonth.growth ?? 0}%`}
 trendUp={(stats?.patients.newThisMonth.growth ?? 0) >= 0}
 />
 </div>
 </BCard>

 <VerificationStatusCard status={verificationStatus} />

 <BCard>
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
 <Star className="size-5" />
 </div>
 <h4 className="font-semibold text-stone-900">Reviews</h4>
 </div>
 <div className="flex items-baseline gap-2 mb-1">
 <span className="text-3xl font-bold text-stone-900">{stats?.averageRating?.toFixed(1) || '0.0'}</span>
 <span className="text-sm text-stone-500">/ 5.0</span>
 </div>
 <div className="flex items-center gap-1 mb-4">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`size-4 ${star <= Math.round(stats?.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
 />
 ))}
 </div>
 <p className="text-sm text-stone-500 mb-4">
 {stats?.ratingCount || 0} reviews from clients
 </p>
 <Link to="/provider/reviews" className="block">
 <button className="w-full py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
 View All Reviews
 </button>
 </Link>
 </BCard>

 <BCard className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2 bg-white/10 rounded-[var(--radius-md)] backdrop-blur-sm">
 <Wallet className="size-5 text-teal-400" />
 </div>
 <h4 className="font-semibold text-stone-200">Available Balance</h4>
 </div>
 <div className="mb-4">
 <span className="text-3xl font-bold">{earningsData?.earnings?.total?.currency || 'USD'} {earningsData?.earnings?.pending?.amount?.toLocaleString() || '0'}</span>
 <p className="text-xs text-stone-400 mt-1">Ready for withdrawal</p>
 </div>
 <div className="pt-4 border-t border-white/10">
 <div className="flex items-center justify-between text-sm mb-3">
 <span className="text-stone-400">Total Earnings</span>
 <span className="font-semibold">{earningsData?.earnings?.total?.amount?.toLocaleString() || '0'}</span>
 </div>
 <Link to="/provider/payouts" className="block">
 <button className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-[var(--radius-lg)] text-sm font-semibold transition-colors flex items-center justify-center gap-2">
 <ArrowUpRight className="size-4" />
 Request Payout
 </button>
 </Link>
 </div>
 </div>
 </BCard>

 <BCard>
 <div className="flex items-center justify-between mb-4">
 <h4 className="font-semibold text-stone-900">Quick Actions</h4>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <button className="p-3 rounded-[var(--radius-lg)] bg-stone-50 hover:bg-stone-100 transition-colors flex flex-col items-center gap-2 text-center group">
 <div className="size-8 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-600 group-hover:scale-110 transition-transform">
 <FileText className="size-4" />
 </div>
 <span className="text-[10px] font-bold text-stone-600 uppercase">Report</span>
 </button>
 <Link to="/provider/earnings" className="contents">
 <button className="p-3 rounded-[var(--radius-lg)] bg-stone-50 hover:bg-stone-100 transition-colors flex flex-col items-center gap-2 text-center group">
 <div className="size-8 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-600 group-hover:scale-110 transition-transform">
 <DollarSign className="size-4" />
 </div>
 <span className="text-[10px] font-bold text-stone-600 uppercase">Payout</span>
 </button>
 </Link>
 </div>
 </BCard>
 </div>



 </div>
 )}

 {activeTab === 'analytics' && (
 <div className="grid grid-cols-1 gap-6">

 <BCard className="min-h-[400px] sm:min-h-[500px] lg:min-h-[700px]">
 <h3 className="text-lg font-semibold text-stone-900 mb-6 [text-wrap:balance]">Session Distribution</h3>
 {stats?.sessionDistribution && (
 <Suspense fallback={<div className="size-full bg-stone-100 animate-pulse rounded-[var(--radius-md)]" />}>
 <SessionDistributionMap sessionDistribution={stats.sessionDistribution} />
 </Suspense>
 )}
 </BCard>
 </div>
 )}

 {activeTab === 'history' && (
 <BCard noPad>
 <div className="p-6 border-b border-stone-100">
 <h3 className="text-lg font-semibold text-stone-900 [text-wrap:balance]">Session History</h3>
 </div>
 <div className="divide-y divide-stone-100">
 {stats?.sessionHistory && stats.sessionHistory.length > 0 ? (
 stats.sessionHistory.map((session) => (
 <div key={session.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
 <div className="flex items-center gap-4">
 <div className="size-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-lg overflow-hidden">
 {session.clientAvatar ? (
 <img width={100} height={100} src={session.clientAvatar} alt={session.clientName} className="size-full object-cover" loading="lazy" />
 ) : (
 session.clientName.charAt(0)
 )}
 </div>
 <div>
 <h4 className="font-semibold text-stone-900">{session.clientName}</h4>
 <div className="flex items-center gap-2 text-sm text-stone-500">
 <span className="capitalize">{session.serviceType}</span>
 <span>•</span>
 <span>{new Date(session.date).toLocaleDateString()}</span>
 </div>
 </div>
 </div>
 <div className="text-right">
 <span className="block font-bold text-stone-900 text-lg">SAR {session.amount.toLocaleString()}</span>
 <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 mt-1">
 {session.status}
 </span>
 </div>
 </div>
 ))
 ) : (
 <div className="p-12 text-center text-stone-400">
 <Clock className="size-12 mx-auto mb-3 opacity-20" />
 <p>No session history available yet.</p>
 </div>
 )}
 </div>
 </BCard>
 )}
 </div>
 </div>
 );
}
