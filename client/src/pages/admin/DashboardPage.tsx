
import { useState, useEffect , useRef } from 'react';
import { getAdminDashboard } from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Calendar, CreditCard, Activity, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/components/charts/ChartWrapper';
import { BCard } from '@/components/BCard';
import { StatPill } from '@/components/StatPill';

export default function AdminDashboard() {
 const [stats, setStats] = useState({
 users: { total: 0, patients: 0, caregivers: 0, doctors: 0 },
 sessions: { total: 0, completed: 0, pending: 0 },
 payments: { totalRevenue: 0, pending: 0, currency: 'SAR' }
 });
 const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
 const [systemStatus, setSystemStatus] = useState<any>(null);
 const [platformGrowth, setPlatformGrowth] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 loadStats();
 }, []);

 const loadStats = async () => {
 try {
 // Call the unified admin dashboard endpoint
 const response = await getAdminDashboard();
 const dashboardData = response.data || response; // Handle both wrapped and unwrapped responses

 // Map the backend response (snake_case) to our state structure (camelCase)
 setStats({
 users: {
 total: dashboardData.total_users?.total || 0,
 patients: dashboardData.total_users?.patients_count || 0,
 caregivers: dashboardData.total_users?.caregivers_count || dashboardData.total_users?.providers_count || 0,
 doctors: dashboardData.total_users?.providers_count || 0,
 },
 sessions: {
 total: dashboardData.total_sessions?.total || 0,
 completed: dashboardData.total_sessions?.completed || 0,
 pending: dashboardData.total_sessions?.pending || 0
 },
 payments: {
 totalRevenue: dashboardData.total_revenue?.amount || 0,
 pending: dashboardData.total_revenue?.pending_transactions || 0,
 currency: dashboardData.total_revenue?.currency || 'SAR'
 }
 });

 // Store additional data
 setRecentRegistrations(dashboardData.recent_registrations || []);
 setSystemStatus(dashboardData.system_status || null);
 setPlatformGrowth(dashboardData.platform_growth || null);
 } catch (error) {
 console.error('Failed to load admin stats:', error);
 toast.error('Failed to load dashboard data. Some stats may be unavailable.');
 // Keep default zeros on error
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-stone-50 p-8 flex items-center justify-center">
 <div className="size-10 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin" />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50 font-sans">
 <div className="max-w-7xl mx-auto space-y-8">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 Dashboard Overview
 </h1>
 <p className="text-stone-500 mt-1 font-medium">Global system performance monitoring.</p>
 </div>
 <div className="flex items-center gap-3">
 <div className="hidden md:flex items-center bg-white border border-stone-200 rounded-full p-1 shadow-sm">
 <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-stone-900 text-white shadow-md">Overview</span>
 </div>
 </div>
 </div>

 {/* Main Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

 {/* Revenue Card (Hero) */}
 <BCard className="md:col-span-8 relative overflow-hidden group border-emerald-100/50">
 <div className="absolute top-0 right-0 size-64 bg-emerald-50/50 rounded-full blur-[60px] translate-x-12 -translate-y-12 pointer-events-none" />
 <div className="relative z-10 flex flex-col h-full justify-between">
 <div className="flex justify-between items-start">
 <div>
 <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-1">Total Revenue</h3>
 <div className="text-5xl font-black tracking-tighter text-stone-900">
 {stats.payments.currency || 'SAR'} {stats.payments.totalRevenue.toLocaleString()}
 </div>
 </div>
 <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
 <CreditCard className="size-6" />
 </div>
 </div>
 <div className="mt-8 flex items-center gap-6">
 <div className="text-sm font-medium text-stone-400">
 {stats.payments.pending} transactions pending
 </div>
 </div>
 </div>
 </BCard>

 {/* System Status Card */}
 <BCard className="md:col-span-4 bg-stone-900 text-white relative overflow-hidden group border-stone-800">
 <div className="absolute top-0 right-0 size-32 bg-teal-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-teal-500/30 transition-colors" />
 <div className="flex flex-col h-full justify-between relative z-10">
 <div>
 <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-2">System Status</h3>
 <div className="flex items-center gap-3">
 <div className={`size-3 rounded-full ${systemStatus?.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]`} />
 <span className="text-2xl font-black tracking-tight text-white capitalize">{systemStatus?.status || 'Operational'}</span>
 </div>
 </div>
 <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
 <div>
 <div className="text-xs text-stone-400 font-bold uppercase">Uptime</div>
 <div className="text-lg font-bold text-emerald-400">{systemStatus?.uptime_percentage ? `${systemStatus.uptime_percentage}%` : '—'}</div>
 </div>
 <div>
 <div className="text-xs text-stone-400 font-bold uppercase">Latency</div>
 <div className="text-lg font-bold text-emerald-400">{systemStatus?.latency_ms ? `${systemStatus.latency_ms}ms` : '—'}</div>
 </div>
 </div>
 </div>
 </BCard>

 {/* Secondary Stats Row */}
 <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-5">
 <BCard>
 <StatPill
 label="Total Users"
 value={stats.users.total.toLocaleString()}
 trend={platformGrowth?.user_growth ? `${platformGrowth.user_growth > 0 ? '+' : ''}${platformGrowth.user_growth}%` : undefined}
 trendUp={platformGrowth?.user_growth ? platformGrowth.user_growth >= 0 : undefined}
 icon={Users}
 />
 <div className="mt-4 pt-4 border-t border-stone-100 flex gap-4 text-xs font-semibold text-stone-400">
 <span>{stats.users.patients} Patients</span>
 <span>{stats.users.caregivers + stats.users.doctors} Providers</span>
 </div>
 </BCard>

 <BCard>
 <StatPill
 label="Total Sessions"
 value={stats.sessions.total.toLocaleString()}
 trend={platformGrowth?.session_growth ? `${platformGrowth.session_growth > 0 ? '+' : ''}${platformGrowth.session_growth}%` : undefined}
 trendUp={platformGrowth?.session_growth ? platformGrowth.session_growth >= 0 : undefined}
 icon={Calendar}
 />
 <div className="mt-4 pt-4 border-t border-stone-100 flex gap-4 text-xs font-semibold text-stone-400">
 <span className="text-emerald-600">{stats.sessions.completed} Completed</span>
 <span className="text-orange-500">{stats.sessions.pending} Pending</span>
 </div>
 </BCard>

 <BCard>
 <StatPill
 label="Active Providers"
 value={(stats.users.doctors + stats.users.caregivers).toLocaleString()}
 icon={Activity}
 />
 <div className="mt-4 pt-4 border-t border-stone-100 flex gap-4 text-xs font-semibold text-stone-400">
 <span className="text-stone-500">{systemStatus?.active_providers ? `${systemStatus.active_providers} Currently Online` : 'Provider Status Active'}</span>
 </div>
 </BCard>
 </div>

 {/* Recent Registrations / Activity */}
 <BCard className="md:col-span-6 h-[300px]" noPad>
 <div className="p-6 border-b border-stone-100 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-stone-900">Recent Registrations</h3>
 <button className="text-xs font-bold text-teal-600 hover:underline">View All</button>
 </div>
 <div className="p-4 space-y-3 overflow-y-auto max-h-[220px]">
 {recentRegistrations.length > 0 ? (
 recentRegistrations.slice(0, 5).map((user: { id: string; name?: string; joined_at?: string; registration_type?: string; verified?: boolean; status?: string }) => (
 <div key={user.id} className="flex items-center gap-4 p-3 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer">
 <div className="size-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-white text-sm">
 {user.name?.charAt(0) || 'U'}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-stone-900 truncate">{user.name}</p>
 <p className="text-xs text-stone-500">{user.joined_at} • {user.registration_type}</p>
 </div>
 <div className={`text-xs font-bold px-2 py-1 rounded-md ${user.verified ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50' }`}>
 {user.status === 'verified' ? 'Verified' : 'Pending'}
 </div>
 </div>
 ))
 ) : (
 <div className="flex items-center justify-center h-32 text-stone-400">
 <p className="text-sm">No recent registrations</p>
 </div>
 )}
 </div>
 </BCard>

 {/* Platform Growth Chart */}
 <BCard className="md:col-span-6 h-[300px]">
 <div className="flex flex-col h-full">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-stone-900">Platform Growth</h3>
 </div>
 {platformGrowth && platformGrowth.labels?.length > 0 ? (
 <div style={{ minHeight: '200px', height: '200px', width: '100%' }}>
 <ResponsiveContainer width="100%" height="100%">
 <LineChart
 data={platformGrowth.labels?.map((label: string, index: number) => ({
 month: label,
 users: platformGrowth.datasets?.[0]?.data?.[index] || 0,
 revenue: platformGrowth.datasets?.[1]?.data?.[index] || 0,
 bookings: platformGrowth.datasets?.[2]?.data?.[index] || 0,
 }))}
 margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
 >
 <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
 <XAxis
 dataKey="month"
 tick={{ fontSize: 11, fill: '#64748b' }}
 tickLine={false}
 />
 <YAxis
 tick={{ fontSize: 11, fill: '#64748b' }}
 tickLine={false}
 axisLine={false}
 />
 <Tooltip
 contentStyle={{
 backgroundColor: '#0F172A',
 border: 'none',
 borderRadius: '8px',
 fontSize: '12px',
 fontWeight: 'bold'
 }}
 labelStyle={{ color: '#94a3b8' }}
 />
 <Legend
 wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
 iconType="circle"
 />
 <Line
 type="monotone"
 dataKey="users"
 stroke="#14b8a6"
 strokeWidth={2}
 name="New Users"
 dot={{ fill: '#14b8a6', r: 3 }}
 />
 <Line
 type="monotone"
 dataKey="bookings"
 stroke="#8b5cf6"
 strokeWidth={2}
 name="Bookings"
 dot={{ fill: '#8b5cf6', r: 3 }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 ) : (
 <div className="flex-1 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100 border-dashed">
 <div className="text-center">
 <Activity className="size-8 text-stone-300 mx-auto mb-2" />
 <span className="text-sm font-bold text-stone-400">Loading chart data…</span>
 </div>
 </div>
 )}
 </div>
 </BCard>

 </div>
 </div>
 </div>
 );
}
