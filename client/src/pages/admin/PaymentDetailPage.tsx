
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getPaymentDetails, markPaymentAsPaid } from '@/lib/api';
import {
 ArrowLeft, DollarSign, Calendar, CreditCard, User,
 CheckCircle2, Clock, XCircle, FileText, AlertCircle,
 Copy, ExternalLink, ShieldCheck, Mail, Phone, Globe
} from "lucide-react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";

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
 paid_at?: string;
 metadata?: Record<string, unknown>;
 failure_reason?: string;
 client_secret?: string;
 stripe_payment_intent_id?: string;
 user_id?: string;
 user?: {
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 role: string;
 country?: string;
 };
}

interface ConfirmationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 loading: boolean;
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, loading }: ConfirmationModalProps) => (
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
 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />

 <div className="mb-6 flex flex-col items-center text-center">
 <div className="size-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
 <CheckCircle2 size={32} />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">Confirm Manual Payment</h3>
 <p className="text-stone-500 font-medium leading-relaxed">
 Are you sure you want to mark this transaction as <span className="text-emerald-600 font-bold">PAID</span>?
 This action overrides the payment gateway status.
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
 className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {loading ? (
 <>
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Processing…
 </>
 ) : (
 'Confirm Payment'
 )}
 </button>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>
);

export default function PaymentDetailsPage() {
 const params = useParams();
 const navigate = useNavigate();
 const [payment, setPayment] = useState<Payment | null>(null);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);
 const [showConfirmModal, setShowConfirmModal] = useState(false);

 useEffect(() => {
 if (params.id) {
 fetchPaymentDetails(params.id as string);
 }
 }, [params.id]);

 const fetchPaymentDetails = async (id: string) => {
 try {
 const data = await getPaymentDetails(id);
 setPayment(data);
 } catch (error) {
 console.error("Failed to fetch payment details:", error);
 } finally {
 setLoading(false);
 }
 };

 const getStatusStyle = (status: string) => {
 const s = status?.toLowerCase();
 if (s === 'succeeded' || s === 'completed') return { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle2 };
 if (s === 'pending') return { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-100', icon: Clock };
 if (s === 'refunded') return { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-100', icon: XCircle };
 return { bg: 'bg-stone-50 text-stone-700', text: 'text-stone-700', border: 'border-stone-100', icon: AlertCircle };
 };

 const handleMarkAsPaid = () => {
 setShowConfirmModal(true);
 };

 const confirmPayment = async () => {
 if (!payment) return;
 setActionLoading(true);
 try {
 await markPaymentAsPaid(payment.payment_id);
 setPayment(prev => prev ? ({ ...prev, status: 'succeeded' }) : null);
 setShowConfirmModal(false);
 } catch (error) {
 console.error("Failed to update status:", error);
 toast.error('Failed to update payment status. Please try again.');
 } finally {
 setActionLoading(false);
 }
 };

 const handleAdminPay = () => {
 if (!payment) return;
 // Redirect to a payment page or open a new window
 window.open(`https://dashboard.stripe.com/payments/${payment.payment_id}`, '_blank');
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="size-12 border-4 border-stone-200 border-t-teal-500 rounded-full animate-spin"></div>
 <p className="text-stone-400 font-bold animate-pulse">Loading Payment Details…</p>
 </div>
 </div>
 );
 }

 if (!payment) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center">
 <div className="size-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 text-stone-400">
 <AlertCircle size={32} />
 </div>
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Payment Not Found</h2>
 <button
 onClick={() => navigate(-1)}
 className="text-teal-600 font-bold hover:underline"
 >
 Go Back
 </button>
 </div>
 );
 }

 const { bg, text, border, icon: StatusIcon } = getStatusStyle(payment.status);

 return (
 <div className="max-w-5xl mx-auto pb-20">
 {/* Header */}
 <div className="mb-8">
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-6 text-sm font-bold"
 >
 <ArrowLeft size={16} />
 Back to Payments
 </button>

 <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
 Payment Details
 </h1>
 <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${bg} ${text} ${border}`}>
 <StatusIcon size={14} />
 {payment.status}
 </span>
 </div>
 <div className="flex items-center gap-2 text-stone-500 font-mono text-sm">
 <span>ID: {payment.payment_id}</span>
 <button
 onClick={() => navigator.clipboard.writeText(payment.payment_id)}
 className="p-1 hover:bg-stone-100 rounded-md transition-colors"
 title="Copy ID"
 >
 <Copy size={12} />
 </button>
 </div>
 </div>

 <div className="flex flex-col gap-3 items-end">
 <div className="bg-stone-900 text-white px-8 py-4 rounded-2xl shadow-xl shadow-stone-900/10">
 <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Total Amount</p>
 <p className="text-3xl font-black flex items-center gap-1">
 {payment.currency || 'SAR'} {(parseFloat(payment.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
 </p>
 </div>

 {payment.status === 'pending' && (
 <div className="flex items-center gap-2 mt-2">
 <button
 onClick={handleAdminPay}
 className="px-4 py-2 bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
 >
 <ExternalLink size={16} />
 Admin Pay
 </button>
 <button
 onClick={handleMarkAsPaid}
 disabled={actionLoading}
 className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {actionLoading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={16} />}
 Mark as Paid
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Info */}
 <div className="lg:col-span-2 space-y-6">

 {/* Transaction Details */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
 >
 <h2 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <CreditCard className="text-teal-500" size={20} />
 Transaction Information
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Description</p>
 <p className="font-bold text-stone-900">{payment.description || '-'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Payment Method</p>
 <p className="font-bold text-stone-900 capitalize flex items-center gap-2">
 <CreditCard size={16} className="text-stone-400" />
 {payment.payment_method}
 </p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Date & Time</p>
 <p className="font-bold text-stone-900">
 {new Date(payment.created_at).toLocaleString()}
 </p>
 </div>
 {payment.paid_at && (
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Paid At</p>
 <p className="font-bold text-stone-900">
 {new Date(payment.paid_at).toLocaleString()}
 </p>
 </div>
 )}
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase">Booking Reference</p>
 <p className="font-bold text-teal-600 hover:underline cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { navigate(`/admin/bookings/${payment.booking_id}`); } }} onClick={() => navigate(`/admin/bookings/${payment.booking_id}`)}>
 Booking #{payment.booking_id}
 </p>
 </div>
 </div>

 {payment.metadata && Object.keys(payment.metadata || {}).length > 0 && (
 <div className="mt-6">
 <h3 className="text-xs font-semibold text-stone-400 uppercase mb-3">Metadata</h3>
 <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 text-sm font-mono text-stone-600">
 <pre className="whitespace-pre-wrap">{JSON.stringify(payment.metadata, null, 2)}</pre>
 </div>
 </div>
 )}

 {payment.failure_reason && (
 <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
 <div className="flex items-center gap-2 mb-1 font-bold">
 <AlertCircle size={16} />
 Failure Reason
 </div>
 {payment.failure_reason}
 </div>
 )}
 </m.div>

 {/* Meta Data */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
 >
 <h2 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <ShieldCheck className="text-teal-500" size={20} />
 Gateway Details
 </h2>

 <div className="space-y-4">
 <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between text-sm">
 <span className="font-medium text-stone-500">Client Secret</span>
 <span className="font-mono text-stone-900 font-bold truncate max-w-[200px]" title={payment.client_secret}>
 {payment.client_secret}
 </span>
 </div>
 {payment.stripe_payment_intent_id && (
 <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between text-sm">
 <span className="font-medium text-stone-500">Stripe Intent ID</span>
 <span className="font-mono text-stone-900 font-bold">
 {payment.stripe_payment_intent_id}
 </span>
 </div>
 )}
 </div>
 </m.div>
 </div>

 {/* Sidebar - Payer Info */}
 <div className="space-y-6">
 <m.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.2 }}
 className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
 >
 <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Payer Information</h2>

 {payment.user ? (
 <>
 <div className="flex items-center gap-4 mb-6">
 <div className="size-12 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center font-black text-lg">
 {payment.user.firstName?.[0] || 'U'}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">
 {payment.user.firstName} {payment.user.lastName}
 </h3>
 <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full capitalize">
 {payment.user.role}
 </span>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex items-center gap-3 text-sm text-stone-600 font-medium">
 <Mail size={16} className="text-stone-400" />
 <a href={`mailto:${payment.user.email}`} className="hover:text-teal-600 transition-colors">
 {payment.user.email}
 </a>
 </div>
 <div className="flex items-center gap-3 text-sm text-stone-600 font-medium">
 <Phone size={16} className="text-stone-400" />
 <a href={`tel:${payment.user.phone}`} className="hover:text-teal-600 transition-colors">
 {payment.user.phone}
 </a>
 </div>
 {payment.user.country && (
 <div className="flex items-center gap-3 text-sm text-stone-600 font-medium">
 <Globe size={16} className="text-stone-400" />
 <span>{payment.user.country}</span>
 </div>
 )}
 </div>

 <button
 onClick={() => navigate(`/admin/users/${payment.user_id}`)}
 className="w-full mt-6 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
 >
 <User size={14} />
 View User Profile
 </button>
 </>
 ) : (
 <div className="text-stone-400 text-sm font-medium italic">
 No user information available
 </div>
 )}
 </m.div>
 </div>
 </div>

 <ConfirmationModal
 isOpen={showConfirmModal}
 onClose={() => setShowConfirmModal(false)}
 onConfirm={confirmPayment}
 loading={actionLoading}
 />
 </div>
 );
}
