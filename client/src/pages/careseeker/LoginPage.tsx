
import { Suspense, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { isApiError } from '@/lib/errors';




function CareseekerLoginForm() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      const onboardingStatus = user.onboarding_status;
      if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
        navigate('/careseeker/onboarding');
      } else {
        navigate('/careseeker');
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
 const user = await login(email, password);
 toast.success("Welcome back!");
 
 // Redirect based on user role and onboarding status
 const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
 const onboardingStatus = user.onboarding_status;
 
 if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
 navigate('/careseeker/onboarding');
 } else {
 navigate('/careseeker');
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
 <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-6">
 <div className="w-full max-w-md">
 {/* Logo */}
 <div className="text-center mb-8">
 <Link to="/" className="inline-block">
 <img src="/logo.png" alt="Raiyah Plus" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
 </Link>
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">
 Welcome to Raiyah Plus
 </h1>
 <p className="text-stone-600">
 Sign in to find and manage your care
 </p>
 </div>

 {/* Login Form */}
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 ring-1 ring-stone-100/50">
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
 className={`w-full px-4 py-3 border rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-transform duration-300 ${ errors.email ? 'border-red-500 focus:ring-red-500' : 'border-stone-300' }`}
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
 className={`w-full px-4 py-3 pr-12 border rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-transform duration-300 ${ errors.password ? 'border-red-500 focus:ring-red-500' : 'border-stone-300' }`}
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
 className="size-4 accent-teal-600 border-stone-300 rounded focus:ring-teal-500"
 />
 <span className="ml-2 text-stone-600">Remember me</span>
 </label>
 <Link to="/forgot-password" className="text-teal-600 hover:text-teal-700 font-semibold">
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
 className="w-full bg-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-teal-700 transition-transform duration-300 shadow-lg shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
 <div className="w-full border-t ring-1 ring-stone-200/50"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-4 bg-white text-stone-500">New to Raiyah Plus?</span>
 </div>
 </div>

  <button
  disabled
  className="block w-full text-center bg-stone-100 text-stone-400 font-semibold py-3 px-6 rounded-xl cursor-not-allowed text-sm"
  >
  Start Assessment — Coming Soon
  </button>

  <p className="text-xs text-stone-500 text-center mt-4">
  Care assessment will be available soon
  </p>
 </div>

  <div className="text-center mt-6">
  <p className="text-sm text-stone-600">
  Are you a healthcare professional?{" "}
  <span className="text-stone-400 font-semibold">
  Join as Provider — Coming Soon
  </span>
  </p>
  </div>
 </div>
 </div>
 );
}

export default function CareseekerLoginPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen flex items-center justify-center">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 }>
 <CareseekerLoginForm />
 </Suspense>
 );
}
