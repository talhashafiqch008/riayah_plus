
import { Link } from 'react-router-dom';
;
import { Clock, CheckCircle, Mail, FileText, Shield } from "lucide-react";


export default function VerificationPendingPage() {
 return (
 <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
 <div className="w-full max-w-2xl">
 {/* Logo */}
 <div className="text-center mb-8">
 <Link to="/" className="inline-block">
 <img width={100} height={100} src="/logo.png" alt="Raiyah Plus" className="h-16 w-auto mx-auto mb-4" />
 </Link>
 </div>

 {/* Main Card */}
 <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-stone-100">
 {/* Icon */}
 <div className="size-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <Clock className="size-10 text-amber-600" />
 </div>

 {/* Title */}
 <h1 className="text-3xl font-semibold text-stone-900 text-center mb-4">
 Application Under Review
 </h1>

 <p className="text-lg text-stone-600 text-center mb-8">
 Thank you for applying to join the Raiyah Plus provider network!
 </p>

 {/* Status Steps */}
 <div className="space-y-4 mb-8">
 <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
 <div className="size-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
 <CheckCircle className="size-5 text-white" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Application Submitted</h3>
 <p className="text-sm text-stone-600">Your application has been received</p>
 </div>
 </div>

 <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
 <div className="size-8 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
 <Shield className="size-5 text-white" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Verification In Progress</h3>
 <p className="text-sm text-stone-600">
 Our team is reviewing your credentials and conducting background checks
 </p>
 </div>
 </div>

 <div className="flex items-start gap-4 p-4 bg-stone-50 border border-stone-200 rounded-xl opacity-60">
 <div className="size-8 bg-stone-300 rounded-full flex items-center justify-center flex-shrink-0">
 <Mail className="size-5 text-white" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Approval Notification</h3>
 <p className="text-sm text-stone-600">
 You'll receive an email when your account is activated
 </p>
 </div>
 </div>
 </div>

 {/* Timeline */}
 <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
 <div className="flex items-start gap-3">
 <FileText className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div>
 <h3 className="font-semibold text-stone-900 mb-2">What happens next?</h3>
 <ul className="space-y-2 text-sm text-stone-700">
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>License verification (1-2 business days)</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Background check processing (2-3 business days)</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Profile review by clinical governance team</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Email notification upon approval</span>
 </li>
 </ul>
 </div>
 </div>
 </div>

 {/* Expected Timeline */}
 <div className="text-center">
 <p className="text-sm text-stone-600 mb-4">
 <strong className="text-stone-900">Expected timeline:</strong> 3-5 business days
 </p>
 <p className="text-xs text-stone-500">
 We'll email you at the address you provided if we need any additional information
 </p>
 </div>
 </div>

 {/* Actions */}
 <div className="mt-6 text-center space-y-3">
 <Link
 to="/"
 className="inline-block text-stone-600 hover:text-stone-900 font-semibold"
 >
 Return to Home
 </Link>
 <p className="text-sm text-stone-500">
 Questions?{" "}
 <a href="mailto:support@raiyahplus.com" className="text-green-600 hover:text-green-700 font-semibold">
 Contact Support
 </a>
 </p>
 </div>
 </div>
 </div>
 );
}
