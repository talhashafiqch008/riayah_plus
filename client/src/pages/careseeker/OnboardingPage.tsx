
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
 CheckCircle, Globe, Heart, Settings, Calendar, Shield,
 ArrowLeft, Sparkles, User, ChevronRight, ArrowRight, LogOut
} from "lucide-react";
import { Link } from 'react-router-dom';
import { completeClientOnboarding, updateOnboardingProfile } from '../../lib/api/auth';
import toast from "react-hot-toast";
import { extractApiError } from '../../lib/errors';
import { Logo } from "../../components/Logo";
import { useAuth } from "../../contexts/AuthContext";
import { STORAGE_KEYS } from '../../lib/storage-keys';

// Step components
import StepWelcome from "./steps/StepWelcome";
import StepCountryLanguage from "./steps/StepCountryLanguage";
import StepCareNeeds from "./steps/StepCareNeeds";
import StepPreferences from "./steps/StepPreferences";
import StepSchedule from "./steps/StepSchedule";
import StepRegistration from "./steps/StepRegistration";
import StepConsent from "./steps/StepConsent";




// 6-Step flow (Location includes Who needs care)
enum OnboardingStep {
 WELCOME = 0,
 LOCATION = 1, // Country, Language, Who needs care
 CARE_NEEDS = 2, // Type of support needed
 PREFERENCES = 3, // Preferences & Matching
 SCHEDULE = 4, // Support Schedule
 REGISTRATION = 5, // Account Registration
 CONSENT = 6, // Summary & Consent
 COMPLETE = 7
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
 transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
};

