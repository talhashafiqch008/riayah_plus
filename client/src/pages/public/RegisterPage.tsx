import { useState, useMemo, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { m, LazyMotion, domAnimation } from "framer-motion";
import { isApiError } from '@/lib/errors';
import { createRegisterSchema } from '@/lib/validation';
import { registerWithPhone } from '@/lib/api/auth';
import { PhoneInput } from '@/components/PhoneInput';
import { CountryCode } from '@/config/countries';
import {
 Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { FieldError } from '@/components/forms/FieldError';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';

const fadeIn = {
 initial: { opacity: 0, x: 20 },
 animate: { opacity: 1, x: 0 },
 exit: { opacity: 0, x: -20 },
 transition: { duration: 0.3 }
};

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function RegisterContent() {
 const { t } = useTranslation('auth');
 const registerSchema = useMemo(() => createRegisterSchema(t), [t]);
 const selectedRole = 'family';
 const [method, setMethod] = useState<'email' | 'phone'>('email');
 const [formData, setFormData] = useState({
 email: '',
 password: '',
 confirmPassword: '',
 firstName: '',
 lastName: '',
 phone: '',
 });
 const [phoneE164, setPhoneE164] = useState('');
 const [loading, setLoading] = useState(false);
 const [agreedToTerms, setAgreedToTerms] = useState(false);
 const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
 const { register } = useAuth();
 const navigate = useNavigate();

 const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 setFormData({
 ...formData,
 [e.target.name]: e.target.value,
 });
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setFieldErrors({});
 setLoading(true);

 try {
 if (!agreedToTerms) {
 toast.error(t('register.consentRequired'));
 return;
 }

 if (method === 'email') {
 const validation = registerSchema.safeParse({
 ...formData,
 terms: agreedToTerms
 });

 if (!validation.success) {
 const firstError = validation.error.issues[0];
 toast.error(firstError?.message || t('register.checkDetails'));
 return;
 }

 const result = await register({
 email: formData.email,
 password: formData.password,
 firstName: formData.firstName,
 lastName: formData.lastName,
 phone: formData.phone,
 role: selectedRole,
 consentAccepted: true,
 });

 if (result.requiresEmailVerification) {
 toast.success(t('register.accountCreatedVerifyEmail'));
 navigate(`/verify-email?email=${encodeURIComponent(result.user.email)}`);
 return;
 }

 toast.success(t('register.accountCreatedSuccess'));
 navigate('/family');
 return;
 }

 if (!formData.firstName.trim() || !formData.lastName.trim()) {
 toast.error(t('register.enterFirstLastName'));
 return;
 }
 if (!phoneE164 || phoneE164.replace(/\D/g, '').length < 8) {
 toast.error(t('register.validPhone'));
 return;
 }
 if (!passwordRegex.test(formData.password)) {
 toast.error(t('register.passwordComplexityShort'));
 return;
 }
 if (formData.password !== formData.confirmPassword) {
 toast.error(t('register.passwordsMismatch'));
 return;
 }

 const result = await registerWithPhone({
 firstName: formData.firstName,
 lastName: formData.lastName,
 phone: phoneE164.replace(/\s+/g, ''),
 password: formData.password,
 role: selectedRole,
 consentAccepted: true,
 });

 if (result.requiresPhoneVerification) {
 const phone = result.user?.phone || phoneE164.replace(/\s+/g, '');
 toast.success(t('register.accountCreatedSms'));
 navigate(`/verify-phone?phone=${encodeURIComponent(phone)}`);
 return;
 }

 toast.success(t('register.accountCreated'));
 navigate('/login?portal=family');
 } catch (error: unknown) {
 if (isApiError(error) && error.fieldErrors) {
 setFieldErrors(error.fieldErrors);
 toast.error(error.message);
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error(t('register.registrationFailed'));
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen relative flex items-center justify-center bg-[#FDFBF7] overflow-hidden py-10 px-4">
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

 <div className="relative z-10 size-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">
 <m.div
 initial={{ opacity: 0, x: -30 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.6 }}
 className="hidden md:flex flex-col flex-1 max-w-lg"
 >
 <Link to="/" className="mb-8 block w-fit hover:opacity-80 transition-opacity">
 <Logo size="xl" animated={true} />
 </Link>

 <m.div {...fadeIn} className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-sm">
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">{t('register.familyAccountTitle')}</h2>
 <p className="text-stone-500 mb-6">{t('register.familyAccountSubtitle')}</p>
 <div className="p-4 bg-teal-50 rounded-xl flex items-start gap-3 border border-teal-100">
 <div className="size-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-teal-600">
 <ShieldCheck className="size-4" />
 </div>
 <div>
 <h3 className="font-semibold text-sm text-stone-900">{t('register.privacyTitle')}</h3>
 <p className="text-xs text-stone-500 mt-1">{t('register.privacyBody')}</p>
 </div>
 </div>
 </m.div>
 </m.div>

 <m.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8, delay: 0.1 }}
 className="w-full max-w-[480px] bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white relative"
 >
 <div className="absolute -z-10 -bottom-10 -left-10 size-40 bg-amber-100/50 rounded-full blur-3xl"></div>

 <div className="text-center mb-6">
 <h2 className="text-2xl font-semibold text-stone-900">{t('register.heading')}</h2>
 </div>

 <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1">
 <button
 type="button"
 onClick={() => setMethod('email')}
 className={`rounded-xl py-2.5 text-sm font-semibold transition ${method === 'email' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
 >
 {t('register.methodEmail')}
 </button>
 <button
 type="button"
 onClick={() => setMethod('phone')}
 className={`rounded-xl py-2.5 text-sm font-semibold transition ${method === 'phone' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
 >
 {t('register.methodPhone')}
 </button>
 </div>

 <m.form {...fadeIn} onSubmit={handleSubmit} className="space-y-4">
 <FormErrorSummary errors={fieldErrors} />
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Input
 icon={User}
 placeholder={t('register.firstName')}
 name="firstName"
 value={formData.firstName}
 onChange={onValueChange}
 />
 <FieldError error={fieldErrors.firstName} />
 </div>
 <div>
 <Input
 icon={User}
 placeholder={t('register.lastName')}
 name="lastName"
 value={formData.lastName}
 onChange={onValueChange}
 iconHidden
 />
 <FieldError error={fieldErrors.lastName} />
 </div>
 </div>

 {method === 'email' ? (
 <>
 <div>
 <Input
 icon={Mail}
 placeholder={t('register.emailAddress')}
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
 placeholder={t('register.phone')}
 type="tel"
 name="phone"
 value={formData.phone}
 onChange={onValueChange}
 required={false}
 />
 <FieldError error={fieldErrors.phone} />
 </div>
 </>
 ) : (
 <div>
 <PhoneInput
 value={phoneE164}
 defaultCountry={CountryCode.PK}
 onChange={(phone) => setPhoneE164(phone)}
 required
 />
 <FieldError error={fieldErrors.phone} />
 </div>
 )}

 <div>
 <PasswordInput
 placeholder={t('register.password')}
 name="password"
 value={formData.password}
 onChange={onValueChange}
 showLabel={t('register.showPassword')}
 hideLabel={t('register.hidePassword')}
 />
 <FieldError error={fieldErrors.password} />
 </div>
 <PasswordInput
 placeholder={t('register.confirmPassword')}
 name="confirmPassword"
 value={formData.confirmPassword}
 onChange={onValueChange}
 showLabel={t('register.showPassword')}
 hideLabel={t('register.hidePassword')}
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
 {t('register.agreeLead')}{' '}
 <Link to="/terms" className="text-teal-600 underline">{t('register.termsOfService')}</Link>
 {' '}{t('register.agreeAnd')}{' '}
 <Link to="/privacy" className="text-teal-600 underline">{t('register.privacyPolicy')}</Link>.
 </span>
 </label>

 <m.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 type="submit"
 disabled={loading}
 className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-stone-900/10 hover:shadow-stone-900/20 hover:bg-stone-800 transition-all flex items-center justify-center gap-2 mt-4"
 >
 {loading ? t('register.creatingAccount') : (
 <>
 <span>{method === 'phone' ? t('register.createAndSendSms') : t('register.createAccountCta')}</span>
 <ArrowRight className="size-5" />
 </>
 )}
 </m.button>

 <p className="text-center text-sm text-stone-500 pt-2">
 {t('register.alreadyHaveAccount')}{' '}
 <Link to="/login?portal=family" className="font-semibold text-teal-700 hover:underline">
 {t('register.signIn')}
 </Link>
 </p>
 </m.form>
 </m.div>
 </div>
 </div>
 );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
 icon?: React.ElementType;
 iconHidden?: boolean;
}

function Input({ icon: Icon, iconHidden, required = true, ...props }: InputProps) {
 return (
 <div className="relative group">
 {!iconHidden && Icon && (
 <Icon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
 )}
 <input
 required={required}
 className={`w-full py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:bg-white focus:border-teal-500 focus:ring-0 transition-all outline-none font-medium placeholder:text-stone-400 text-stone-900 ${!iconHidden ? 'pl-12 pr-4' : 'px-4' }`}
 {...props}
 />
 </div>
 );
}

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
 showLabel?: string;
 hideLabel?: string;
}

function PasswordInput({ showLabel, hideLabel, ...props }: PasswordInputProps) {
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
 aria-label={show ? hideLabel : showLabel}
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
 <LazyMotion features={domAnimation}>
 <RegisterContent />
 </LazyMotion>
 </Suspense>
 );
}
