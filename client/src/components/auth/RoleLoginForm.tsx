
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { isApiError } from '@/lib/errors';
import { SmartButton } from "@/components/design-system/SmartButton";
import { SmartInput } from "@/components/design-system/SmartInput";

interface RoleLoginFormProps {
 role: 'careseeker' | 'provider';
 accentColor: 'teal' | 'green';
 title: string;
 subtitle: string;
 onboardingPath: string;
 dashboardPath: string;
 ctaText: string;
 ctaLink: string;
 crossLinkText: string;
 crossLinkHref: string;
 crossLinkLabel: string;
}

export function RoleLoginForm({
 role,
 accentColor,
 title,
 subtitle,
 onboardingPath,
 dashboardPath,
 ctaText,
 ctaLink,
 crossLinkText,
 crossLinkHref,
 crossLinkLabel
}: RoleLoginFormProps) {
 const navigate = useNavigate();
 const { login } = useAuth();
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [errors, setErrors] = useState<Record<string, string>>({});
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
 
 const onboardingStatus = user.onboarding_status;
 
 if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
    navigate(onboardingPath);
 } else {
    navigate(dashboardPath);
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

 const bgGradient = accentColor === 'teal' 
 ? 'from-teal-50 via-white to-blue-50' 
 : 'from-green-50 via-white to-emerald-50';

 return (
 <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center p-6`}>
 <div className="w-full max-w-md">
 {/* Logo */}
 <div className="text-center mb-8">
 <Link to="/" className="inline-block">
 <img src="/logo.png" alt="Raiyah Plus" width={64} height={64} className="h-16 w-auto mx-auto mb-4" style={{ width: 'auto', height: 'auto' }} loading="eager" />
 </Link>
 <h1 className="text-3xl font-semibold text-stone-900 mb-2 font-[family-name:var(--font-display)]">
 {title}
 </h1>
 <p className="text-stone-600">
 {subtitle}
 </p>
 </div>

 {/* Login Form */}
 <div className="bg-white rounded-[var(--radius-2xl)] shadow-xl p-8 border border-stone-100">
 <form onSubmit={handleSubmit} className="space-y-6">
 <SmartInput
 id="email"
 type="email"
 label="Email Address"
 value={email}
 onChange={(e) => {
 setEmail(e.target.value);
 if (errors.email) {
 setErrors(prev => ({ ...prev, email: '' }));
 }
 }}
 error={errors.email}
 placeholder="name@example.com"
 required
 autoComplete="email"
 />

 <SmartInput
 id="password"
 type="password"
 label="Password"
 value={password}
 onChange={(e) => {
 setPassword(e.target.value);
 if (errors.password) {
 setErrors(prev => ({ ...prev, password: '' }));
 }
 }}
 error={errors.password}
 placeholder="••••••••"
 isPassword
 required
 autoComplete="current-password"
 />

 {/* Remember Me & Forgot Password */}
 <div className="flex items-center justify-between text-sm">
 <label className="flex items-center">
 <input
 type="checkbox"
 className={`size-4 accent-${accentColor}-600 border-stone-300 rounded focus:ring-${accentColor}-500`}
 />
 <span className="ml-2 text-stone-600">Remember me</span>
 </label>
 <Link to="/forgot-password" className={`text-${accentColor}-600 hover:text-${accentColor}-700 font-semibold`}>
 Forgot password?
 </Link>
 </div>

 {/* Submit Button */}
 {(errors.email || errors.password) && (
 <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
 <p className="text-sm text-red-700 text-center">
 Please fix the errors above to continue.
 </p>
 </div>
 )}

 <SmartButton
 type="submit"
 variant="primary"
 size="lg"
 isLoading={isLoading}
 loadingText="Signing in..."
 className="w-full"
 >
 Sign In
 </SmartButton>
 </form>

 {/* Divider */}
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-stone-200"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-4 bg-white text-stone-500">
 {role === 'careseeker' ? 'New to Raiyah Plus?' : 'New provider?'}
 </span>
 </div>
 </div>

 {/* CTA Link */}
 <Link
 to={ctaLink}
 className="block w-full text-center bg-stone-100 text-stone-700 font-semibold py-3 px-6 rounded-[var(--radius-lg)] hover:bg-stone-200 transition-all text-sm"
 >
 {ctaText}
 </Link>
 </div>

 {/* Cross Link */}
 <div className="text-center mt-6">
 <p className="text-sm text-stone-600">
 {crossLinkText}{" "}
 <Link to={crossLinkHref} className="text-teal-600 hover:text-teal-700 font-semibold">
 {crossLinkLabel}
 </Link>
 </p>
 </div>
 </div>
 </div>
 );
}
