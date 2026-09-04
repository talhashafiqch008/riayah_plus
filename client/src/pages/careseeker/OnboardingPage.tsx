import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Globe,
  Heart,
  Settings,
  Calendar,
  Shield,
  ArrowLeft,
  Sparkles,
  User,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { completeClientOnboarding, updateOnboardingProfile } from '../../lib/api/auth';
import toast from 'react-hot-toast';
import { extractApiError, isApiError } from '../../lib/errors';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { STORAGE_KEYS } from '../../lib/storage-keys';
import {
  createCareUnit,
  createPatient,
  listCareUnits,
  submitIntake,
  updateCareUnit,
} from '@/lib/api/intake';
import {
  PENDING_DIAGNOSIS,
  buildReasonForCare,
  countryToIso2,
  deriveCareUnitName,
  derivePatientName,
  mapCareCategoriesToServices,
} from '@/lib/familyCareseekerIntake';

import StepWelcome from './steps/StepWelcome';
import StepCountryLanguage from './steps/StepCountryLanguage';
import StepCareNeeds from './steps/StepCareNeeds';
import StepPreferences from './steps/StepPreferences';
import StepSchedule from './steps/StepSchedule';
import StepRegistration from './steps/StepRegistration';
import StepConsent from './steps/StepConsent';

export type CareOnboardingVariant = 'careseeker' | 'family';

enum OnboardingStep {
  WELCOME = 0,
  LOCATION = 1,
  CARE_NEEDS = 2,
  PREFERENCES = 3,
  SCHEDULE = 4,
  REGISTRATION = 5,
  CONSENT = 6,
  COMPLETE = 7,
}

const STEPS = [
  { id: 1, label: 'Location', icon: Globe },
  { id: 2, label: 'Support', icon: Heart },
  { id: 3, label: 'Preferences', icon: Settings },
  { id: 4, label: 'Schedule', icon: Calendar },
  { id: 5, label: 'Account', icon: User },
  { id: 6, label: 'Confirm', icon: Shield },
];

const fadeVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

const initialFormData: Record<string, unknown> = {
  country: '',
  preferredLanguage: '',
  careRecipientType: '',
  careCategories: [],
  careNeeds: {},
  dateOfBirth: '',
  practitionerGender: '',
  languages: [],
  careLocation: '',
  address: '',
  scheduleType: '',
  preferredDays: [],
  preferredTimeSlots: [],
  startTiming: '',
  independentProviderAcknowledged: false,
  termsAccepted: false,
  marketingConsentGranted: false,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
};

interface CareOnboardingWizardProps {
  variant?: CareOnboardingVariant;
}

