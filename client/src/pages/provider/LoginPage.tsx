
import { Suspense, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth, isProviderRole } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { isApiError } from '@/lib/errors';




function ProviderLoginForm() {
  const navigate = useNavigate();
  const { login, logout, user } = useAuth();

  useEffect(() => {
    if (user && isProviderRole(user.role ?? '')) {
      const onboardingStatus = user.onboarding_status;
      if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
        navigate('/provider/onboarding');
      } else {
        navigate('/provider/dashboard');
      }
    }
  }, [user, navigate]);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});
 // TODO: Add isPending loading state
 const [isLoading, setIsLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 const newErrors: Record<string, string> = {};
 if (!email.trim()) {
 newErrors.email = 'Email is required';
 } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
 newErrors.email = 'Please enter a valid email address';
 }
 if (!password.trim()) {
 newErrors.password = 'Password is required';
 }

 if (Object.keys(newErrors).length > 0) {
 setErrors(newErrors);
 return;
 }

 setErrors({});
 setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);

      if (!isProviderRole(loggedInUser.role ?? '')) {
        await logout();
        toast.error('This portal is for provider accounts only (doctor, nurse, therapist, etc.).');
        return;
      }

      toast.success("Welcome back!");

      const onboardingStatus = loggedInUser.onboarding_status;

      if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
        navigate('/provider/onboarding');
      } else {
        navigate('/provider/dashboard');
      }
 } catch (error: unknown) {
 console.error("Login failed:", error);
 if (isApiError(error)) {
 toast.error(error.message || 'Invalid email or password');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Invalid email or password');
 }
 } finally {
 setIsLoading(false);
 }
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
 Provider Portal
 </h1>
 <p className="text-stone-600">
 Sign in to manage your clients and schedule
 </p>
 </div>

 {/* Login Form */}
 <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-100">
 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Email */}
 <div>
 <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-2">
 Email Address
 </label>
 <input
 id="email"
 type="email"
 value={email}
 onChange={(e) => {
 setEmail(e.target.value);
 if (errors.email) {
 setErrors(prev => ({ ...prev, email: '' }));
 }
 }}
 className={`w-full px-4 py-3 border rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${ errors.email ? 'border-red-500 focus:ring-red-500' : 'border-stone-300' }`}
 placeholder="name@example.com"
 required
 autoComplete="email"
 />
 {errors.email && (
 <p className="mt-1 text-sm text-red-600">{errors.email}</p>
 )}
 </div>

 {/* Password */}
 <div>
 <label htmlFor="password" className="block text-sm font-semibold text-stone-700 mb-2">
 Password
 </label>
 <div className="relative">
 <input
 id="password"
 type={showPassword ? "text" : "password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className={`w-full px-4 py-3 pr-12 border rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${ errors.password ? 'border-red-500 focus:ring-red-500' : 'border-stone-300' }`}
 placeholder="••••••••"
 required
 autoComplete="current-password"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
 tabIndex={-1}
 >
 {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
 </button>
 </div>
 {errors.password && (
 <p className="mt-1 text-sm text-red-600">{errors.password}</p>
 )}
 </div>

 {/* Remember Me & Forgot Password */}
 <div className="flex items-center justify-between text-sm">
 <label className="flex items-center">
 <input
 type="checkbox"
 className="size-4 accent-green-600 border-stone-300 rounded focus:ring-green-500"
 />
 <span className="ml-2 text-stone-600">Remember me</span>
 </label>
 <Link to="/forgot-password" className="text-green-600 hover:text-green-700 font-semibold">
 Forgot password?
 </Link>
 </div>

 {/* Submit Button */}
 {(errors.email || errors.password) && (
 <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
 <p className="text-sm text-red-700 text-center">
 Please fix the errors above to continue.
 </p>
 </div>
 )}

 <button
 type="submit"
 disabled={isLoading}
 className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {isLoading ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 Signing in…
 </>
 ) : (
 "Sign In"
 )}
 </button>
 </form>

 {/* Divider */}
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-stone-200"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-4 bg-white text-stone-500">New provider?</span>
 </div>
 </div>

  <button
  disabled
  className="block w-full text-center bg-stone-100 text-stone-400 font-semibold py-3 px-6 rounded-xl cursor-not-allowed text-sm"
  >
  Join Our Network — Coming Soon
  </button>
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

export default function ProviderLoginPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen flex items-center justify-center">
 <Loader2 className="size-8 animate-spin text-green-600" />
 </div>
 }>
 <ProviderLoginForm />
 </Suspense>
 );
}
