
import { useState, useCallback , useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Mail, Smartphone, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { deleteAccount } from '@/lib/api/user';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';
import { STORAGE_KEYS } from '@/lib/storage-keys';




const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
 exit: { opacity: 0, y: -10 }
};

export default function DeleteAccountPage() {
 const [identifierMethod, setIdentifierMethod] = useState<'email' | 'phone'>('email');
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');
 const [reason, setReason] = useState('');
 const [loading, setLoading] = useState(false);
 const [submitted, setSubmitted] = useState(false);

 const navigate = useNavigate();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 await deleteAccount();
 setSubmitted(true);
 toast.success('Account deleted successfully.');
 localStorage.removeItem(STORAGE_KEYS.token);
 localStorage.removeItem(STORAGE_KEYS.apiToken);
 localStorage.removeItem(STORAGE_KEYS.user);
 setTimeout(() => navigate('/'), 2000);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to delete account. Please try again later.');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to delete account. Please try again later.');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleSetEmailMethod = useCallback(() => {
 setIdentifierMethod('email');
 }, []);

 const handleSetPhoneMethod = useCallback(() => {
 setIdentifierMethod('phone');
 }, []);

 if (submitted) {
 return (
 <div className="min-h-screen relative flex items-center justify-center bg-[#FDFBF7] overflow-hidden p-4">
 <div className="relative z-10 w-full max-w-md bg-white p-8 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-stone-100 text-center">
 <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
 <CheckCircle2 className="size-10" />
 </div>
 <h2 className="text-2xl font-semibold text-stone-900 mb-4">Request Received</h2>
 <p className="text-stone-500 mb-8 leading-relaxed">
 Your account deletion request has been successfully received. Our team will review your request and process it within 3-5 business days. We will contact you at the provided {identifierMethod === 'email' ? 'email' : 'phone number'} if we need any further information.
 </p>
 <Link to="/" className="inline-flex items-center justify-center gap-2 w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all">
 Return to Home Page
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen relative flex items-center justify-center bg-[#FDFBF7] overflow-hidden">
 {/* Animated Warm Background Elements */}
 <div className="absolute inset-0 pointer-events-none">
 <m.div
 animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
 className="absolute -top-[20%] -right-[10%] size-[800px] rounded-full bg-gradient-to-br from-red-500/5 to-transparent blur-[120px]"
 />
 <m.div
 animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
 className="absolute -bottom-[10%] -left-[10%] size-[600px] rounded-full bg-gradient-to-tr from-amber-100/40 to-transparent blur-[100px]"
 />
 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#991b1b 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
 </div>

 <div className="relative z-10 size-full max-w-7xl flex flex-col items-center justify-center p-4">
 <div className="mb-8">
 <Logo size="xl" />
 </div>

 <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl p-8 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white">
 <div className="text-center mb-8">
 <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
 <AlertTriangle className="size-8" />
 </div>
 <h1 className="text-2xl font-semibold text-stone-900 mb-2">Delete Your Account</h1>
 <p className="text-stone-500 text-sm leading-relaxed">
 Submitting this form will initiate the process to permanently delete your account and all associated data. This action cannot be undone.
 </p>
 </div>

 <div className="flex p-1 bg-stone-100/80 rounded-2xl mb-8 relative">
 <m.div
 className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm border border-black/5"
 initial={false}
 animate={{
 x: identifierMethod === 'email' ? 0 : '100%',
 width: '50%'
 }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 />
 <button
 onClick={handleSetEmailMethod}
 className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${identifierMethod === 'email' ? 'text-stone-900' : 'text-stone-400'}`}
 >
 <Mail className="size-4" />
 Email
 </button>
 <button
 onClick={handleSetPhoneMethod}
 className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${identifierMethod === 'phone' ? 'text-stone-900' : 'text-stone-400'}`}
 >
 <Smartphone className="size-4" />
 Phone Number
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 <AnimatePresence mode="wait">
 {identifierMethod === 'email' ? (
 <m.div key="email-field" {...fadeIn} className="group">
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-red-500 transition-colors" />
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="w-full pl-12 pr-4 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:bg-white focus:border-red-500 focus:ring-0 transition-all outline-none font-medium placeholder:text-stone-400 text-stone-900"
 placeholder="Registered Email Address"
 />
 </div>
 </m.div>
 ) : (
 <m.div key="phone-field" {...fadeIn} className="group">
 <div className="relative">
 <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-red-500 transition-colors" />
 <input
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 required
 className="w-full pl-12 pr-4 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:bg-white focus:border-red-500 focus:ring-0 transition-all outline-none font-medium placeholder:text-stone-400 text-stone-900"
 placeholder="Registered Phone Number"
 />
 </div>
 </m.div>
 )}
 </AnimatePresence>

 <div className="group">
 <textarea
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:bg-white focus:border-red-500 focus:ring-0 transition-all outline-none font-medium placeholder:text-stone-400 text-stone-900 resize-none"
 placeholder="Please let us know why you are leaving (Optional)"
 ></textarea>
 </div>

 <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
 <ul className="text-xs text-red-800 space-y-1 ml-4 list-disc">
 <li>All your personal data will be completely deleted.</li>
 <li>You will lose all your history and records.</li>
 <li>Any active subscriptions will be cancelled.</li>
 </ul>
 </div>

 <m.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 type="submit"
 disabled={loading}
 className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-red-600/20 hover:shadow-red-600/40 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
 >
 {loading ? 'Submitting Request...' : 'Request Account Deletion'}
 </m.button>

 <div className="text-center mt-4">
 <Link to="/" className="text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors">
 Cancel and return to Home
 </Link>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}
