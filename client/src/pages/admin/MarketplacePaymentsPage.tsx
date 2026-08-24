
import { useState, useEffect , useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments } from '@/lib/api';
import {
 DollarSign, Calendar, Search, Filter,
 ArrowUpRight, ArrowDownLeft, Download, MoreHorizontal,
 CheckCircle2, Clock, XCircle, CreditCard, Wallet,
 Activity, ChevronDown, ArrowRight, ShieldCheck
} from "lucide-react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import type { ElementType } from "react";

interface Payment {
 id: string;
 payment_id: string;
 booking_id: string;
 amount: string;
 currency: string;
 status: string;
 payment_method: string;
 description?: string;
 created_at: string;
}

interface StatusStyle {
 bg: string;
 text: string;
 border: string;
 icon: ElementType;
}

// --- Components ---

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
 const max = Math.max(...data);
 const min = Math.min(...data);
 const range = max - min || 1;
 const height = 40;
 const width = 100;
 const step = width / (data.length - 1);

 const points = data.map((d, i) => {
 const x = i * step;
 const y = height - ((d - min) / range) * height;
 return `${x},${y}`;
 }).join(' ');

 return (
 <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible opacity-50">
 <polyline
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 points={points}
 className={color}
 />
 </svg>
 );
};

const StatCard = ({ title, value, subtext, icon: Icon, trend, color, accentColor }: {
 title: string;
 value: string | number;
 subtext?: string;
 icon: ElementType;
 trend?: string;
 color: string;
 accentColor: string;
}) => (
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 whileHover={{ y: -5, transition: { duration: 0.2 } }}
 className="relative overflow-hidden bg-white rounded-3xl p-6 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-stone-100 group"
 >
 <div className={`absolute -right-6 -top-6 size-24 rounded-full opacity-10 blur-2xl transition-all group-hover:opacity-20 ${accentColor}`} />

 <div className="relative z-10 flex justify-between items-start mb-4">
 <div>
 <p className="text-stone-500 font-bold text-xs uppercase tracking-wider mb-1">{title}</p>
 <h3 className="text-3xl font-semibold text-stone-800 tracking-tight">{value}</h3>
 </div>
 <div className={`p-3 rounded-2xl ${accentColor} bg-opacity-10 text-opacity-100`}>
 <Icon size={24} className={color} />
 </div>
 </div>

 <div className="flex items-end justify-between">
 <div className="flex items-center gap-1.5">
 {subtext && (
 <span className="text-xs text-stone-400 font-medium">{subtext}</span>
 )}
 </div>
 </div>
 </m.div>
);

