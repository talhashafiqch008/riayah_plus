
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { isApiError } from '@/lib/errors';
import { registerSchema } from '@/lib/validation';
import {
 Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone, Heart,
 Stethoscope, CheckCircle2, ChevronLeft, ShieldCheck
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { FieldError } from '@/components/forms/FieldError';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';




// Animation variants
const fadeIn = {
 initial: { opacity: 0, x: 20 },
 animate: { opacity: 1, x: 0 },
 exit: { opacity: 0, x: -20 },
 transition: { duration: 0.3 }
};

function RegisterContent() {
 const [searchParams] = useSearchParams();
 const roleParam = searchParams.get('role');
 const typeParam = searchParams.get('type');

 const [step, setStep] = useState(1); // 1: Role selection, 2: Details
 const [selectedRole, setSelectedRole] = useState<'family' | 'provider' | 'client' | null>(
 roleParam === 'provider' ? 'provider' :
 roleParam === 'family' ? 'family' :
 typeParam === 'provider' ? 'provider' :
 typeParam === 'seeker' ? 'client' :
 null
 );
 const [formData, setFormData] = useState({
 email: '',
 password: '',
 confirmPassword: '',
 firstName: '',
 lastName: '',
 phone: '',
 });
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);
 const [agreedToTerms, setAgreedToTerms] = useState(false);
 const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
 const { register } = useAuth();
 const navigate = useNavigate();

 // Auto-advance if role or type is in URL
 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 if (roleParam === 'provider' || roleParam === 'family') {
 setSelectedRole(roleParam as 'family' | 'provider');
 setStep(2);
 } else if (typeParam === 'provider') {
 setSelectedRole('provider');
 setStep(2);
 } else if (typeParam === 'seeker') {
 setSelectedRole('client');
 setStep(2);
 }
 }, [roleParam, typeParam]);

 const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 setFormData({
 ...formData,
 [e.target.name]: e.target.value,
 });
 };

 const handleRoleSelect = (role: 'family' | 'provider' | 'client') => {
 setSelectedRole(role);
 setStep(2);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setFieldErrors({});
 setLoading(true);

 const validation = registerSchema.safeParse({
 ...formData,
 terms: agreedToTerms
 });

 if (!validation.success) {
 const firstError = validation.error.issues[0];
 toast.error(firstError?.message || 'Please check your details');
 setLoading(false);
 return;
 }

 try {
 const result = await register({
 email: formData.email,
 password: formData.password,
 firstName: formData.firstName,
 lastName: formData.lastName,
 phone: formData.phone,
 role: (selectedRole || 'client') as string,
 consentAccepted: agreedToTerms === true,
 });

 if (result.requiresEmailVerification) {
 toast.success('Account created! Please verify your email before logging in.');
 navigate(`/verify-email?email=${encodeURIComponent(result.user.email)}`);
 return;
 }

 const registeredUser = result.user;
 toast.success('Account created successfully! Redirecting...');
      const role = typeof registeredUser.role === 'string' ? registeredUser.role.toLowerCase() : '';
      const onboardingStatus = registeredUser.onboarding_status;
      if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
        if (role === 'client' || role === 'family' || role === 'patient') {
          navigate('/careseeker/onboarding');
        } else {
          navigate('/provider/onboarding');
        }
      } else if (role === 'family') {
        navigate('/family');
      } else if (role === 'provider' || role === 'provider_admin') {
        navigate('/provider/dashboard');
      } else {
        navigate('/careseeker');
      }
 } catch (error: unknown) {
 if (isApiError(error) && error.fieldErrors) {
 setFieldErrors(error.fieldErrors);
 toast.error(error.message);
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Registration failed. Please try again.');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen relative flex items-center justify-center bg-[#FDFBF7] overflow-hidden py-10 px-4">
 {/* 1. Animated Warm Background Elements (Same as Login) */}
 <div className="absolute inset-0 pointer-events-none">
 <m.div
 animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
 transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
 className="absolute -top-[10%] -left-[5%] size-[900px] rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-[120px]"
 />
 <m.div
 animate={{ scale: [1, 1.2, 1], x: [0, -30, 0] }}
 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
 className="absolute -bottom-[20%] -right-[10%] size-[700px] rounded-full bg-gradient-to-tr from-amber-100/40 to-transparent blur-[100px]"
 />
 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#115e59 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
 </div>

 {/* Main Content */}
 <div className="relative z-10 size-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">

 {/* Left Side: Dynamic Info base on Step */}
 <m.div
 initial={{ opacity: 0, x: -30 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.6 }}
 className="hidden md:flex flex-col flex-1 max-w-lg"
 >
 <Link to="/" className="mb-8 block w-fit hover:opacity-80 transition-opacity">
 <Logo size="xl" animated={true} />
 </Link>

 <AnimatePresence mode="wait">
 {step === 1 ? (
 <m.div key="step1-text" {...fadeIn}>
 <h1 className="text-5xl font-semibold text-stone-900 mb-6 leading-tight">
 Join the <br />
 <span className="text-teal-600">community.</span>
 </h1>
 <p className="text-lg text-stone-500 mb-8 leading-relaxed">
 Whether you're looking for care tailored to your family's needs or you're a professional ready to help, you're in the right place.
 </p>
 <div className="space-y-4">
 <FeatureItem icon={ShieldCheck} text="Verified Providers & Families" />
 <FeatureItem icon={Heart} text="Compassionate Care Matching" />
 <FeatureItem icon={CheckCircle2} text="Secure Payments & Insurance" />
 </div>
 </m.div>
 ) : (
 <m.div key="step2-text" {...fadeIn} className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-sm">
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">
 {(selectedRole === 'family' || selectedRole === 'client') ? 'Care Seeker Account' : 'Care Provider Account'}
 </h2>
 <p className="text-stone-500 mb-6">You are creating an account as a <span className="font-semibold text-teal-600">{(selectedRole === 'family' || selectedRole === 'client') ? 'Family Member' : 'Health Professional'}</span>.</p>

 <div className="p-4 bg-teal-50 rounded-xl flex items-start gap-3 border border-teal-100">
 <div className="size-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-teal-600">
 <ShieldCheck className="size-4" />
 </div>
 <div>
 <h3 className="font-semibold text-sm text-stone-900">Information Privacy</h3>
 <p className="text-xs text-stone-500 mt-1">Your data is encrypted and protected under HIPAA standards. We value your trust.</p>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </m.div>

 {/* Right Side: Glass Registration Card */}
 <m.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8, delay: 0.1 }}
 className="w-full max-w-[480px] bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white relative"
 >
 {/* Decorative Blob */}
 <div className="absolute -z-10 -bottom-10 -left-10 size-40 bg-amber-100/50 rounded-full blur-3xl"></div>

 <div className="text-center mb-8 relative">
 {step === 2 && (
 <button
 onClick={() => setStep(1)}
 className="absolute left-0 top-1/2 -translate-y-1/2 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
 >
 <ChevronLeft className="size-5" />
 </button>
 )}
 <h2 className="text-2xl font-semibold text-stone-900">
 {step === 1 ? 'Get Started' : 'Create Account'}
 </h2>
                {step === 1 && (
                  <p className="text-stone-500 text-sm mt-1">
                    Select your role to continue — tap <strong>I Need Care</strong> to register
                  </p>
                )}
 </div>

 <AnimatePresence mode="wait">
            {step === 1 ? (
              <m.div key="step1-content" {...fadeIn} className="space-y-4">
                <RoleCard
                  icon={Heart}
                  title="I Need Care"
                  subtitle="Family members & care seekers"
                  active={selectedRole === 'family' || selectedRole === 'client'}
                  onClick={() => handleRoleSelect('family')}
                  color="teal"
                />
                <RoleCard
                  icon={Stethoscope}
                  title="I Provide Care"
                  subtitle="Coming Soon"
                  active={false}
                  disabled={true}
                  color="blue"
                />

                <div className="pt-6 text-center">
                  <p className="text-stone-500 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-teal-600 hover:text-teal-700 font-bold hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </m.div>
            ) : (
 <m.form key="step2-form" {...fadeIn} onSubmit={handleSubmit} className="space-y-4">
 <FormErrorSummary errors={fieldErrors} />
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Input
 icon={User}
 placeholder="First Name"
 name="firstName"
 value={formData.firstName}
 onChange={onValueChange}
 />
 <FieldError error={fieldErrors.firstName} />
 </div>
 <div>
 <Input
 icon={User}
 placeholder="Last Name"
 name="lastName"
 value={formData.lastName}
 onChange={onValueChange}
 iconHidden
 />
 <FieldError error={fieldErrors.lastName} />
 </div>
 </div>
 <div>
 <Input
 icon={Mail}
 placeholder="Email Address"
 type="email"
 name="email"
 value={formData.email}
 onChange={onValueChange}
 />
 <FieldError error={fieldErrors.email} />
 </div>
 <div>
 <Input
 icon={Phone}
 placeholder="Phone Number"
 type="tel"
 name="phone"
 value={formData.phone}
 onChange={onValueChange}
 />
 <FieldError error={fieldErrors.phone} />
 </div>
 <div>
 <PasswordInput
 placeholder="Password"
 name="password"
 value={formData.password}
 onChange={onValueChange}
 />
 <FieldError error={fieldErrors.password} />
 </div>
 <PasswordInput
 placeholder="Confirm Password"
 name="confirmPassword"
 value={formData.confirmPassword}
 onChange={onValueChange}
 />

 <label className="flex items-start gap-3 cursor-pointer group mt-2">
 <div className={`mt-0.5 size-5 rounded-md border-2 flex items-center justify-center transition-colors bg-white shrink-0 ${agreedToTerms ? 'border-teal-500' : 'border-stone-300 group-hover:border-stone-400'}`}>
 <input
 type="checkbox"
 checked={agreedToTerms}
 onChange={(e) => setAgreedToTerms(e.target.checked)}
 className="hidden"
 />
 {agreedToTerms && <CheckCircle2 className="size-3.5 text-teal-600" />}
 </div>
 <span className="text-xs text-stone-500 leading-snug">
 I agree to the <Link to="/terms" className="text-teal-600 underline">Terms of Service</Link> and <Link to="/privacy" className="text-teal-600 underline">Privacy Policy</Link>.
 </span>
 </label>

 <m.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 type="submit"
 disabled={loading}
 className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-stone-900/10 hover:shadow-stone-900/20 hover:bg-stone-800 transition-all flex items-center justify-center gap-2 mt-4"
 >
 {loading ? 'Creating Account...' : (
 <>
 <span>Create Account</span>
 <ArrowRight className="size-5" />
 </>
 )}
 </m.button>
 </m.form>
 )}
 </AnimatePresence>
 </m.div>
 </div>
 </div>
 );
}

