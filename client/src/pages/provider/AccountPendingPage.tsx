
import { m, LazyMotion, domAnimation } from "framer-motion";
import { ShieldAlert, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from 'react-router-dom';




export default function AccountPendingPage() {
 const { logout, user } = useAuth();

 return (
 <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 relative overflow-hidden">
 {/* Background Pattern */}
 <div className="absolute top-0 right-0 size-64 bg-amber-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

 <div className="relative z-10 flex flex-col items-center text-center">
 <m.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1 }}
 className="size-20 bg-amber-100 rounded-full flex items-center justify-center mb-6"
 >
 <Clock className="size-10 text-amber-600" />
 </m.div>

 <h1 className="text-2xl font-semibold text-stone-900 mb-3">
 Account Verification Pending
 </h1>

 <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
 <p className="text-sm text-stone-600 leading-relaxed">
 Hello <span className="font-bold">{user?.firstName}</span>, your provider account is currently under review or inactive. You cannot access the dashboard until an administrator approves your account.
 </p>
 </div>

 <div className="space-y-3 w-full">
 <div className="flex items-center gap-3 text-xs text-stone-500 bg-stone-50 p-3 rounded-lg justify-start text-left">
 <ShieldAlert className="size-8 text-stone-400 shrink-0" />
 <p>
 If you believe this is an error, please contact support or check your email for any required documents.
 </p>
 </div>

 {user?.onboarding_status && user.onboarding_status !== 'completed' && user.onboarding_status !== 'complete' && (
 <Link
 to="/provider/onboarding"
 className="w-full py-3 mt-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
 >
 Complete Onboarding
 </Link>
 )}

 <button
 onClick={() => logout()}
 className="w-full py-3 mt-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
 >
 <LogOut className="size-4" />
 Sign Out
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