const PaymentRow = ({ payment, index, getStatusStyle, getMethodIcon }: {
 payment: Payment;
 index: number;
 getStatusStyle: (status: string) => StatusStyle;
 getMethodIcon: (method: string) => ElementType;
}) => {
 const navigate = useNavigate();
 const status = getStatusStyle(payment.status);
 const StatusIcon = status.icon;
 const MethodIcon = getMethodIcon(payment.payment_method);

 return (
 <m.div
 layout
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ delay: index * 0.05 }}
 className="group relative bg-white hover:bg-stone-50/50 rounded-2xl p-4 border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300 mb-3 last:mb-0"
 >
 <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">

 {/* Icon Box */}
 <div className="flex-shrink-0">
 <div className="size-12 rounded-2xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 group-hover:from-teal-50 group-hover:to-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-600 transition-all duration-300 shadow-inner">
 <DollarSign size={20} className="stroke-[2.5]" />
 </div>
 </div>

 {/* Main Info */}
 <div className="flex-1 min-w-0 text-center md:text-left">
 <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
 <h4 className="font-semibold text-stone-900 truncate">Payment #{payment.payment_id?.substring(0, 12)}...</h4>
 <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
 {payment.payment_method || 'N/A'}
 </span>
 </div>
 <p className="text-sm text-stone-500 font-medium">
 Ref: <span className="font-mono text-stone-400">{payment.description || `Booking #${payment.booking_id}`}</span>
 </p>
 </div>

 {/* Amount */}
 <div className="text-center md:text-right min-w-[120px]">
 <p className="text-lg font-black text-stone-800 tracking-tight">
 {payment.currency || 'SAR'} {Math.abs(parseFloat(payment.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </p>
 <p className="text-xs text-stone-400 font-medium flex items-center justify-center md:justify-end gap-1">
 <Clock size={12} />
 {new Date(payment.created_at).toLocaleDateString()}
 </p>
 </div>

 {/* Status Badge */}
 <div className="min-w-[120px] flex justify-center md:justify-end">
 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${status.bg} ${status.text} ${status.border} shadow-sm backdrop-blur-sm`}>
 <StatusIcon size={14} className="stroke-[2.5]" />
 <span className="text-xs font-bold capitalize">{payment.status.toLowerCase()}</span>
 </div>
 </div>

 {/* Action */}
 <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4 md:static md:opacity-100">
 <button
 onClick={() => navigate(`/admin/payments/${payment.id}`)}
 className="p-2 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
 >
 <ArrowRight size={20} />
 </button>
 </div>
 </div>
 </m.div>
 );
};

export default function AdminPaymentsPage() {
 const navigate = useNavigate();
 const [payments, setPayments] = useState<Payment[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [debouncedSearch, setDebouncedSearch] = useState("");

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
 return () => clearTimeout(timer);
 }, [searchQuery]);

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const data = await getPayments();
 setPayments(data as Payment[]);
 } catch (error) {
 console.error('Failed to load payments:', error);
 } finally {
 setLoading(false);
 }
 };

 // Filters logic
 const filteredPayments = payments.filter(payment => {
 const matchesFilter = filter === 'all' || payment.status?.toLowerCase() === filter;
 const searchLower = debouncedSearch.toLowerCase();
 const matchesSearch = !debouncedSearch ||
 payment.payment_id?.toLowerCase().includes(searchLower) ||
 String(payment.booking_id)?.includes(searchLower) ||
 payment.description?.toLowerCase().includes(searchLower);
 return matchesFilter && matchesSearch;
 });

 const totalRevenue = payments
 .filter(p => p.status === 'succeeded' || p.status === 'completed')
 .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

 const pendingAmount = payments
 .filter(p => p.status === 'pending')
 .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

 const getStatusStyle = (status: string) => {
 const s = status?.toLowerCase();
 if (s === 'succeeded' || s === 'completed') return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200/50', icon: CheckCircle2 };
 if (s === 'pending') return { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200/50', icon: Clock };
 if (s === 'refunded') return { bg: 'bg-purple-500/10', text: 'text-purple-700', border: 'border-purple-200/50', icon: XCircle };
 if (s === 'failed' || s === 'cancelled') return { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-200/50', icon: XCircle };
 return { bg: 'bg-stone-500/10', text: 'text-stone-700', border: 'border-stone-200/50', icon: Activity };
 };

 const getMethodIcon = (method: string) => {
 const m = method?.toLowerCase();
 if (m?.includes('card') || m?.includes('stripe')) return CreditCard;
 if (m?.includes('wallet')) return Wallet;
 if (m?.includes('bank')) return ShieldCheck;
 return DollarSign;
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="size-12 border-4 border-stone-200 border-t-teal-500 rounded-full animate-spin"></div>
 <p className="text-stone-400 font-bold animate-pulse">Loading Financials…</p>
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-7xl mx-auto space-y-8 pb-24">

 {/* Page Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-4xl font-semibold text-stone-900 tracking-tight mb-2">
 Financial Overview
 </h1>
 <p className="text-stone-500 font-medium max-w-lg">
 Real-time insights into your revenue streams, transaction history, and pending settlements.
 </p>
 </div>
 <div className="flex items-center gap-3">

 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <StatCard
 title="Total Revenue"
 value={`SAR ${totalRevenue.toLocaleString()}`}
 subtext={`${payments.filter(p => p.status === 'succeeded').length} transactions`}
 trend="up"
 icon={DollarSign}
 accentColor="bg-emerald-500"
 color="text-emerald-500"
 />
 <StatCard
 title="Pending Clearance"
 value={`SAR ${pendingAmount.toLocaleString()}`}
 subtext={`${payments.filter(p => p.status === 'pending').length} pending`}
 trend="neutral"
 icon={Clock}
 accentColor="bg-amber-500"
 color="text-amber-500"
 />
 <StatCard
 title="Total Transactions"
 value={payments.length.toLocaleString()}
 subtext={`${payments.filter(p => ['refunded', 'failed', 'cancelled'].includes(p.status)).length} issues`}
 trend="up"
 icon={ShieldCheck}
 accentColor="bg-indigo-500"
 color="text-indigo-500"
 />
 </div>

 {/* Content Section */}
 <div className="space-y-6">

 {/* Search & Filter Bar */}
 <div className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between gap-2">
 <div className="flex p-1 bg-stone-50/50 rounded-xl">
 {['all', 'succeeded', 'pending', 'refunded', 'failed'].map((status) => (
 <button
 key={status}
 onClick={() => setFilter(status)}
 className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${filter === status ? 'bg-white text-stone-800 shadow-sm ring-1 ring-black/5' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100/50' }`}
 >
 {status}
 </button>
 ))}
 </div>

 <div className="relative group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-teal-500 transition-colors" size={20} />
 <input
 type="text"
 placeholder="Search by ID or Reference..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="size-full md:w-80 pl-11 pr-4 py-3 bg-stone-50/50 border-none rounded-xl text-sm font-semibold text-stone-700 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all outline-none placeholder:text-stone-400"
 />
 </div>
 </div>

 {/* Transactions List */}
 <div className="space-y-1">
 <AnimatePresence mode="popLayout">
 {filteredPayments.length > 0 ? (
 filteredPayments.map((payment, index) => (
 <PaymentRow
 key={payment.id}
 payment={payment}
 index={index}
 getStatusStyle={getStatusStyle}
 getMethodIcon={getMethodIcon}
 />
 ))
 ) : (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-stone-200"
 >
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
 <Search size={32} className="text-stone-300" />
 </div>
 <h3 className="text-stone-900 font-semibold text-xl mb-2">No Transactions Found</h3>
 <p className="text-stone-500 font-medium">We couldn't find any payments matching your search.</p>
 <button
 onClick={() => { setFilter('all'); setSearchQuery(''); }}
 className="mt-6 text-teal-600 font-bold hover:underline"
 >
 Clear Filters
 </button>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 </div>
 );
}
