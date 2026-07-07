
import { useState, useEffect } from 'react';
import {
 Wallet,
 TrendingUp,
 Clock,
 CheckCircle,
 XCircle,
 AlertCircle,
 Plus,
 X,
 CreditCard,
 Building2,
 Loader2,
 Landmark,
 Banknote,
 ArrowUpRight
} from 'lucide-react';
import { cancelPayoutRequest, createPayoutRequest, getPayoutBalance, getProviderPayouts } from '@/lib/api';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { PaymentError } from '@/lib/errors/domain';
import { ErrorFallback } from '@/components/errors/ErrorFallback';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { SecurityBanner } from '@/components/healthcare/SecurityBanner';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { formatCurrencyInput } from '@/lib/validation';
import { m, AnimatePresence } from "framer-motion";
import { BCard } from '@/components/BCard';


// --- Types ---
interface PayoutBalance {
  availableBalance: number;
  currency: string;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}

interface Payout {
  id: string | number;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  adminNotes?: string;
}

function StatusBadge({ status }: { status: string }) {
 const styles = {
 pending: 'bg-amber-100/50 text-amber-700 border-amber-200',
 processing: 'bg-blue-100/50 text-blue-700 border-blue-200',
 completed: 'bg-emerald-100/50 text-emerald-700 border-emerald-200',
 rejected: 'bg-red-100/50 text-red-700 border-red-200',
 };

 const icons = {
 pending: Clock,
 processing: Loader2,
 completed: CheckCircle,
 rejected: XCircle,
 };

 const Icon = icons[status as keyof typeof icons] || AlertCircle;

 return (
 <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${styles[status as keyof typeof styles] || 'bg-stone-50 text-stone-700 border-stone-200'}`}>
 <Icon className={`size-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
 {status}
 </span>
 );
}