export default function CareseekerOnboardingPage() {
 const navigate = useNavigate();
 const { logout, user: authUser } = useAuth();
 const [step, setStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isLoggedIn, setIsLoggedIn] = useState(false);
 const [isAuthChecking, setIsAuthChecking] = useState(true); // Block rendering until auth check
 const [formData, setFormData] = useState<Record<string, unknown>>({
 // Step 1: Location & Who (combined)
 country: '',
 preferredLanguage: '',
 careRecipientType: '', // myself, family_member, someone_i_care_for

 // Step 2: Care Needs
 careCategories: [],
 careNeeds: {},
 // NDIS Plan Details
 supportPlanType: '', // ndia_managed, plan_managed, self_managed
 ndisNumber: '',
 dateOfBirth: '',
 planManagerEmail: '',
 planStartDate: '',
 planEndDate: '',

 // Step 3: Provider Preferences
 practitionerGender: '',
 languages: [],
 careLocation: '',
 address: '',

 // Step 4: Schedule & Availability
 scheduleType: '', // one_time, weekly, daily, flexible
 preferredDays: [],
 preferredTimeSlots: [],
 startTiming: '', // asap, this_week, next_week

 // Step 5: Consent + Registration
 independentProviderAcknowledged: false,
 termsAccepted: false,
 marketingConsentGranted: false,

 // Registration fields (for guests)
 firstName: '',
 lastName: '',
 email: '',
 phone: '',
 password: '',
 });

 // Check login status on mount
 // Check login status on mount
 useEffect(() => {
 const checkAuth = () => {
 const userStr = localStorage.getItem(STORAGE_KEYS.user);
 const status = localStorage.getItem(STORAGE_KEYS.onboardingStatus);

 // Fallback to AuthContext user if localStorage is empty
 const user = userStr ? JSON.parse(userStr) : authUser;

 if (!user) {
 toast.error('Please log in to continue onboarding.');
 navigate('/');
 return;
 }

 try {
 const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';

 if (role.includes('provider')) {
 toast.error('You are logged in as a Provider.');
 navigate('/provider/dashboard');
 return;
 }

 if ((role === 'client' || role.includes('family')) && status === 'complete') {
 toast.success('You have already completed onboarding.');
 navigate('/careseeker/dashboard');
 return;
 }

 setIsLoggedIn(true);
 setIsAuthChecking(false);

 } catch (e) {
 console.error('Auth parse error', e);
 localStorage.clear();
 toast.error('Session invalid. Please log in again.');
 navigate('/');
 }
 };

 checkAuth();
 }, [authUser]);
 // Load saved draft on mount
 useEffect(() => {
 try {
 const savedDraft = localStorage.getItem(STORAGE_KEYS.careseekerOnboardingDraft);
 if (savedDraft) {
 const draft = JSON.parse(savedDraft);
 if (draft.expiresAt > Date.now()) {
 setFormData((prev: Record<string, unknown>) => ({ ...prev, ...draft.data }));
 if (draft.step > 0) {
 setStep(draft.step);
 }
 } else {
 localStorage.removeItem(STORAGE_KEYS.careseekerOnboardingDraft);
 }
 }
 } catch (e) {
 console.error('Failed to load draft:', e);
 }
 }, []);

 // Auto-save draft when form data changes
 useEffect(() => {
 if (step > OnboardingStep.WELCOME) {
 const draft = {
 data: formData,
 step: step,
 expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
 };
 localStorage.setItem(STORAGE_KEYS.careseekerOnboardingDraft, JSON.stringify(draft));
 }
 }, [formData, step]);

 // Update form data helper
 const updateData = (newData: Record<string, unknown>) => {
 setFormData((prev: Record<string, unknown>) => ({ ...prev, ...newData }));
 };

 // Navigation handlers
 const handleNext = () => {
 if (step < OnboardingStep.CONSENT) {
 setStep(step + 1);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 };

 const handleBack = () => {
 if (step > OnboardingStep.LOCATION) {
 setStep(step - 1);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 };

 // Build profile payload
 const buildProfilePayload = () => ({
 // --- 1. Location & User Type ---
 country: formData.country,
 preferredLanguage: formData.preferredLanguage,
 careRecipientType: formData.careRecipientType,

 // --- 2. Support / Care Needs ---
 careCategories: formData.careCategories,
 careNeeds: formData.careNeeds,
 // NDIS Plan Data
 supportPlanType: formData.supportPlanType,
 ndisNumber: formData.ndisNumber,
 dateOfBirth: formData.dateOfBirth,
 planManagerEmail: formData.planManagerEmail,
 planStartDate: formData.planStartDate,
 planEndDate: formData.planEndDate,

 // --- 3. Provider Preferences ---
 practitionerGender: formData.practitionerGender,
 providerLanguages: formData.languages,
 careLocation: formData.careLocation,
 address: formData.address,

 // --- 4. Schedule ---
 scheduleType: formData.scheduleType,
 preferredDays: formData.preferredDays,
 preferredTimeSlots: formData.preferredTimeSlots,
 startTiming: formData.startTiming,

 // --- 5. Account Details (Snapshot) ---
 firstName: formData.firstName,
 lastName: formData.lastName,
 email: formData.email,
 phone: formData.phone,

 // --- 6. Consent & Confirmation ---
 independentProviderAcknowledged: formData.independentProviderAcknowledged,
 termsAccepted: formData.termsAccepted,
 marketingConsentGranted: formData.marketingConsentGranted,

 // Status
 onboardingComplete: true,
 });

 // Submit handler
 const handleSubmit = async () => {
 setIsSubmitting(true);

 try {
 const userData = localStorage.getItem(STORAGE_KEYS.user);
 if (!userData) {
 toast.error('Please complete account registration first.');
 setStep(OnboardingStep.REGISTRATION);
 setIsSubmitting(false);
 return;
 }

 const profilePayload = buildProfilePayload();
 await completeClientOnboarding(profilePayload as Parameters<typeof completeClientOnboarding>[0]);

 localStorage.removeItem(STORAGE_KEYS.careseekerOnboardingDraft);
 setStep(OnboardingStep.COMPLETE);

 } catch (error: unknown) {
 console.error('Onboarding submission failed:', error);
 const apiError = extractApiError(error);

 if (apiError.fieldErrors) {
 // Handle Structured Validation Errors
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
 {
 duration: 6000,
 className: 'min-w-[350px]'
 }
 );
 } else if (apiError.statusCode === 401) {
 toast.error('Session expired. Please try again.');
 setIsLoggedIn(false);
 } else {
 toast.error(apiError.message || 'An error occurred while saving your progress. Please try again.');
 }
 } finally {
 setIsSubmitting(false);
 }
 };

 // Calculate progress
 const activeStepIndex = Math.max(0, step - 1);
 const progress = Math.min(((activeStepIndex + 1) / STEPS.length) * 100, 100);

 const renderCustomStep = () => {
 switch (step) {
 case OnboardingStep.WELCOME:
 return <StepWelcome onNext={() => setStep(OnboardingStep.LOCATION)} />;
 case OnboardingStep.LOCATION:
 return <StepCountryLanguage data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case OnboardingStep.CARE_NEEDS:
 return <StepCareNeeds data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case OnboardingStep.PREFERENCES:
 return <StepPreferences data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case OnboardingStep.SCHEDULE:
 return <StepSchedule data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case OnboardingStep.REGISTRATION:
 return (
 <StepRegistration
 data={formData}
 onUpdate={updateData}
 onNext={handleNext}
 onBack={handleBack}
 isLoggedIn={isLoggedIn}
 onAccountCreated={async () => {
 setIsLoggedIn(true);
 // IMMEDIATELY save the full profile data after registration
 // This ensures all data (Location, Needs, etc.) is linked to the new account right away
 try {
 const fullPayload = buildProfilePayload();
 await updateOnboardingProfile(fullPayload as Parameters<typeof updateOnboardingProfile>[0]);
 toast.success('Profile synced successfully');
 } catch (error) {
 console.error('Silent profile update failed:', error);
 // Don't block flow, user can still submit at the end
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
 />
 );
 case OnboardingStep.COMPLETE:
 return <CompletionSuccess />;
 default:
 return null;
 }
 };

 // Render Logic
 if (isAuthChecking) {
 return (
 <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
 <div className="animate-pulse flex flex-col items-center gap-4">
 <div className="size-12 bg-stone-200 rounded-full"></div>
 <div className="h-4 w-32 bg-stone-200 rounded"></div>
 </div>
 </div>
 );
 }

 // If Welcome or Complete, use full screen specialized layout
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
 )
 }

 return (
 <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden flex flex-col">
 <BackgroundDecorations />

 {/* Header / Nav */}
 <div className="relative z-20 px-6 py-6 md:px-12 flex items-center justify-between">
 <Link to="/" className="hover:opacity-80 transition-opacity">
 <Logo size="md" animated={true} />
 </Link>
 <div className="flex items-center gap-4">
 {isLoggedIn && (
 <button
 onClick={() => {
 logout();
 localStorage.removeItem(STORAGE_KEYS.careseekerOnboardingDraft); // Also clear draft
 window.location.reload(); // Hard reload to clear state
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

 {/* Main Content Area */}
 <div className="flex-1 flex flex-col items-center justify-start pt-4 pb-12 px-4 relative z-10 overflow-y-auto">
 <div className="w-full max-w-4xl">

 {/* Progress Indicator */}
 <div className="mb-8">
 <div className="h-1.5 w-full bg-stone-200/50 rounded-full overflow-hidden">
 <m.div
 className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
 initial={{ width: 0 }}
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.5, ease: "circOut" }}
 />
 </div>
 <div className="flex justify-between mt-4 px-2">
 {STEPS.map((s, i) => {
 const isActive = activeStepIndex === i;
 const isCompleted = activeStepIndex > i;
 const Icon = s.icon;

 return (
 <div key={s.id} className="hidden sm:flex flex-col items-center gap-2">
 <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isActive ? 'bg-teal-600 text-white shadow-lg shadow-teal-200 scale-110' : isCompleted ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone-300' }`}>
 {isCompleted ? <CheckCircle className="size-5" /> : <Icon className="size-4" />}
 </div>
 <span className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${isActive ? 'text-teal-700' : isCompleted ? 'text-teal-600' : 'text-stone-300' }`}>
 {s.label}
 </span>
 </div>
 )
 })}
 </div>
 </div>

 {/* Glass Card Container */}
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

 {/* Navigation Help */}
 <div className="mt-8 text-center">
 <button
 onClick={handleBack}
 className={`text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors flex items-center justify-center gap-1 mx-auto ${step <= OnboardingStep.LOCATION ? 'opacity-0 pointer-events-none' : ''}`}
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

// Background Component
function BackgroundDecorations() {
 return (
 <div className="absolute inset-0 pointer-events-none">
 <m.div
 animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
 transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
 className="absolute -top-[10%] -right-[10%] size-[900px] rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-[120px]"
 />
 <m.div
 animate={{ scale: [1, 1.2, 1], x: [0, -30, 0] }}
 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
 className="absolute -bottom-[20%] -left-[10%] size-[700px] rounded-full bg-gradient-to-tr from-amber-100/40 to-transparent blur-[100px]"
 />
 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#115e59 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
 </div>
 );
}

// Success Component
function CompletionSuccess() {
 const navigate = useNavigate();

 useEffect(() => {
 const timer = setTimeout(() => {
 navigate('/careseeker');
 }, 3000);
 return () => clearTimeout(timer);
 }, []);

 /* eslint-disable react-hooks/purity */
 const confetti = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
 x: (Math.random() - 0.5) * 400,
 rotate: Math.random() * 360,
 duration: 3 + Math.random() * 2,
 delay: Math.random() * 0.5,
 color: i % 4 === 0 ? 'bg-amber-400' : i % 4 === 1 ? 'bg-teal-400' : i % 4 === 2 ? 'bg-stone-900' : 'bg-rose-300'
 })), []);
 /* eslint-enable react-hooks/purity */

 return (
 <div className="flex flex-col items-center justify-center text-center py-12 relative z-10 max-w-lg mx-auto">
 {/* Confetti Animation */}
 <div className="absolute inset-0 overflow-visible pointer-events-none -z-10">
 {confetti.map((c, i) => (
 <m.div
 key={`confetti-${i}`}
 initial={{ opacity: 0, y: -50, x: 0, rotate: 0 }}
 animate={{ opacity: [0, 1, 0], y: 500, x: c.x, rotate: c.rotate }}
 transition={{ duration: c.duration, delay: c.delay, ease: "easeOut" }}
 className={`absolute top-0 left-1/2 size-3 rounded-sm ${c.color}`}
 />
 ))}
 </div>

 <m.div
 initial={{ scale: 0.95, opacity: 0, rotate: -20 }}
 animate={{ scale: 1, rotate: 0 }}
 transition={{ type: "spring", stiffness: 200, damping: 20 }}
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
 <span className="text-sm font-bold tracking-widest text-amber-600 uppercase">Success</span>
 </div>
 <h2 className="text-4xl font-semibold text-stone-900 mb-4 tracking-tight">You're All Set!</h2>
 <p className="text-lg text-stone-500 mb-10 leading-relaxed">
 Your profile has been created. You can now browse our network of verified care providers.
 </p>
 </m.div>

 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 className="flex flex-col w-full gap-4"
 >
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
 className="w-full px-8 py-4 bg-white text-stone-600 font-bold text-lg rounded-2xl  border-2 ring-1 ring-stone-100/50 hover:border-stone-300 hover:text-stone-900 transition-transform duration-300"
 >
 Go to Dashboard
 </m.button>
 </Link>
 </m.div>
 </div>
 );
}
