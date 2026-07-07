
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
 DollarSign,
 TrendingUp,
 Calendar,
 Clock,
 Download,
 CreditCard,
 ChevronRight,
 CheckCircle,
 AlertCircle,
 Wallet,
 ArrowUpRight,
 Filter,
 RefreshCw,
 MoreHorizontal,
 Users,
 Briefcase
} from 'lucide-react';
import { getProviderEarnings } from '@/lib/api';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { BCard } from '@/components/BCard';




// --- Shared Components ---


// --- Page Component ---
interface MonthlyBreakdown {
 month: string;
 monthName: string;
 bookings: number;
 hours: number;
 earnings: number;
}

interface Transaction {
 id: string;
 clientName: string;
 date: string;
 serviceType: string;
 hours: number;
 amount: number;
 paymentStatus: string;
}

interface EarningsData {
 earnings: {
 total?: { amount?: number; currency?: string; hours?: number; bookings?: number };
 pending?: { amount?: number; currency?: string; hours?: number; bookings?: number };
 thisWeek?: { amount?: number; currency?: string; hours?: number; bookings?: number };
 thisMonth?: { amount?: number; currency?: string; hours?: number; bookings?: number };
 lastMonth?: { amount?: number; currency?: string; hours?: number; bookings?: number };
 };
 monthlyBreakdown?: MonthlyBreakdown[];
 recentTransactions?: Transaction[];
}