// --- Main Page ---
export default function PayoutsPage() {
 const [loading, setLoading] = useState(true);
 const [balance, setBalance] = useState<PayoutBalance | null>(null);
 const [payouts, setPayouts] = useState<Payout[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);

  // Form state
  const [formData, setFormData] = useState({
  amount: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_name: '',
  iban: '',
  notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string): string | null => {
  switch (field) {
  case 'amount': {
  if (!value || parseFloat(value) <= 0) return 'Please enter a valid amount';
  if (balance && parseFloat(value) > balance.availableBalance) {
  return `Insufficient balance. Available: ${balance.currency} ${balance.availableBalance}`;
  }
  return null;
  }
  case 'bank_name':
  return !value.trim() ? 'Bank name is required' : null;
  case 'bank_account_name':
  return !value.trim() ? 'Account holder name is required' : null;
  case 'bank_account_number':
  return !value.trim() ? 'Account number is required' : null;
  case 'iban':
  return value && !/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/i.test(value.replace(/\s/g, ''))
  ? 'Please enter a valid IBAN'
  : null;
  default:
  return null;
  }
  };

  const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  const fields = ['amount', 'bank_name', 'bank_account_name', 'bank_account_number'];
  fields.forEach(field => {
  const error = validateField(field, formData[field as keyof typeof formData]);
  if (error) errors[field] = error;
  });
  if (formData.iban) {
  const error = validateField('iban', formData.iban);
  if (error) errors.iban = error;
  }
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
  };

  useEffect(() => {
  loadData();
  }, []);

  const loadData = async () => {
  try {
  setLoading(true);
  const [balanceRes, payoutsRes] = await Promise.all([
  getPayoutBalance(),
  getProviderPayouts()
  ]);

  if (balanceRes.success && balanceRes.balance) {
  setBalance(balanceRes.balance);
  }

  if (payoutsRes.success && payoutsRes.payouts) {
  setPayouts(payoutsRes.payouts);
  }
  } catch (error) {
  console.error('Failed to load payout data', error);
  if (isApiError(error)) {
  toast.error(error.message || 'Failed to load payout information');
  } else if (error instanceof Error) {
  toast.error(error.message);
  } else {
  toast.error('Failed to load payout information');
  }
  } finally {
  setLoading(false);
  }
  };

  const submitRequest = async () => {
  try {
  setSubmitting(true);
  setPaymentError(null);
  const response = await createPayoutRequest({
  ...formData,
  amount: parseFloat(formData.amount)
  });

  if (response.success) {
  toast.success('Payout request submitted successfully!');
  setShowRequestModal(false);
  setShowConfirmation(false);
  setFormData({
  amount: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_name: '',
  iban: '',
  notes: ''
  });
  loadData(); // Reload data
  }
  } catch (error: unknown) {
  console.error('Failed to create payout request', error);
  setShowConfirmation(false);
  if (error instanceof PaymentError) {
  setPaymentError(error);
  } else if (isApiError(error)) {
  toast.error(error.message || 'Failed to submit payout request');
  } else if (error instanceof Error) {
  toast.error(error.message);
  } else {
  toast.error('Failed to submit payout request');
  }
  } finally {
  setSubmitting(false);
  }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  setShowConfirmation(true);
  };

  const handleConfirm = async () => {
  await submitRequest();
  };

 const handleCancelRequest = async (id: string | number) => {
 if (!confirm('Are you sure you want to cancel this payout request?')) return;

 try {
  const response = await cancelPayoutRequest(Number(id));
 if (response.success) {
 toast.success('Payout request cancelled');
 loadData();
 }
 } catch (error: unknown) {
 console.error('Failed to cancel payout', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to cancel request');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to cancel request');
 }
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="size-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 const currency = balance?.currency || 'USD';

 return (
 <div className="max-w-7xl mx-auto space-y-8 pb-20">
 {/* Header with improved styling */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-4xl font-semibold text-stone-900 tracking-tight">Payout Requests</h1>
  <p className="text-stone-500 mt-2 text-lg max-w-2xl">Manage your earnings withdrawals securely. Track status and view history.</p>
  <SecurityBanner variant="compact" className="mt-4" />
  </div>
  <button
 onClick={() => setShowRequestModal(true)}
 className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-teal-600/20 active:scale-95"
 >
 <Plus className="size-5" />
 Request Payout
 </button>
 </div>

 {/* Balance Overview Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {/* Hero Card */}
 <div className="md:col-span-2 bg-gradient-to-br from-stone-900 to-stone-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 size-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-teal-500/20 transition-all duration-700" />
 <div className="absolute bottom-0 left-0 size-48 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700" />

 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-6">
 <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
 <Wallet className="size-6 text-teal-400" />
 </div>
 <p className="text-sm font-medium text-stone-300 uppercase tracking-widest">Available for Withdrawal</p>
 </div>
 <h2 className="text-5xl font-semibold tracking-tight mb-2"><CurrencyDisplay amount={balance?.availableBalance || 0} currency={currency} unit="major" /></h2>
 <p className="text-stone-400 text-sm">Update your bank details to withdraw smoothly.</p>
 </div>
 </div>

 <BCard className="hover:border-teal-100 transition-colors">
 <div className="flex justify-between items-start mb-4">
 <div className="p-3 bg-blue-50 rounded-2xl">
 <TrendingUp className="size-6 text-blue-600" />
 </div>
 <span className="text-xs font-bold text-stone-400 bg-stone-50 px-2 py-1 rounded-lg">Lifetime</span>
 </div>
 <p className="text-stone-500 font-medium text-sm mb-1">Total Earnings</p>
 <p className="text-2xl font-bold text-stone-900"><CurrencyDisplay amount={balance?.totalEarnings || 0} currency={currency} unit="major" /></p>
 </BCard>

 <div className="flex flex-col gap-6">
 <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
 <div>
 <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Withdrawn</p>
 <p className="text-xl font-bold text-stone-900"><CurrencyDisplay amount={balance?.totalWithdrawn || 0} currency={currency} unit="major" /></p>
 </div>
 <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
 <CheckCircle className="size-5" />
 </div>
 </div>
 <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
 <div>
 <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Pending</p>
 <p className="text-xl font-bold text-stone-900"><CurrencyDisplay amount={balance?.pendingWithdrawals || 0} currency={currency} unit="major" /></p>
 </div>
 <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
 <Clock className="size-5" />
 </div>
 </div>
 </div>
 </div>

 {/* Payout Requests List */}
 <BCard title="Payout History" className="overflow-hidden">
 {payouts.length === 0 ? (
 <div className="text-center py-24 bg-stone-50/50 rounded-3xl border-2 border-dashed border-stone-200">
 <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
 <Banknote className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No payout requests yet</h3>
 <p className="text-stone-500 mb-8 max-w-sm mx-auto">Once you have earnings available, you can request a payout to your bank account.</p>
 <button
 onClick={() => setShowRequestModal(true)}
 className="px-6 py-3 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"
 >
 Request First Payout
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 {payouts.map((payout) => (
 <m.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 key={payout.id}
 className="group bg-white rounded-2xl border border-stone-100 p-5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5 transition-all duration-300 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 size-32 bg-gradient-to-br from-stone-50 to-stone-100 rounded-bl-full -mr-10 -mt-10 -z-0 group-hover:from-teal-50 group-hover:to-emerald-50 transition-colors" />

 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-5">
 <div className={`size-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 ${payout.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : payout.status === 'rejected' ? 'bg-red-100 text-red-600' : payout.status === 'processing' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600' }`}>
 {payout.status === 'completed' ? <CheckCircle className="size-7" /> :
 payout.status === 'rejected' ? <XCircle className="size-7" /> :
 payout.status === 'processing' ? <Loader2 className="size-7 animate-spin" /> :
 <ArrowUpRight className="size-7" />}
 </div>

 <div>
 <div className="flex items-center gap-3 mb-1">
 <h4 className="font-semibold text-stone-900 text-xl tracking-tight"><CurrencyDisplay amount={payout.amount} currency={currency} unit="major" /></h4>
 <StatusBadge status={payout.status} />
 </div>
 <div className="flex items-center gap-4 text-sm text-stone-500 font-medium">
 <span className="flex items-center gap-1.5">
 <Clock className="size-3.5" />
 {new Date(payout.requestedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
 </span>
 {payout.processedAt && (
 <span className="flex items-center gap-1.5 text-emerald-600">
 <CheckCircle className="size-3.5" />
 Processed {new Date(payout.processedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-4 pl-16 md:pl-0">
 {(payout.notes || payout.adminNotes) && (
 <div className="text-sm bg-stone-50 px-4 py-2 rounded-xl border border-stone-100 max-w-xs">
 {payout.notes && <p className="text-stone-600 italic">"{payout.notes}"</p>}
 {payout.adminNotes && <p className="text-blue-600 font-medium mt-1 text-xs">Admin: {payout.adminNotes}</p>}
 </div>
 )}

 {payout.status === 'pending' && (
 <button
 onClick={() => handleCancelRequest(payout.id)}
 className="px-4 py-2 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
 >
 Cancel
 </button>
 )}
 </div>
 </div>
 </m.div>
 ))}
 </div>
 )}
 </BCard>

 {/* Request Modal */}
 <AnimatePresence>
 {showRequestModal && (
 <>
 <m.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-50 transition-all duration-300"
 onClick={() => setShowRequestModal(false)}
 />
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
 className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl pointer-events-auto flex flex-col relative"
 >
 {/* Decorative Header Background */}
 <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-teal-50 to-emerald-50 z-0" />

 <div className="relative z-10 px-8 pt-8 pb-4 flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Request Payout</h2>
 <p className="text-stone-500 text-sm font-medium mt-1">Withdraw funds to your bank account</p>
 </div>
  <button
  onClick={() => setShowRequestModal(false)}
  aria-label="Close payout request modal"
  className="size-10 bg-white/50 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 transition-all shadow-sm border border-stone-100"
  >
  <X className="size-5" />
  </button>
 </div>

 <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar relative z-10">
 <form onSubmit={handleSubmitRequest} className="space-y-6">

 {/* Balance Card */}
 <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden group">
 <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all duration-700" />
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <p className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
 <p className="text-3xl font-extrabold"><CurrencyDisplay amount={balance?.availableBalance || 0} currency={currency} unit="major" /></p>
 </div>
 <div className="size-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
 <Wallet className="size-6 text-white" />
 </div>
 </div>
 </div>

 {/* Amount Input */}
 <div className="space-y-3">
 <label className="text-sm font-bold text-stone-700 ml-1">Withdrawal Amount</label>
 <div className="relative group">
 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg group-focus-within:text-teal-600 transition-colors">{currency}</div>
  <input
  type="number"
  step="0.01"
  required
  value={formData.amount}
   onChange={(e) => {
   setFormData(prev => ({...prev, amount: formatCurrencyInput(e.target.value) }));
   if (formErrors.amount) setFormErrors(prev => ({...prev, amount: ''}));
   }}
  className={`w-full pl-16 pr-4 py-4 bg-stone-50 border-2 ${formErrors.amount ? 'border-red-300 focus:border-red-500' : 'border-stone-100 focus:border-teal-500'} rounded-2xl text-xl font-bold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all`}
  placeholder="0.00"
  />
  </div>
  {formErrors.amount && <p className="text-sm text-red-600 ml-1">{formErrors.amount}</p>}
  </div>

 {/* Bank Details Section */}
 <div className="space-y-4 pt-2">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Bank Information</p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="md:col-span-2 relative group">
 <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-500 transition-colors" />
  <input
  type="text"
  required
  value={formData.bank_name}
  onChange={(e) => {
  setFormData(prev => ({...prev, bank_name: e.target.value }));
  if (formErrors.bank_name) setFormErrors(prev => ({...prev, bank_name: ''}));
  }}
  className={`w-full pl-12 pr-4 py-3.5 bg-white border ${formErrors.bank_name ? 'border-red-300 focus:border-red-500' : 'border-stone-200 focus:border-teal-500'} rounded-xl font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm`}
  placeholder="Bank Name"
  />
  </div>
  {formErrors.bank_name && <p className="text-sm text-red-600 ml-1">{formErrors.bank_name}</p>}

 <div className="relative group">
 <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-500 transition-colors" />
 <input
 type="text"
 required
 value={formData.bank_account_name}
 onChange={(e) => setFormData(prev => ({...prev, bank_account_name: e.target.value }))}
 className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
 placeholder="Account Holder"
 />
 </div>

 <div className="relative group">
 <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-500 transition-colors" />
 <input
 type="text"
 required
 value={formData.bank_account_number}
 onChange={(e) => setFormData(prev => ({...prev, bank_account_number: e.target.value }))}
 className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
 placeholder="Account Number"
 />
 </div>

 <div className="md:col-span-2 relative group">
 <input
 type="text"
 value={formData.iban}
 onChange={(e) => setFormData(prev => ({...prev, iban: e.target.value }))}
 className="w-full pl-4 pr-4 py-3.5 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
 placeholder="IBAN (Optional)"
 />
 </div>
 </div>
 </div>

 {/* Notes */}
 <div className="space-y-2">
 <label htmlFor="notes--optional" className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
 <textarea id="notes--optional"
 value={formData.notes}
 onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all resize-none shadow-inner"
 rows={2}
 maxLength={500}
 placeholder="Add any additional notes..."
 />
 </div>

 {paymentError && (
 <div className="pt-2">
 <ErrorFallback
 error={paymentError}
 onRetry={submitRequest}
 onDismiss={() => setPaymentError(null)}
 />
 </div>
 )}

 {/* Actions */}
 <div className="pt-2 flex gap-3">
 <button
 type="button"
 onClick={() => setShowRequestModal(false)}
 className="flex-1 px-6 py-4 bg-white border-2 border-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-50 hover:border-stone-200 transition-all"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="flex-[2] px-6 py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {submitting ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 <span>Processing…</span>
 </>
 ) : (
 <>
 <span>Confirm Payout</span>
 <ArrowUpRight className="size-5" />
 </>
 )}
 </button>
 </div>

 </form>
 </div>
 </m.div>
 </div>
 </>
 )}
  </AnimatePresence>

  <ConfirmationDialog
    open={showConfirmation}
    onOpenChange={setShowConfirmation}
    title="Confirm Payout Request"
    description={`You are about to request a payout of ${balance?.currency || 'QAR'} ${formData.amount} to your bank account.`}
    confirmLabel="Confirm Payout"
    cancelLabel="Cancel"
    onConfirm={handleConfirm}
    onCancel={() => setShowConfirmation(false)}
    loading={submitting}
    variant="default"
  />
  </div>
  );
}