// Sub-components for cleaner code
function FeatureItem({ icon: Icon, text }: { icon: React.ElementType, text: string }) {
 return (
 <div className="flex items-center gap-3 text-stone-600">
 <div className="size-8 rounded-full bg-white flex items-center justify-center shadow-sm text-teal-600">
 <Icon className="size-4" />
 </div>
 <span className="font-medium">{text}</span>
 </div>
 );
}

interface RoleCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  color: string;
}

function RoleCard({ icon: Icon, title, subtitle, active, onClick, disabled, color }: RoleCardProps) {
  const isTeal = color === 'teal';
  return (
  <button
  onClick={onClick}
  disabled={disabled}
  className={`w-full p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${active ? 'border-teal-500 bg-teal-50/50' : disabled ? 'border-stone-100 bg-stone-50 cursor-not-allowed opacity-60' : 'border-stone-100 bg-white hover:border-teal-200 hover:shadow-md' }`}
  >
  <div className="flex items-center gap-5 relative z-10">
  <div className={`size-14 rounded-2xl flex items-center justify-center transition-colors ${active || !active ? (isTeal ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600') : '' }`}>
  <Icon className="size-7" />
  </div>
  <div>
  <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
  <p className="text-sm text-stone-500">{subtitle}</p>
  </div>
  <div className={`ml-auto size-6 rounded-full border-2 flex items-center justify-center ${active ? 'border-teal-500 bg-teal-500' : 'border-stone-200' }`}>
  {active && <CheckCircle2 className="size-4 text-white" />}
  </div>
  </div>
  </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
 icon?: React.ElementType;
 iconHidden?: boolean;
}

function Input({ icon: Icon, iconHidden, ...props }: InputProps) {
 return (
 <div className="relative group">
 {!iconHidden && Icon && (
 <Icon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
 )}
 <input
 required
 className={`w-full py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:bg-white focus:border-teal-500 focus:ring-0 transition-all outline-none font-medium placeholder:text-stone-400 text-stone-900 ${!iconHidden ? 'pl-12 pr-4' : 'px-4' }`}
 {...props}
 />
 </div>
 );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
 const [show, setShow] = useState(false);
 return (
 <div className="relative group">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
 <input
 type={show ? 'text' : 'password'}
 required
 minLength={6}
 className="w-full pl-12 pr-12 py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:bg-white focus:border-teal-500 focus:ring-0 transition-all outline-none font-medium placeholder:text-stone-400 text-stone-900"
 {...props}
 />
 <button
 type="button"
 onClick={() => setShow(!show)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
 >
 {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
 </button>
 </div>
 );
}

export default function RegisterPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
 <div className="size-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
 </div>
 }>
 <RegisterContent />
 </Suspense>
 );
}
