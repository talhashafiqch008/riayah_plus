import { useState } from "react";
import { useTranslation } from "react-i18next";
import { m } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, Phone, CheckCircle, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { login, register } from '../../../lib/api/auth';
import { isApiError } from '../../../lib/errors';
import { z } from 'zod';
import { RegisterPayload } from '../../../types/api';
import toast from "react-hot-toast";

interface StepRegistrationProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onBack: () => void;
  isLoggedIn?: boolean;
  onAccountCreated?: () => void;
  roleLabel?: string;
  variant?: 'careseeker' | 'family';
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function StepRegistration({ data, onUpdate, onNext, onBack, isLoggedIn, onAccountCreated, roleLabel, variant = 'careseeker' }: StepRegistrationProps) {
  const { t } = useTranslation('family');
  const isFamily = variant === 'family';
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const registrationStepSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must be less than 50 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be less than 50 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });

  const registrationFieldsValid = () => {
    const result = registrationStepSchema.safeParse({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password
    });
    return result.success;
  };

  const isValid = isLoggedIn || registrationFieldsValid();

  const familyRoleTitle =
    isFamily && data.careRecipientType === 'family_member'
      ? t('onboarding.accounts.family_member.title')
      : isFamily && data.careRecipientType === 'myself'
        ? t('onboarding.accounts.myself.title')
        : roleLabel;

  const handleContinue = async () => {
    if (!isValid || isRegistering) {
      if (!isValid) {
        const result = registrationStepSchema.safeParse({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password
        });
        if (!result.success) {
          const firstError = result.error.issues[0];
          toast.error(firstError?.message || 'Please fill in all required fields');
        }
      }
      return;
    }

    if (!isLoggedIn) {
      setIsRegistering(true);
      try {
        const userRole = data.careRecipientType === 'myself' ? 'client' : 'family';
        const registrationPayload = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: userRole,
          consentAccepted: data.termsAccepted === true,
        };
        if (!registrationPayload.consentAccepted) {
          toast.error('Please accept the Terms of Service to create your account.');
          setIsRegistering(false);
          return;
        }
        try {
          const regResponse = await register(registrationPayload as RegisterPayload);
          if (regResponse?.requiresEmailVerification) {
            toast.success('Account created! Please verify your email before continuing.');
            window.location.href = `/verify-email?email=${encodeURIComponent(data.email as string)}`;
            setIsRegistering(false);
            return;
          }
        } catch (regError: unknown) {
          if (isApiError(regError) && regError.statusCode === 409) {
            toast.error('This email is already registered. Please sign in instead.');
            setIsRegistering(false);
            return;
          }
          if (isApiError(regError) && regError.message?.includes('already exists')) {
            toast.error('This email is already registered. Please sign in instead.');
            setIsRegistering(false);
            return;
          }
          throw regError;
        }
        await login(data.email as string, data.password as string);
        toast.success('Account created successfully!');
        if (onAccountCreated) {
          onAccountCreated();
        }
        setIsRegistering(false);
        onNext();
      } catch (error: unknown) {
        console.error('Registration failed:', error);
        if (isApiError(error) && error.fieldErrors) {
          const messages = Object.entries(error.fieldErrors)
            .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
            .join('; ');
          toast.error(`${error.message} — ${messages}`);
        } else if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error('Registration failed. Please try again.');
        }
        setIsRegistering(false);
      }
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <m.div {...fadeIn}>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-12 rounded-2xl flex items-center justify-center bg-teal-100 rotate-3">
            <ShieldCheck className="size-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-stone-900 leading-none">
              {isFamily ? t('onboarding.stepTitles.account') : 'Create Your Account'}
            </h2>
            <p className="text-stone-500 mt-1">
              {isLoggedIn
                ? isFamily
                  ? t('onboarding.alreadyLoggedIn')
                  : "You're already logged in."
                : isFamily
                  ? t('onboarding.saveProfileHint')
                  : 'Securely save your profile to connect with providers.'}
            </p>
          </div>
        </div>
      </m.div>

      {/* Account Registration Form */}
      <m.div {...fadeIn} transition={{ delay: 0.1 }}>
        <div className="p-8 rounded-[32px] border-2 bg-gradient-to-br from-white to-stone-50 ring-1 ring-stone-200/50">
          {isLoggedIn && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 mb-6">
              <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="size-5" />
              </div>
              <div>
                <p className="font-bold text-emerald-800 text-sm">
                  {isFamily ? t('onboarding.accountVerified') : 'Account Verified'}
                </p>
                <p className="text-xs text-emerald-600">
                  {familyRoleTitle
                    ? isFamily
                      ? t('onboarding.signedInAs', { role: familyRoleTitle })
                      : `You are signed in as ${familyRoleTitle} and ready to proceed.`
                    : isFamily
                      ? t('onboarding.loggedInReady')
                      : 'You are logged in and ready to proceed.'}
                </p>
              </div>
            </div>
          )}

          {!isLoggedIn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-stone-700 mb-1.5">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
                    <input id="first-name"
                      type="text"
                      value={(data.firstName as string) || ''}
                      onChange={(e) => onUpdate({ ...data, firstName: e.target.value })}
                      placeholder="John"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-stone-700 mb-1.5">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
                    <input id="last-name"
                      type="text"
                      value={(data.lastName as string) || ''}
                      onChange={(e) => onUpdate({ ...data, lastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
                  <input id="email"
                    type="email"
                    value={(data.email as string) || ''}
                    onChange={(e) => onUpdate({ ...data, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
                  <input id="phone"
                    type="tel"
                    value={(data.phone as string) || ''}
                    onChange={(e) => onUpdate({ ...data, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
                  <input id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={(data.password as string) || ''}
                    onChange={(e) => onUpdate({ ...data, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-12 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoggedIn && (
            <label className="mt-6 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.termsAccepted === true}
                onChange={(e) => onUpdate({ ...data, termsAccepted: e.target.checked })}
                className="mt-1 size-4 accent-teal-600"
              />
              <span className="text-sm text-stone-600">
                I agree to the{' '}
                <a href="/terms" className="text-teal-600 underline" target="_blank" rel="noreferrer">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-teal-600 underline" target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          )}
        </div>
      </m.div>

      {/* Navigation */}
      <m.div
        {...fadeIn}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-center pt-6 border-t ring-1 ring-stone-100/50"
      >
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors px-4 py-2 rounded-xl hover:bg-stone-100"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          {isFamily ? t('onboarding.back') : 'Back'}
        </button>
        <m.button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleContinue();
          }}
          disabled={!isValid || isRegistering}
          whileHover={isValid && !isRegistering ? { scale: 1.02 } : {}}
          whileTap={isValid && !isRegistering ? { scale: 0.98 } : {}}
          className="px-8 py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
        >
          {isRegistering ? (
            <>
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Account…
            </>
          ) : (
            <>
              {isLoggedIn
                ? isFamily
                  ? t('onboarding.continue')
                  : 'Continue'
                : isFamily
                  ? t('onboarding.createAccount')
                  : 'Create Account'}
              <ArrowRight className={`size-5${isFamily ? ' rtl-flip' : ''}`} />
            </>
          )}
        </m.button>
      </m.div>
    </div>
  );
}