export function CareOnboardingWizard({ variant = 'careseeker' }: CareOnboardingWizardProps) {
  const isFamily = variant === 'family';
  const navigate = useNavigate();
  const { logout, user: authUser, refreshUser, loading: authLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>(
    isFamily ? OnboardingStep.LOCATION : OnboardingStep.WELCOME,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialFormData);

  const draftKey = isFamily
    ? 'raiyah:family_careseeker_onboarding_draft'
    : STORAGE_KEYS.careseekerOnboardingDraft;
  const homePath = isFamily ? '/family' : '/';
  const successPath = isFamily ? '/family' : '/careseeker';

  useEffect(() => {
    if (authLoading) return;

    const checkAuth = () => {
      const status = localStorage.getItem(STORAGE_KEYS.onboardingStatus);
      const user = authUser;

      if (!user) {
        toast.error('Please log in to continue onboarding.');
        navigate(isFamily ? '/login' : '/');
        return;
      }

      try {
        const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';

        if (role.includes('provider')) {
          toast.error('You are logged in as a Provider.');
          navigate('/provider/dashboard');
          return;
        }

        if (
          !isFamily &&
          (role === 'client' || role.includes('family')) &&
          status === 'complete'
        ) {
          toast.success('You have already completed onboarding.');
          navigate('/careseeker/dashboard');
          return;
        }

        setIsLoggedIn(true);
        setIsAuthChecking(false);
      } catch (e) {
        console.error('Auth parse error', e);
        toast.error('Session invalid. Please log in again.');
        navigate(isFamily ? '/login' : '/');
      }
    };

    checkAuth();
  }, [authUser, authLoading, navigate, isFamily]);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.expiresAt > Date.now()) {
          setFormData((prev) => ({ ...prev, ...draft.data }));
          if (draft.step > 0) {
            setStep(draft.step);
          }
        } else {
          localStorage.removeItem(draftKey);
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }, [draftKey]);

  useEffect(() => {
    if (step > OnboardingStep.WELCOME) {
      const draft = {
        data: formData,
        step,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [formData, step, draftKey]);

  const updateData = (newData: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleNext = () => {
    if (step < OnboardingStep.CONSENT) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    const minStep = isFamily ? OnboardingStep.LOCATION : OnboardingStep.LOCATION;
    if (step > minStep) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const buildProfilePayload = () => ({
    country: formData.country,
    preferredLanguage: formData.preferredLanguage,
    careRecipientType: formData.careRecipientType,
    careCategories: formData.careCategories,
    careNeeds: formData.careNeeds,
    dateOfBirth: formData.dateOfBirth,
    practitionerGender: formData.practitionerGender,
    providerLanguages: formData.languages,
    careLocation: formData.careLocation,
    address: formData.address,
    scheduleType: formData.scheduleType,
    preferredDays: formData.preferredDays,
    preferredTimeSlots: formData.preferredTimeSlots,
    startTiming: formData.startTiming,
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    independentProviderAcknowledged: formData.independentProviderAcknowledged,
    termsAccepted: formData.termsAccepted,
    marketingConsentGranted: formData.marketingConsentGranted,
    onboardingComplete: true,
  });

  const submitFamilyIntake = async () => {
    const displayName =
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
      authUser?.email ||
      'Family user';

    const existingUnits = await listCareUnits().catch(() => ({ data: [] as { id: string; name: string }[] }));
    let careUnitId = existingUnits.data[0]?.id;

    const unitName = deriveCareUnitName(displayName, formData.careRecipientType);
    const country = countryToIso2(formData.country);
    const address =
      typeof formData.address === 'string' && formData.address.trim()
        ? formData.address.trim()
        : undefined;

    if (careUnitId) {
      await updateCareUnit(careUnitId, {
        name: unitName,
        address,
        country,
        primaryCaregiverName: displayName,
      });
    } else {
      const unit = await createCareUnit({
        name: unitName,
        address,
        country,
        primaryCaregiverName: displayName,
      });
      careUnitId = unit.id;
    }

    const { patientName, relationship } = derivePatientName(formData, displayName);
    const dob =
      typeof formData.dateOfBirth === 'string' && formData.dateOfBirth.trim()
        ? formData.dateOfBirth.trim()
        : undefined;

    const patient = await createPatient(careUnitId, {
      name: patientName,
      dateOfBirth: dob,
      relationship,
      pocName: displayName,
      notes: 'Created from family simple onboarding. Clinical details pending coordinator review.',
    });

    const serviceInterests = mapCareCategoriesToServices(
      formData.careCategories,
      formData.careNeeds,
    );
    const reasonForCare = buildReasonForCare(formData);
    const consented = Boolean(
      formData.termsAccepted && formData.independentProviderAcknowledged,
    );

    await submitIntake({
      careUnitId,
      careRecipientId: patient.id,
      reasonForCare,
      diagnoses: [PENDING_DIAGNOSIS],
      serviceInterests,
      urgencyLevel: 'medium',
      primaryCaregiverName: displayName,
      wizardPayload: {
        source: 'family_careseeker_onboarding',
        steps: STEPS.map((s) => s.label),
        ...buildProfilePayload(),
      },
      privacyConsent: consented,
      treatmentConsent: consented,
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!authUser) {
        toast.error('Please complete account registration first.');
        setStep(OnboardingStep.REGISTRATION);
        setIsSubmitting(false);
        return;
      }

      if (isFamily) {
        await submitFamilyIntake();
        await completeClientOnboarding({});
        await refreshUser();
        localStorage.removeItem(draftKey);
        setStep(OnboardingStep.COMPLETE);
        toast.success('Request received — our care team will review it soon.');
      } else {
        const profilePayload = buildProfilePayload();
        await completeClientOnboarding(
          profilePayload as Parameters<typeof completeClientOnboarding>[0],
        );
        localStorage.removeItem(draftKey);
        setStep(OnboardingStep.COMPLETE);
      }
    } catch (error: unknown) {
      console.error('Onboarding submission failed:', error);
      if (isFamily) {
        if (isApiError(error)) toast.error(error.message);
        else if (error instanceof Error) toast.error(error.message);
        else toast.error('Failed to submit care request.');
      } else {
        const apiError = extractApiError(error);
        if (apiError.fieldErrors) {
          const errorMessages = Object.values(apiError.fieldErrors).flat();
          toast.error(
            <div className="flex flex-col gap-1">
              <span className="font-bold">{apiError.message || 'Please check your inputs'}</span>
              <ul className="list-disc pl-4 text-sm mt-1 space-y-0.5">
                {errorMessages.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>,
            { duration: 6000, className: 'min-w-[350px]' },
          );
        } else if (apiError.statusCode === 401) {
          toast.error('Session expired. Please try again.');
          setIsLoggedIn(false);
        } else {
          toast.error(
            apiError.message ||
              'An error occurred while saving your progress. Please try again.',
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStepIndex = Math.max(0, step - 1);
  const progress = Math.min(((activeStepIndex + 1) / STEPS.length) * 100, 100);

  const renderCustomStep = () => {
    switch (step) {
      case OnboardingStep.WELCOME:
        return <StepWelcome onNext={() => setStep(OnboardingStep.LOCATION)} />;
      case OnboardingStep.LOCATION:
        return (
          <StepCountryLanguage
            data={formData}
            onUpdate={updateData}
            onNext={handleNext}
            onBack={handleBack}
            variant={variant}
          />
        );
      case OnboardingStep.CARE_NEEDS:
        return (
          <StepCareNeeds
            data={formData}
            onUpdate={updateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case OnboardingStep.PREFERENCES:
        return (
          <StepPreferences
            data={formData}
            onUpdate={updateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case OnboardingStep.SCHEDULE:
        return (
          <StepSchedule
            data={formData}
            onUpdate={updateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case OnboardingStep.REGISTRATION:
        return (
          <StepRegistration
            data={formData}
            onUpdate={updateData}
            onNext={handleNext}
            onBack={handleBack}
            isLoggedIn={isLoggedIn}
            roleLabel={
              isFamily
                ? formData.careRecipientType === 'family_member'
                  ? 'Family Guardian'
                  : formData.careRecipientType === 'myself'
                    ? 'Individual'
                    : 'Family account'
                : undefined
            }
            onAccountCreated={async () => {
              setIsLoggedIn(true);
              if (isFamily) return;
              try {
                const fullPayload = buildProfilePayload();
                await updateOnboardingProfile(
                  fullPayload as Parameters<typeof updateOnboardingProfile>[0],
                );
                toast.success('Profile synced successfully');
              } catch (error) {
                console.error('Silent profile update failed:', error);
              }
            }}
          />
        );
      case OnboardingStep.CONSENT:
        return (
          <StepConsent
            data={formData}
            onUpdate={updateData}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isSubmitting={isSubmitting}
            isLoggedIn={isLoggedIn}
            variant={variant}
          />
        );
      case OnboardingStep.COMPLETE:
        return (
          <CompletionSuccess
            variant={variant}
            successPath={successPath}
          />
        );
      default:
        return null;
    }
  };

  if (isAuthChecking) {
    return (
      <div
        className={`flex items-center justify-center ${
          isFamily ? 'min-h-[240px]' : 'min-h-screen bg-[#FDFBF7]'
        }`}
      >
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="size-12 bg-stone-200 rounded-full" />
          <div className="h-4 w-32 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  // Family: embed inside dashboard shell (sidebar + top header already present)
  if (isFamily) {
    if (step === OnboardingStep.COMPLETE) {
      return (
        <div className="max-w-3xl mx-auto">
          <CompletionSuccess variant="family" successPath={successPath} embedded />
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto w-full space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-1">
              Care request
            </p>
            <h2 className="text-xl font-semibold text-stone-900">Tell us what you need</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              A few simple steps — our care team handles the clinical details.
            </p>
          </div>
          <div className="text-sm font-medium text-stone-500 bg-white border border-stone-200 px-3 py-1.5 rounded-full w-fit">
            Step {activeStepIndex + 1} of {STEPS.length}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5">
          <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden mb-4">
            <m.div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'circOut' }}
            />
          </div>
          <div className="flex justify-between gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const isActive = activeStepIndex === i;
              const isCompleted = activeStepIndex > i;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 min-w-[52px] flex-1">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-teal-600 text-white'
                        : isCompleted
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] uppercase tracking-wider font-bold text-center leading-tight ${
                      isActive
                        ? 'text-teal-700'
                        : isCompleted
                          ? 'text-teal-600'
                          : 'text-stone-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={step}
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 md:p-8"
          >
            {renderCustomStep()}
          </m.div>
        </AnimatePresence>

        {step > OnboardingStep.LOCATION && (
          <div className="text-center pb-2">
            <button
              type="button"
              onClick={handleBack}
              className="text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              Go Back
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === OnboardingStep.WELCOME || step === OnboardingStep.COMPLETE) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden flex items-center justify-center">
        <BackgroundDecorations />
        <AnimatePresence mode="wait">
          <m.div
            key={step}
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative z-10 w-full"
          >
            {renderCustomStep()}
          </m.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden flex flex-col">
      <BackgroundDecorations />

      <div className="relative z-20 px-6 py-4 md:px-12 flex items-center justify-between">
        <Link to={homePath} className="hover:opacity-80 transition-opacity">
          <Logo size="sm" animated={true} />
        </Link>
        <div className="flex items-center gap-4">
          {isLoggedIn && (
            <button
              onClick={() => {
                logout();
                localStorage.removeItem(draftKey);
                window.location.reload();
              }}
              className="text-sm font-bold text-stone-500 hover:text-red-600 bg-white/50 hover:bg-white backdrop-blur-md px-4 py-2 rounded-full border border-white transition-transform duration-300 flex items-center gap-2"
            >
              <LogOut className="size-4" />
              Log Out
            </button>
          )}
          <div className="text-sm font-medium text-stone-500 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white">
            Step {activeStepIndex + 1} of {STEPS.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-4 pb-12 px-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <div className="h-1.5 w-full bg-stone-200/50 rounded-full overflow-hidden">
              <m.div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'circOut' }}
              />
            </div>
            <div className="flex justify-between mt-4 px-2">
              {STEPS.map((s, i) => {
                const isActive = activeStepIndex === i;
                const isCompleted = activeStepIndex > i;
                const Icon = s.icon;
                return (
                  <div key={s.id} className="hidden sm:flex flex-col items-center gap-2">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-lg shadow-teal-200 scale-110'
                          : isCompleted
                            ? 'bg-teal-100 text-teal-600'
                            : 'bg-stone-100 text-stone-300'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="size-5" /> : <Icon className="size-4" />}
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${
                        isActive
                          ? 'text-teal-700'
                          : isCompleted
                            ? 'text-teal-600'
                            : 'text-stone-300'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <m.div
              key={step}
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white p-6 md:p-10 min-h-[500px]"
            >
              {renderCustomStep()}
            </m.div>
          </AnimatePresence>

          <div className="mt-8 text-center">
            <button
              onClick={handleBack}
              className={`text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors flex items-center justify-center gap-1 mx-auto ${
                step <= OnboardingStep.LOCATION ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <ArrowLeft className="size-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <m.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-[10%] -right-[10%] size-[900px] rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-[120px]"
      />
      <m.div
        animate={{ scale: [1, 1.2, 1], x: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute -bottom-[20%] -left-[10%] size-[700px] rounded-full bg-gradient-to-tr from-amber-100/40 to-transparent blur-[100px]"
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#115e59 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

function CompletionSuccess({
  variant,
  successPath,
  embedded = false,
}: {
  variant: CareOnboardingVariant;
  successPath: string;
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const isFamily = variant === 'family';

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(successPath);
    }, embedded ? 2500 : 3500);
    return () => clearTimeout(timer);
  }, [navigate, successPath, embedded]);

  /* eslint-disable react-hooks/purity */
  const confetti = useMemo(
    () =>
      embedded
        ? []
        : Array.from({ length: 30 }, (_, i) => ({
            x: (Math.random() - 0.5) * 400,
            rotate: Math.random() * 360,
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 0.5,
            color:
              i % 4 === 0
                ? 'bg-amber-400'
                : i % 4 === 1
                  ? 'bg-teal-400'
                  : i % 4 === 2
                    ? 'bg-stone-900'
                    : 'bg-rose-300',
          })),
    [embedded],
  );
  /* eslint-enable react-hooks/purity */

  if (embedded && isFamily) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-teal-100">
          <CheckCircle className="size-7 text-teal-700" strokeWidth={2.5} />
        </div>
        <p className="text-xs font-bold tracking-widest text-teal-600 uppercase mb-2">
          Request received
        </p>
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">You're all set</h2>
        <p className="text-sm text-stone-500 mb-6 max-w-md mx-auto leading-relaxed">
          Our care team will review your request before your consultation. You can follow progress
          from your family home.
        </p>
        <Link
          to="/family"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white text-sm font-bold rounded-xl hover:bg-stone-950 transition-colors"
        >
          Go to Family Home
          <ArrowRight className="size-4 opacity-70" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 relative z-10 max-w-lg mx-auto">
      <div className="absolute inset-0 overflow-visible pointer-events-none -z-10">
        {confetti.map((c, i) => (
          <m.div
            key={`confetti-${i}`}
            initial={{ opacity: 0, y: -50, x: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], y: 500, x: c.x, rotate: c.rotate }}
            transition={{ duration: c.duration, delay: c.delay, ease: 'easeOut' }}
            className={`absolute top-0 left-1/2 size-3 rounded-sm ${c.color}`}
          />
        ))}
      </div>

      <m.div
        initial={{ scale: 0.95, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="size-32 bg-stone-900 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-stone-900/30 rotate-3 z-10"
      >
        <div className="size-28 rounded-[24px] border-2 border-stone-700/50 flex items-center justify-center">
          <CheckCircle className="size-16 text-white" strokeWidth={2.5} />
        </div>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="size-5 text-amber-500" />
          <span className="text-sm font-bold tracking-widest text-amber-600 uppercase">
            {isFamily ? 'Request received' : 'Success'}
          </span>
        </div>
        <h2 className="text-4xl font-semibold text-stone-900 mb-4 tracking-tight">
          {isFamily ? "You're all set" : "You're All Set!"}
        </h2>
        <p className="text-lg text-stone-500 mb-10 leading-relaxed">
          {isFamily
            ? 'Our care team will review your request before your consultation. You can follow progress from your family home.'
            : 'Your profile has been created. You can now browse our network of verified care providers.'}
        </p>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col w-full gap-4"
      >
        {isFamily ? (
          <Link to="/family" className="w-full">
            <m.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-8 py-4 bg-stone-900 text-white font-bold text-lg rounded-2xl shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:bg-stone-950 transition-transform duration-300 flex items-center justify-center gap-3"
            >
              Go to Family Home
              <ArrowRight className="size-5 opacity-50" />
            </m.button>
          </Link>
        ) : (
          <>
            <Link to="/browse" className="w-full">
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-4 bg-stone-900 text-white font-bold text-lg rounded-2xl shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:bg-stone-950 transition-transform duration-300 flex items-center justify-center gap-3"
              >
                <Sparkles className="size-5" />
                Explore Providers
                <ArrowRight className="size-5 opacity-50" />
              </m.button>
            </Link>
            <Link to="/careseeker" className="w-full">
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-4 bg-white text-stone-600 font-bold text-lg rounded-2xl border-2 ring-1 ring-stone-100/50 hover:border-stone-300 hover:text-stone-900 transition-transform duration-300"
              >
                Go to Dashboard
              </m.button>
            </Link>
          </>
        )}
      </m.div>
    </div>
  );
}

export default function CareseekerOnboardingPage() {
  return <CareOnboardingWizard variant="careseeker" />;
}