export default function EarningsPage() {
 const [loading, setLoading] = useState(true);
 const [earningsData, setEarningsData] = useState<EarningsData | null>(null);

 useEffect(() => {
 const loadData = async () => {
 try {
 setLoading(true);
 const response = await getProviderEarnings();

 if (response.success && response.earnings) {
 setEarningsData(response);
 } else if (response.earnings) {
 setEarningsData(response);
 }
 } catch (error) {
 console.error('Failed to load earnings data', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load earnings info');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load earnings info');
 }
 } finally {
 setLoading(false);
 }
 };

 loadData();
 }, []);

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="size-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 if (!earningsData || !earningsData.earnings) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="text-center">
 <p className="text-stone-500">No earnings data available</p>
 </div>
 </div>
 );
 }

 const { earnings, monthlyBreakdown = [], recentTransactions = [] } = earningsData;
 const currency = earnings.total?.currency || 'USD';

 return (
 <div className="max-w-7xl mx-auto space-y-6 pb-10">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">Earnings & Payouts</h1>
 <p className="text-stone-500 mt-2 text-lg">Track your revenue streams and payment history.</p>
 </div>

 <div className="flex items-center gap-3">
 <Link to="/provider/payouts">
 <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors shadow-sm">
 <CreditCard className="size-4" />
 Payouts
 </button>
 </Link>

 <button
 onClick={() => {
 const data = {
 earnings: earningsData?.earnings,
 monthlyBreakdown: earningsData?.monthlyBreakdown,
 exportedAt: new Date().toISOString(),
 };
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `earnings-report-${new Date().toISOString().split('T')[0]}.json`;
 a.click();
 URL.revokeObjectURL(url);
 }}
 className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors shadow-sm"
 >
 <Download className="size-4" />
 Export Report
 </button>
 </div>
 </div>

 {/* Top Grid: Main Stats */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Total Earnings Card (Hero) */}
 <div className="lg:col-span-2 bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
 <div className="absolute top-0 right-0 size-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

 <div className="relative z-10 flex flex-col h-full justify-between">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-stone-400 font-medium mb-1">Total Earnings</p>
 <h2 className="text-5xl font-semibold tracking-tight">{currency} {Math.max(0, earnings.total?.amount || 0).toLocaleString()}</h2>
 <p className="text-stone-400 mt-2 text-sm">{earnings.total?.hours || 0} hours • {earnings.total?.bookings || 0} bookings</p>
 </div>
 <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
 <Wallet className="size-8 text-teal-400" />
 </div>
 </div>

 <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
 <div className="flex items-center gap-2 mb-2">
 <Clock className="size-4 text-amber-400" />
 <span className="text-stone-300 font-medium text-sm">Pending</span>
 </div>
 <p className="text-2xl font-bold">{currency} {Math.max(0, earnings.pending?.amount || 0).toLocaleString()}</p>
 <p className="text-stone-400 text-xs mt-1">{earnings.pending?.bookings || 0} bookings</p>
 </div>

 <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="size-4 text-emerald-400" />
 <span className="text-stone-300 font-medium text-sm">This Month</span>
 </div>
 <p className="text-2xl font-bold">{currency} {Math.max(0, earnings.thisMonth?.amount || 0).toLocaleString()}</p>
 <p className="text-stone-400 text-xs mt-1">{earnings.thisMonth?.bookings || 0} bookings</p>
 </div>
 </div>
 </div>
 </div>

 {/* Quick Stats Column */}
 {/* Quick Stats Column */}
 <div className="flex flex-col gap-4">
 <BCard className="flex-1">
 <div className="flex items-center gap-4 mb-4">
 <div className="size-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
 <Calendar className="size-6" />
 </div>
 <div>
 <p className="text-stone-500 font-medium text-sm">This Week</p>
 <h4 className="text-xl font-semibold text-stone-900">{currency} {Math.max(0, earnings.thisWeek?.amount || 0).toLocaleString()}</h4>
 </div>
 </div>
 <p className="text-sm text-stone-500">{earnings.thisWeek?.bookings || 0} bookings completed</p>
 </BCard>

 <BCard className="flex-1">
 <div className="flex items-center gap-4 mb-4">
 <div className="size-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
 <TrendingUp className="size-6" />
 </div>
 <div>
 <p className="text-stone-500 font-medium text-sm">Last Month</p>
 <h4 className="text-xl font-semibold text-stone-900">{currency} {Math.max(0, earnings.lastMonth?.amount || 0).toLocaleString()}</h4>
 </div>
 </div>
 <p className="text-sm text-stone-500">{earnings.lastMonth?.bookings || 0} bookings</p>
 </BCard>
 </div>
 </div>

 {/* Monthly Breakdown Chart */}
 {monthlyBreakdown.length > 0 && (
 <BCard title="Monthly Breakdown">
 <div className="space-y-4">
 {monthlyBreakdown.map((month: MonthlyBreakdown) => {
 const maxEarnings = Math.max(...monthlyBreakdown.map((m: MonthlyBreakdown) => Math.max(0, m.earnings)));
 const percentage = maxEarnings > 0 ? (Math.max(0, month.earnings) / maxEarnings) * 100 : 0;

 return (
 <div key={month.month} className="space-y-2">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-3">
 <span className="text-sm font-bold text-stone-900 min-w-[120px]">{month.monthName}</span>
 <span className="text-xs text-stone-500">{month.bookings} bookings • {month.hours}h</span>
 </div>
 <span className="text-sm font-bold text-stone-900">{currency} {month.earnings.toLocaleString()}</span>
 </div>
 <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
 style={{ width: `${percentage}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </BCard>
 )}

 {/* Recent Transactions */}
 <BCard title="Recent Transactions">
 {recentTransactions.length === 0 ? (
 <div className="text-center py-20 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
 <div className="size-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
 <DollarSign className="size-8" />
 </div>
 <h3 className="text-lg font-semibold text-stone-900">No transactions yet</h3>
 <p className="text-stone-500">Your completed bookings will appear here.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {recentTransactions.map((tx: Transaction) => {
 const isPending = tx.paymentStatus === 'pending' || tx.paymentStatus === 'processing';
 const isSucceeded = tx.paymentStatus === 'succeeded';

 return (
 <div key={tx.id} className="group p-4 rounded-2xl border border-stone-100 hover:border-teal-100 hover:bg-teal-50/30 hover:shadow-md transition-all duration-300 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={`size-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${isSucceeded ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600' }`}>
 {isSucceeded ? <CheckCircle className="size-6" /> : <Clock className="size-6" />}
 </div>
 <div>
 <h4 className="font-semibold text-stone-900">{tx.clientName}</h4>
 <p className="text-sm text-stone-500 font-medium">
 {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
 <span className="mx-2">•</span>
 <span className="capitalize">{tx.serviceType}</span>
 <span className="mx-2">•</span>
 {tx.hours}h
 </p>
 </div>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-right">
 <p className="text-lg font-extrabold text-stone-900">
 {currency} {tx.amount.toLocaleString()}
 </p>
 <p className={`text-xs font-bold uppercase tracking-wider ${isPending ? 'text-amber-500' : 'text-emerald-600' }`}>
 {tx.paymentStatus}
 </p>
 </div>
 <button className="p-2 text-stone-300 hover:text-stone-600 transition-colors">
 <ChevronRight className="size-5" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </BCard>
 </div>
 );
}
