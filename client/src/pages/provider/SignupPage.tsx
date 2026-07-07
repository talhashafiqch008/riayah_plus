
import { Suspense } from "react";
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
;
import { Loader2, CheckCircle, Shield, Award, ArrowRight } from "lucide-react";




function ProviderSignupContent() {
 const navigate = useNavigate();

 const handleStartOnboarding = () => {
 navigate("/provider/onboarding");
 };

 return (
 <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
 <div className="w-full max-w-md">
 {/* Logo */}
 <div className="text-center mb-8">
 <Link to="/" className="inline-block">
 <img src="/logo.png" alt="Raiyah Plus" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
 </Link>
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">
 Join Our Provider Network
 </h1>
 <p className="text-stone-600">
 Connect with families seeking quality care professionals
 </p>
 </div>

 {/* Main Card */}
 <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-100">
 <h2 className="text-xl font-semibold text-stone-900 mb-6">
 Why Join Raiyah Plus?
 </h2>

 <div className="space-y-4 mb-8">
 <div className="flex items-start gap-3">
 <div className="size-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
 <CheckCircle className="size-5 text-green-600" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Verified Clients</h3>
 <p className="text-stone-600 text-sm">Work with pre-screened families who value quality care</p>
 </div>
 </div>

 <div className="flex items-start gap-3">
 <div className="size-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
 <Shield className="size-5 text-green-600" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Secure Platform</h3>
 <p className="text-stone-600 text-sm">PDPL-compliant system with secure payments</p>
 </div>
 </div>

 <div className="flex items-start gap-3">
 <div className="size-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
 <Award className="size-5 text-green-600" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Professional Growth</h3>
 <p className="text-stone-600 text-sm">Access training and career development</p>
 </div>
 </div>
 </div>

  <button
  disabled
  className="w-full bg-stone-300 text-stone-500 font-bold py-4 px-6 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
  >
  Start Application — Coming Soon
  </button>

  <p className="text-xs text-stone-500 text-center mt-4">
  Provider applications will be available soon
  </p>

 {/* Divider */}
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-stone-200"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-4 bg-white text-stone-500">Already have an account?</span>
 </div>
 </div>

 {/* Login Link */}
 <Link
 to="/provider/login"
 className="block w-full text-center bg-stone-100 text-stone-700 font-bold py-4 px-6 rounded-xl hover:bg-stone-200 transition-all"
 >
 Sign In
 </Link>
 </div>

 {/* Requirements */}
 <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-6">
 <h3 className="font-semibold text-stone-900 mb-3 text-sm">Requirements:</h3>
 <ul className="space-y-2 text-xs text-stone-700">
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Valid professional license or certification (where applicable)</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Background check clearance</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Minimum 1 year of relevant experience</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-blue-600 mt-0.5">•</span>
 <span>Professional liability insurance (for clinical roles)</span>
 </li>
 </ul>
 </div>

 {/* Careseeker Link */}
 <div className="text-center mt-6">
 <p className="text-sm text-stone-600">
 Looking for care?{" "}
 <Link to="/careseeker/login" className="text-teal-600 hover:text-teal-700 font-semibold">
 Find Care Now
 </Link>
 </p>
 </div>
 </div>
 </div>
 );
}

export default function ProviderSignupPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen flex items-center justify-center">
 <Loader2 className="size-8 animate-spin text-green-600" />
 </div>
 }>
 <ProviderSignupContent />
 </Suspense>
 );
}
