
import { useState, useEffect , useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayouts } from '@/lib/api';
import {
 DollarSign, Calendar, Search, Filter,
 ArrowUpRight, ArrowDownLeft, Download, MoreHorizontal,
 CheckCircle2, Clock, XCircle, CreditCard, Wallet,
 Building2, ChevronDown, ArrowRight, User
} from "lucide-react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";

interface Payout {
 id: string;
 provider_id?: string;
 provider_name?: string;
 bank_account_name?: string;
 bank_name?: string;
 iban?: string;
 bank_account_number?: string;
 currency?: string;
 amount?: string;
 status?: string;
 requested_at?: string;
}

interface PayoutRowProps {
 payout: Payout;
 index: number;
}

const PayoutRow = ({ payout, index }: PayoutRowProps) => {
 const navigate = useNavigate();
 const getStatusStyle = (status: string) => {
 const s = status?.toLowerCase();
 if (s === 'completed' || s === 'approved' || s === 'succeeded') return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200/50', icon: CheckCircle2 };
 if (s === 'pending') return { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200/50', icon: Clock };
 if (s === 'processing') return { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-200/50', icon: Clock };
 if (s === 'rejected' || s === 'failed') return { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-200/50', icon: XCircle };
 return { bg: 'bg-stone-500/10', text: 'text-stone-700', border: 'border-stone-200/50', icon: Building2 };
 };

 const status = getStatusStyle(payout.status || 'pending');
 const StatusIcon = status.icon;

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
 <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-50 border border-teal-100 flex items-center justify-center text-teal-500 group-hover:from-teal-100 group-hover:to-teal-100 transition-all duration-300 shadow-inner">
 <User size={20} className="stroke-[2.5]" />
 </div>
 </div>

 {/* Main Info */}
 <div className="flex-1 min-w-0 text-center md:text-left">
 <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
 <h4 className="font-semibold text-stone-900 truncate">{payout.bank_account_name || `Provider ${payout.provider_id}`}</h4>
 <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-wider">
 ID #{payout.id}
 </span>
 </div>
 <p className="text-sm text-stone-500 font-medium flex items-center justify-center md:justify-start gap-2">
 <Building2 size={12} />
 <span className="font-mono text-stone-400">{payout.bank_name || 'Bank Transfer'}</span>
 <span className="text-stone-300">•</span>
 <span className="font-mono text-xs">{payout.iban || payout.bank_account_number}</span>
 </p>
 </div>

 {/* Amount */}
 <div className="text-center md:text-right min-w-[120px]">
 <p className="text-lg font-black text-stone-800 tracking-tight">
 {payout.currency} {parseFloat(payout.amount || '0').toLocaleString()}
 </p>
 <p className="text-xs text-stone-400 font-medium flex items-center justify-center md:justify-end gap-1">
 <Clock size={12} />
 {payout.requested_at ? new Date(payout.requested_at).toLocaleDateString() : 'N/A'}
 </p>
 </div>

 {/* Status Badge */}
 <div className="min-w-[120px] flex justify-center md:justify-end">
 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${status.bg} ${status.text} ${status.border} shadow-sm backdrop-blur-sm`}>
 <StatusIcon size={14} className="stroke-[2.5]" />
 <span className="text-xs font-bold capitalize">{payout.status}</span>
 </div>
 </div>

 {/* Action */}
 <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4 md:static md:opacity-100">
 <button
 onClick={() => navigate(`/admin/payouts/${payout.id}`)}
 className="p-2 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
 >
 <ArrowRight size={20} />
 </button>
 </div>
 </div>
 </m.div>
 );
};

export default function AdminPayoutsPage() {
 const navigate = useNavigate();
 const [payouts, setPayouts] = useState<Payout[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState("all");
 const [searchQuery, setSearchQuery] = useState("");

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const response = await getPayouts();
 // Handle { success: true, data: [...] } structure or direct array
 const data = Array.isArray(response) ? response : (response?.data || []);
 setPayouts(Array.isArray(data) ? data : []);
 } catch (error) {
 console.error('Failed to load payouts:', error);
 } finally {
 setLoading(false);
 }
 };

 // Filters logic
 const filteredPayouts = payouts.filter(payout => {
 const matchesFilter = filter === 'all' || payout.status?.toLowerCase() === filter;
 const searchLower = searchQuery.toLowerCase();
 const matchesSearch =
 payout.provider_name?.toLowerCase().includes(searchLower) ||
 String(payout.provider_id)?.includes(searchLower) ||
 String(payout.id)?.includes(searchLower);
 return matchesFilter && matchesSearch;
 });

 const totalPayouts = payouts.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);
 const pendingPayouts = payouts
 .filter(p => p.status === 'pending')
 .reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="size-12 border-4 border-stone-200 border-t-indigo-500 rounded-full animate-spin"></div>
 <p className="text-stone-400 font-bold animate-pulse">Loading Payout Requests…</p>
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
 Payout Requests
 </h1>
 <p className="text-stone-500 font-medium max-w-lg">
 Manage withdrawal requests from providers and settle payments.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm">
 <Filter size={18} />
 <span>Filter</span>
 </button>
 <button className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20 active:scale-95">
 <Download size={18} />
 <span>Export CSV</span>
 </button>
 </div>
 </div>

 {/* Quick Stats */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* Card 1 */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden group"
 >
 <div className="absolute top-0 right-0 size-32 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-100 transition-colors" />
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Pending Requests</p>
 <h3 className="text-3xl font-semibold text-stone-900 tracking-tight">
 SAR {pendingPayouts.toLocaleString()}
 </h3>
 <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit">
 <Clock size={12} />
 Needs Action
 </div>
 </m.div>

 {/* Card 2 */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden group"
 >
 <div className="absolute top-0 right-0 size-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors" />
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Total Disbursed</p>
 <h3 className="text-3xl font-semibold text-stone-900 tracking-tight">
 SAR {(totalPayouts - pendingPayouts).toLocaleString()}
 </h3>
 <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
 <CheckCircle2 size={12} />
 Completed
 </div>
 </m.div>
 </div>

 {/* Content Section */}
 <div className="space-y-6">

 {/* Search & Filter Bar */}
 <div className="bg-white p-2 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between gap-2">
 <div className="flex p-1 bg-stone-50/50 rounded-xl">
 {['all', 'pending', 'completed', 'rejected'].map((status) => (
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
 placeholder="Search provider..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="size-full md:w-80 pl-11 pr-4 py-3 bg-stone-50/50 border-none rounded-xl text-sm font-semibold text-stone-700 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all outline-none placeholder:text-stone-400"
 />
 </div>
 </div>

 {/* Requests List */}
 <div className="space-y-1">
 <AnimatePresence mode="popLayout">
 {filteredPayouts.length > 0 ? (
 filteredPayouts.map((payout, index) => (
 <PayoutRow
 key={payout.id}
 payout={payout}
 index={index}
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
 <h3 className="text-stone-900 font-semibold text-xl mb-2">No Requests Found</h3>
 <p className="text-stone-500 font-medium">No payout requests matching your filters.</p>
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
