
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPayoutDetails, processPayout } from '@/lib/api';
import {
 ArrowLeft, DollarSign, Calendar, CreditCard, User,
 CheckCircle2, Clock, XCircle, FileText, AlertCircle,
 Copy, ExternalLink, ShieldCheck, Mail, Phone, Globe,
 Building2, Banknote, StickyNote
} from "lucide-react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { isApiError } from '@/lib/errors';

interface ConfirmationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 loading: boolean;
 action: string;
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, loading, action }: ConfirmationModalProps) => (
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
 />
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
 >
 <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${action === 'approve' ? 'from-emerald-400 to-teal-500' : 'from-rose-400 to-red-500'}`} />

 <div className="mb-6 flex flex-col items-center text-center">
 <div className={`size-16 rounded-full flex items-center justify-center mb-4 ${action === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
 {action === 'approve' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">Confirm {action === 'approve' ? 'Approval' : 'Rejection'}</h3>
 <p className="text-stone-500 font-medium leading-relaxed">
 Are you sure you want to {action} this payout request?
 <br />
 This action cannot be undone.
 </p>
 </div>

 <div className="flex gap-3">
 <button
 onClick={onClose}
 disabled={loading}
 className="flex-1 py-3 px-4 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 disabled={loading}
 className={`flex-1 py-3 px-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'}`}
 >
 {loading ? (
 <>
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Processing…
 </>
 ) : (
 `Confirm ${action === 'approve' ? 'Approve' : 'Reject'}`
 )}
 </button>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>
);

export default function PayoutDetailsPage() {
 const params = useParams();
 const navigate = useNavigate();
 const [payout, setPayout] = useState<any | null>(null);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);
 const [modal, setModal] = useState<{ isOpen: boolean, action: 'approve' | 'reject' | null }>({ isOpen: false, action: null });

 useEffect(() => {
 if (params.id) {
 fetchPayoutDetails(params.id as string);
 }
 }, [params.id]);

 const fetchPayoutDetails = async (id: string) => {
 try {
 const response = await getPayoutDetails(id);
 // Handle { success: true, data: { ... } } structure or direct object
 const data = response?.data || response;
 setPayout(data);
 } catch (error) {
 console.error("Failed to fetch payout details:", error);
 } finally {
 setLoading(false);
 }
 };

 const handleAction = async () => {
 if (!modal.action) return;

 setActionLoading(true);
 try {
 await processPayout(payout.id, modal.action);
 setPayout((prev: any) => ({...prev, status: modal.action === 'approve' ? 'completed' : 'rejected' })); // Optimistic update
 setModal({ isOpen: false, action: null });
 } catch (error) {
 console.error("Failed to process payout:", error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to process request');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to process request');
 }
 } finally {
 setActionLoading(false);
 }
 };

 const getStatusStyle = (status: string) => {
 const s = status?.toLowerCase();
 if (s === 'completed' || s === 'approved') return { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle2 };
 if (s === 'pending') return { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-100', icon: Clock };
 if (s === 'rejected' || s === 'failed') return { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-100', icon: XCircle };
 return { bg: 'bg-stone-50 text-stone-700', text: 'text-stone-700', border: 'border-stone-100', icon: AlertCircle };
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="size-12 border-4 border-stone-200 border-t-indigo-500 rounded-full animate-spin"></div>
 <p className="text-stone-400 font-bold animate-pulse">Loading Payout Details…</p>
 </div>
 </div>
 );
 }

 if (!payout) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center">
 <div className="size-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-400">
 <AlertCircle size={32} />
 </div>
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Payout Request Not Found</h2>
 <button
 onClick={() => navigate(-1)}
 className="text-teal-600 font-bold hover:underline"
 >
 Go Back
 </button>
 </div>
 );
 }

 const { bg, text, border, icon: StatusIcon } = getStatusStyle(payout.status);

 return (
 <div className="max-w-5xl mx-auto pb-20">
 {/* Header */}
 <div className="mb-8">
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-6 text-sm font-bold"
 >
 <ArrowLeft size={16} />
 Back to Payouts
 </button>

 <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
 Payout Request #{payout.id}
 </h1>
 <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${bg} ${text} ${border}`}>
 <StatusIcon size={14} />
 <span className="capitalize">{payout.status}</span>
 </span>
 </div>
 <div className="flex items-center gap-2 text-stone-500 font-mono text-sm">
 <span>Requested: {new Date(payout.requested_at).toLocaleString()}</span>
 </div>
 </div>

 <div className="flex flex-col gap-3 items-end">
 <div className="bg-stone-900 text-white px-8 py-4 rounded-2xl shadow-xl shadow-stone-900/10">
 <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Total Amount</p>
 <p className="text-3xl font-black flex items-center gap-1">
 {payout.currency} {parseFloat(payout.amount).toLocaleString()}
 </p>
 </div>

 {payout.status === 'pending' && (
 <div className="flex items-center gap-2 mt-2">
 <button
 onClick={() => setModal({ isOpen: true, action: 'reject' })}
 className="px-4 py-2 bg-white text-rose-600 border border-stone-200 hover:border-rose-200 hover:bg-rose-50 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
 >
 <XCircle size={16} />
 Reject
 </button>
 <button
 onClick={() => setModal({ isOpen: true, action: 'approve' })}
 className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
 >
 <CheckCircle2 size={16} />
 Approve Payout
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Info */}
 <div className="lg:col-span-2 space-y-6">

 {/* Bank Details */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
 >
 <h2 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Banknote className="text-teal-500" size={20} />
 Banking Information
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Bank Name</p>
 <p className="font-bold text-stone-900">{payout.bank_name || '-'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Account Holder</p>
 <p className="font-bold text-stone-900">{payout.bank_account_name || '-'}</p>
 </div>
 <div className="space-y-1 md:col-span-2">
 <p className="text-xs font-bold text-teal-700 uppercase">IBAN / Account Number</p>
 <div className="flex items-center gap-2">
 <p className="font-mono font-bold text-stone-900 text-lg tracking-wide">{payout.iban || payout.bank_account_number || '-'}</p>
 <button
 onClick={() => navigator.clipboard.writeText(payout.iban || payout.bank_account_number)}
 className="p-1.5 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
 title="Copy IBAN"
 >
 <Copy size={14} />
 </button>
 </div>
 </div>
 </div>
 </m.div>

 {/* Notes */}
 {payout.notes && (
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
 >
 <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <StickyNote className="text-amber-500" size={20} />
 Request Notes
 </h2>
 <p className="text-amber-900 font-medium leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
 {payout.notes}
 </p>
 </m.div>
 )}
 </div>

 {/* Sidebar - Provider Info */}
 <div className="space-y-6">
 <m.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.2 }}
 className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
 >
 <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Provider Information</h2>

 <div className="flex items-center gap-4 mb-6">
 <div className="size-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-black text-lg border border-teal-100 uppercase">
 {(payout.bank_account_name || 'P')[0]}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900 line-clamp-1" title={payout.bank_account_name}>
 {payout.bank_account_name || `Provider #${payout.provider_id}`}
 </h3>
 <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
 ID: {payout.provider_id}
 </span>
 </div>
 </div>

 <div className="space-y-3">
 {payout.provider_email && (
 <div className="flex items-center gap-3 text-sm text-stone-600 font-medium">
 <Mail size={16} className="text-stone-400" />
 <a href={`mailto:${payout.provider_email}`} className="hover:text-teal-600 transition-colors truncate">
 {payout.provider_email}
 </a>
 </div>
 )}
 {payout.provider?.phone && (
 <div className="flex items-center gap-3 text-sm text-stone-600 font-medium">
 <Phone size={16} className="text-stone-400" />
 <span>{payout.provider.phone}</span>
 </div>
 )}
 <div className="flex items-center gap-3 text-sm text-stone-600 font-medium">
 <Building2 size={16} className="text-stone-400" />
 <span className="capitalize">{payout.provider?.provider_type || 'Individual'} Provider</span>
 </div>
 </div>

 <button
 onClick={() => navigate(`/admin/providers/${payout.provider_id}`)}
 className="w-full mt-6 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
 >
 <User size={14} />
 View Provider Profile
 </button>
 </m.div>
 </div>
 </div>

 <ConfirmationModal
 isOpen={modal.isOpen}
 onClose={() => setModal(prev => ({...prev, isOpen: false }))}
 onConfirm={handleAction}
 loading={actionLoading}
 action={modal.action ?? ''}
 />
 </div>
 );
}
