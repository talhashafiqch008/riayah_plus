
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { CheckCircle, Briefcase, User, Award, Shield, GraduationCap, ArrowLeft, ArrowRight, Sparkles, CheckCircle2, ChevronRight, LogOut } from "lucide-react";
import { Link } from 'react-router-dom';
import { completeOnboarding } from '../../lib/api/auth';
import toast from "react-hot-toast";
import { extractApiError } from '../../lib/errors';
import { Logo, LogoLight } from "../../components/Logo";
import { useAuth, isProviderRole } from "../../contexts/AuthContext";
import { STORAGE_KEYS } from '../../lib/storage-keys';

export interface ProviderOnboardingData {
 role: string;
 roleCategory: string;
 country: string;
 preferredLanguage: string;
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 password: string;
 nationalId: string;
 documents: Record<string, unknown>;
 clinicalCredentials: Record<string, unknown>;
 supportSkills: Record<string, unknown>;
 backgroundCheckConsent: boolean;
 vaccinationComplete: boolean;
 gender: string;
 languages: string[];
 availableDays: string[];
 availableTimeSlots: string[];
 hourlyRate: number | undefined;
 maxDistanceKm: number | undefined;
 serviceLocation: string;
 profilePhoto: string | null;
 profilePhotoFile?: File;
 inductionVideoWatched: boolean;
 quizAnswers: Record<string, unknown>;
 termsAccepted: boolean;
 codeOfConductAccepted: boolean;
 independentProviderAcknowledged: boolean;
 marketingConsentGranted: boolean;
 roles?: string[];
 roleCategories?: string[];
 providerType?: string;
 skills?: string[];
 alliedHealthSpecialty?: string;
 [key: string]: unknown;
}

// Step components
import StepProviderWelcome from "./steps/StepProviderWelcome";
import StepRoleCountry from "./steps/StepRoleCountry";
import StepIdentity from "./steps/StepIdentity";
import StepCredentialsClinical from "./steps/StepCredentialsClinical";
import StepSkillsSupport from "./steps/StepSkillsSupport";
import StepCompliance from "./steps/StepCompliance";
import StepProfileAccount from "./steps/StepProfileAccount";
import StepInduction from "./steps/StepInduction";




// 6-Step flow
enum ProviderStep {
 WELCOME = 0,
 ROLE_COUNTRY = 1,
 IDENTITY = 2,
 CREDENTIALS = 3, // Clinical: credentials, Support: skills
 COMPLIANCE = 4,
 PROFILE_ACCOUNT = 5,
 INDUCTION = 6,
 COMPLETE = 7
}

const getSteps = (roleCategory: string) => [
 { id: 1, label: 'Role & Location', icon: Briefcase, description: 'Select your profession' },
 { id: 2, label: 'Identity Check', icon: User, description: 'Verify who you are' },
 { id: 3, label: roleCategory === 'HEALTHCARE' ? 'Credentials' : 'Skills', icon: Award, description: roleCategory === 'HEALTHCARE' ? 'License & Education' : 'Expertise & Experience' },
 { id: 4, label: 'Preferences', icon: Shield, description: 'Availability & Rules' },
 { id: 5, label: 'Profile Setup', icon: User, description: ' Bio & Photo' },
 { id: 6, label: 'Induction', icon: GraduationCap, description: 'Final verification' },
];

const fadeVariants = {
 initial: { opacity: 0, x: 20 },
 animate: { opacity: 1, x: 0 },
 exit: { opacity: 0, x: -20 }
};

export default function ProviderOnboardingPage() {
 const navigate = useNavigate();
 const { user: authUser, loading: authLoading, logout } = useAuth();
 const [step, setStep] = useState<ProviderStep>(ProviderStep.WELCOME);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isLoggedIn, setIsLoggedIn] = useState(false);

 const [formData, setFormData] = useState<ProviderOnboardingData>({
 // Step 1: Role & Country
 role: '',
 roleCategory: '', // 'CLINICAL' or 'SUPPORT'
 country: '',
 preferredLanguage: '',

 // Step 2: Identity & Registration
 firstName: '',
 lastName: '',
 email: '',
 phone: '',
 password: '',
 nationalId: '',
 documents: {},

 // Step 3: Credentials (Clinical) or Skills (Support)
 clinicalCredentials: {},
 supportSkills: {},

 // Step 4: Compliance & Availability
 backgroundCheckConsent: false,
 vaccinationComplete: false,
 gender: '',
 languages: [],
 availableDays: [],
 availableTimeSlots: [],
 hourlyRate: undefined,
 maxDistanceKm: undefined,
 serviceLocation: '',

 // Step 5: Profile & Account
 profilePhoto: null,

 // Step 6: Induction
 inductionVideoWatched: false,
 quizAnswers: {},
 termsAccepted: false,
 codeOfConductAccepted: false,
 independentProviderAcknowledged: false,
 marketingConsentGranted: false,
 });

 // strict route protection
 useEffect(() => {
 if (authLoading) return;

 if (!authUser) {
 toast.error('Please login to continue');
 navigate('/');
 return;
 }

 const role = typeof authUser.role === 'string' ? authUser.role.toLowerCase() : '';

    // Not a provider role (doctor, nurse, etc.) -> Home
    if (!isProviderRole(role)) {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }

 // Already completed onboarding -> Dashboard
 const status = authUser.onboarding_status;
 if (status === 'complete' || status === 'completed') {
 toast.success('You have already completed onboarding');
 navigate('/provider/dashboard');
 return;
 }

 // Valid -> Set logged in
 setIsLoggedIn(true);
 }, [authUser, authLoading]);

 // Load saved draft on mount
 useEffect(() => {
 try {
 const savedDraft = localStorage.getItem(STORAGE_KEYS.providerOnboardingDraft);
 if (savedDraft) {
 const draft = JSON.parse(savedDraft);
 if (draft.expiresAt > Date.now()) {
 setFormData((prev) => ({ ...prev, ...draft.data }));
 if (draft.step > 0) {
 setStep(draft.step);
 }
 } else {
 localStorage.removeItem(STORAGE_KEYS.providerOnboardingDraft);
 }
 }
 } catch (e) {
 console.error('Failed to load draft:', e);
 }
 }, []);

 // Auto-save draft when form data changes
 useEffect(() => {
 if (step > ProviderStep.WELCOME) {
 // Strip File objects that can't be serialized to JSON
 const serializableData = { ...formData };
 delete serializableData.profilePhotoFile;
 // Strip file objects from documents (keep metadata only for display)
 if (serializableData.documents) {
 const cleanDocs: Record<string, Array<Record<string, unknown>> | Record<string, unknown>> = {};
 Object.entries(serializableData.documents).forEach(([key, doc]) => {
 if (Array.isArray(doc)) {
 cleanDocs[key] = doc.map((item) => ({
 id: item.id, name: item.name, size: item.size,
 type: item.type, status: item.status,
 }));
 } else if (doc && typeof doc === 'object') {
 const d = doc as Record<string, unknown>;
 cleanDocs[key] = {
 name: d.name, size: d.size,
 type: d.type, status: d.status,
 };
 }
 });
 serializableData.documents = cleanDocs;
 }
 const draft = {
 data: serializableData,
 step: step,
 expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
 };
 localStorage.setItem(STORAGE_KEYS.providerOnboardingDraft, JSON.stringify(draft));
 }
 }, [formData, step]);

 // Update form data helper
 const updateData = (newData: Partial<ProviderOnboardingData>) => {
 setFormData((prev) => ({ ...prev, ...newData }));
 };

 // Navigation handlers
 const handleNext = () => {
 if (step < ProviderStep.INDUCTION) {
 setStep(step + 1);
 window.scrollTo(0, 0);
 }
 };

 const handleBack = () => {
 if (step > ProviderStep.ROLE_COUNTRY) {
 setStep(step - 1);
 window.scrollTo(0, 0);
 }
 };

 // Build profile payload from form data
 const buildProfilePayload = () => {
 const payload = new FormData();
 const isHealthcare = formData.roleCategory === 'HEALTHCARE';

 // Recursive helper to flatten objects/arrays into FormData
 const appendData = (data: unknown, rootKey: string) => {
 if (data instanceof File) {
 payload.append(rootKey, data);
 } else if (Array.isArray(data)) {
 data.forEach((value, index) => {
 appendData(value, `${rootKey}[${index}]`);
 });
 } else if (data && typeof data === 'object' && data !== null) {
 const record = data as Record<string, unknown>;
 Object.keys(record).forEach(key => {
 appendData(record[key], `${rootKey}[${key}]`);
 });
 } else {
 if (data === undefined || data === null) return;
 // Convert booleans to 1/0 for safe backend parsing
 const val = typeof data === 'boolean' ? (data ? '1' : '0') : String(data);
 payload.append(rootKey, val);
 }
 };

 // 1. Basic Info
 appendData(formData.firstName, 'firstName');
 appendData(formData.lastName, 'lastName');
 appendData(formData.country, 'country');
 appendData(formData.preferredLanguage, 'preferredLanguage');
 appendData(formData.nationalId, 'nationalId');
 appendData(formData.providerType, 'providerType');

 // Agency-specific fields
 if (formData.providerType === 'AGENCY_CLINIC') {
 appendData(formData.roleCategories, 'roleCategories');
 appendData(formData.roles, 'roles');
 // For agency, derive the primary 'role' from the first selected role
 const primaryRole = Array.isArray(formData.roles) && formData.roles.length > 0
 ? formData.roles[0]
 : formData.role;
 appendData(primaryRole, 'role');
 } else {
 appendData(formData.role, 'role');
 }
 if (formData.alliedHealthSpecialty) {
 appendData(formData.alliedHealthSpecialty, 'alliedHealthSpecialty');
 }

 // 2. Identity Documents
 if (formData.documents) {
 Object.entries(formData.documents).forEach(([key, doc]) => {
 if (Array.isArray(doc)) {
 doc.forEach((item, index: number) => {
 if (item?.file instanceof File) {
 payload.append(`documents[${key}][${index}]`, item.file);
 }
 });
 } else {
 const d = doc as Record<string, unknown>;
 if (d.file instanceof File) {
 payload.append(`documents[${key}]`, d.file);
 }
 }
 });
 }

 // 3. Credentials / Skills
 if (isHealthcare) {
 // Backend expects a single object for clinicalCredentials, NOT an array
 // Clone to avoid mutating state, and convert hobbies string to array
 const credentials = { ...formData.clinicalCredentials };
 if (typeof credentials.hobbies === 'string' && credentials.hobbies) {
 credentials.hobbies = credentials.hobbies.split(',').map((h: string) => h.trim()).filter(Boolean);
 }
 appendData(credentials, 'clinicalCredentials');
 } else {
 appendData(formData.supportSkills, 'supportSkills');
 }

 // 4. Preferences & Config
 appendData(formData.backgroundCheckConsent, 'backgroundCheckConsent');
 appendData(formData.vaccinationComplete, 'vaccinationComplete');
 appendData(formData.gender, 'gender');
 appendData(formData.languages, 'languages');

 const availability = {
 days: formData.availableDays,
 timeSlots: formData.availableTimeSlots,
 };
 appendData(availability, 'availability');

 appendData(formData.hourlyRate, 'hourlyRate');
 appendData(formData.maxDistanceKm, 'maxDistanceKm');
 appendData(formData.serviceLocation, 'serviceLocation');

 // 5. Profile & Induction
 // Send the actual File object so the backend receives a proper file upload
 if (formData.profilePhotoFile instanceof File) {
 payload.append('profilePhoto', formData.profilePhotoFile);
 } else if (formData.profilePhoto) {
 // Fallback: send the base64 string if no File object is available
 payload.append('profilePhoto', formData.profilePhoto);
 }

 appendData(formData.inductionVideoWatched, 'inductionVideoWatched');

 const quizAnswers = Object.entries(formData.quizAnswers || {}).map(([questionId, answer]) => ({
 questionId,
 answer
 }));
 appendData(quizAnswers, 'quizAnswers');

 const consents = {
 termsAccepted: formData.termsAccepted,
 codeOfConductAccepted: formData.codeOfConductAccepted,
 independentProviderAcknowledged: formData.independentProviderAcknowledged,
 marketingConsentGranted: formData.marketingConsentGranted,
 };
 appendData(consents, 'consents');

 appendData(true, 'onboardingComplete');

 return payload;
 };

 // Submit handler
 const handleSubmit = async () => {
 setIsSubmitting(true);

 try {
 // Build the complete profile payload
 const profilePayload = buildProfilePayload();

 // Send to /onboarding/complete API
 // The token is automatically handled by the axios interceptor in api.ts
 await completeOnboarding(profilePayload);

 // Clear draft
 localStorage.removeItem(STORAGE_KEYS.providerOnboardingDraft);

 // Show success step
 setStep(ProviderStep.COMPLETE);

 } catch (error: unknown) {
 console.error('Onboarding submission failed:', error);

 const apiError = extractApiError(error);

 if (apiError.statusCode === 422 || (apiError.statusCode === 400 && apiError.fieldErrors)) {
 const errorMessages = Object.values(apiError.fieldErrors || {}).flat();

 if (errorMessages.length > 0) {
 toast.error(errorMessages.join('\n'));
 } else {
 toast.error(apiError.message || 'Please check your input and try again.');
 }
 } else if (apiError.statusCode === 401) {
 toast.error('Session expired. Please try again.');
 setIsLoggedIn(false);
 } else if ((error as { code?: string }).code === 'ERR_NETWORK') {
 toast.error('Network error. Please check your connection.');
 } else {
 toast.error(apiError.message || 'Something went wrong. Please try again.');
 }
 } finally {
 setIsSubmitting(false);
 }
 };

 // Progress calculation
 const totalSteps = 6;
 const progress = step > 0 && step <= 6 ? (step / totalSteps) * 100 : 0;
 const isHealthcare = formData.roleCategory === 'HEALTHCARE';
 const STEPS = getSteps(formData.roleCategory);

 // Render step content
 const renderStep = () => {
 switch (step) {
 case ProviderStep.WELCOME:
 return <StepProviderWelcome onNext={() => setStep(ProviderStep.ROLE_COUNTRY)} />;
 case ProviderStep.ROLE_COUNTRY:
 return <StepRoleCountry data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case ProviderStep.IDENTITY:
 return <StepIdentity data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} isLoggedIn={isLoggedIn} />;
 case ProviderStep.CREDENTIALS:
 return isHealthcare
 ? <StepCredentialsClinical data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />
 : <StepSkillsSupport data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case ProviderStep.COMPLIANCE:
 return <StepCompliance data={formData} onUpdate={updateData} onNext={handleNext} onBack={handleBack} />;
 case ProviderStep.PROFILE_ACCOUNT:
 return (
 <StepProfileAccount
 data={formData}
 onUpdate={updateData}
 onNext={handleNext}
 onBack={handleBack}
 />
 );
 case ProviderStep.INDUCTION:
 return <StepInduction data={formData} onUpdate={updateData} onSubmit={handleSubmit} onBack={handleBack} isSubmitting={isSubmitting} isLoggedIn={isLoggedIn} />;
 case ProviderStep.COMPLETE:
 return (
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center text-center py-20 px-4 relative z-10"
 >
 {/* Confetti effect */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
 {[...Array(30)].map((_, i) => (
 <m.div
 key={`confetti-${i}`}
 initial={{
 opacity: 0,
 y: -50,
 x: Math.random() * 800 - 400,
 rotate: Math.random() * 360
 }}
 animate={{
 opacity: [0, 1, 0],
 y: 500,
 rotate: Math.random() * 720
 }}
 transition={{
 duration: 2.5 + Math.random() * 2,
 delay: Math.random() * 0.5,
 ease: "easeOut",
 repeat: 2,
 repeatDelay: 1
 }}
 className={`absolute top-0 left-1/2 size-3 rounded-full ${['bg-teal-400', 'bg-blue-400', 'bg-purple-400', 'bg-amber-400'][i % 4]}`}
 />
 ))}
 </div>

 <div className="relative mb-8">
 <div className="absolute inset-0 bg-teal-500/30 blur-[60px] rounded-full" />
 <m.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1 }}
 transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
 className="relative size-28 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/40 rotate-3"
 >
 <CheckCircle2 className="size-14 text-white" />
 </m.div>
 </div>

 <m.h2
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className="text-5xl font-semibold text-stone-900 mb-6 tracking-tight"
 >
 You're all set!
 </m.h2>

 <m.p
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 className="text-xl text-stone-600 mb-10 max-w-lg leading-relaxed"
 >
 Your provider profile has been created successfully. Welcome to the Raiyah Plus family!
 </m.p>

 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.6 }}
 className="flex flex-col sm:flex-row gap-4"
 >
 <Link to="/provider/dashboard">
 <m.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className="px-12 py-5 bg-stone-900 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:bg-stone-800 transition-all flex items-center gap-3"
 >
 <Sparkles className="size-5" />
 Go to Dashboard
 <ArrowRight className="size-5 opacity-70" />
 </m.button>
 </Link>
 </m.div>
 </m.div>
 );
 default:
 return null;
 }
 };

 // Welcome screen - full page with new design implementation
 if (step === ProviderStep.WELCOME) {
 return (
 <div className="min-h-screen bg-stone-50">
 <AnimatePresence mode="wait">
 <m.div
 key="welcome"
 variants={fadeVariants}
 initial="initial"
 animate="animate"
 exit="exit"
 className="h-full"
 >
 {renderStep()}
 </m.div>
 </AnimatePresence>
 </div>
 );
 }

 // Complete screen - full page
 if (step === ProviderStep.COMPLETE) {
 return (
 <div className="min-h-screen bg-stone-50 flex items-center justify-center relative overflow-hidden">
 <AnimatePresence mode="wait">
 <m.div
 key="complete"
 variants={fadeVariants}
 initial="initial"
 animate="animate"
 exit="exit"
 className="w-full"
 >
 {renderStep()}
 </m.div>
 </AnimatePresence>
 </div>
 );
 }

 // Main onboarding layout with sidebar
 return (
 <div className="min-h-screen flex bg-[#FAFAF9] font-sans">
 {/* Left Sidebar - Premium Design */}
 <div className="hidden lg:flex lg:w-[480px] bg-[#0B1120] text-white flex-col relative shadow-2xl z-20 sticky top-0 h-screen overflow-hidden border-r border-white/5">
 {/* Background Effects */}
 <div className="absolute inset-0 z-0 opacity-40">
 <div className="absolute top-0 right-0 size-[600px] bg-teal-900/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 mix-blend-screen" />
 <div className="absolute bottom-0 left-0 size-[500px] bg-blue-900/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 mix-blend-screen" />
 <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.07]" />
 </div>

 <div className="relative z-10 flex flex-col h-full p-12">
 {/* Header */}
 <div className="mb-14">
 <Link to="/" className="inline-block mb-12 hover:opacity-80 transition-opacity">
 <LogoLight size="md" showText={true} />
 </Link>

 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-teal-300 mb-6">
 <span className="size-1.5 rounded-full bg-teal-400 animate-pulse" />
 Provider Application
 </div>

 <h1 className="text-4xl font-semibold mb-4 tracking-tight leading-tight text-white">
 Partner Application
 </h1>
 <p className="text-stone-400 text-lg font-light leading-relaxed max-w-sm">
 Join our network of elite care professionals. Please complete all steps to verify your account.
 </p>
 </div>

 {/* Progress Steps - Focus Design */}
 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative pl-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
 <div className="flex flex-col">
 {STEPS.map((s, index) => {
 const isActive = step === s.id;
 const isComplete = step > s.id;
 const Icon = s.icon;

 return (
 <div key={s.id} className="relative flex gap-5">
 {/* Connector Line */}
 {index !== STEPS.length - 1 && (
 <div className={`absolute left-[22px] top-[50px] bottom-[-24px] w-[2px] rounded-full transition-colors duration-500 ${isComplete ? 'bg-teal-500' : 'bg-stone-800' }`} />
 )}

 {/* Icon / Node */}
 <div className="relative z-10 py-1">
 <div className={`size-12 rounded-full flex items-center justify-center border-[3px] transition-all duration-500 shadow-xl ${isComplete ? 'bg-teal-500 border-teal-500 text-white scale-90' : isActive ? 'bg-white border-white text-teal-900 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-stone-900 border-stone-700 text-stone-500 scale-90' }`}>
 {isComplete ? (
 <CheckCircle2 className="size-6" />
 ) : (
 <Icon className="size-5" />
 )}
 </div>
 </div>

 {/* Content */}
 <div className={`flex-1 pt-2 pb-8 transition-all duration-500 ${isActive ? 'translate-x-0 opacity-100' : 'translate-x-0'}`}>
 {isActive ? (
 // Active Card Design
 <m.div
 layoutId="activeCard"
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 -mt-2 -ml-2 shadow-2xl relative overflow-hidden group"
 >
 <div className="absolute inset-0 bg-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="relative z-10">
 <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-1 block">
 Current Step
 </span>
 <h3 className="text-xl font-semibold text-white mb-2 leading-tight">
 {s.label}
 </h3>
 <p className="text-sm text-stone-300 leading-relaxed">
 {s.description}
 </p>
 </div>
 </m.div>
 ) : (
 // Inactive / Completed Row
 <div className={`transition-all duration-300 ${isComplete ? 'opacity-50' : 'opacity-40 hover:opacity-70'}`}>
 <h3 className={`text-lg font-semibold ${isComplete ? 'text-teal-400 line-through decoration-teal-500/50' : 'text-stone-300'}`}>
 {s.label}
 </h3>
 {!isComplete && (
 <p className="text-sm text-stone-500 mt-0.5 max-w-[200px] truncate">
 {s.description}
 </p>
 )}
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Footer Infos */}
 <div className="mt-8 pt-8 border-t border-white/5">
 <div className="flex items-center justify-between text-xs text-stone-500 mb-6 font-medium">
 <span className="flex items-center gap-2">
 <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
 Systems Operational
 </span>
 <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5">
 <Shield className="size-3" />
 <span>SSL Secure</span>
 </div>
 </div>
 <button
 onClick={() => {
 // Use centralized logout to clear everything
 logout();
 }}
 className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-stone-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm font-bold tracking-wide uppercase"
 >
 <LogOut className="size-4" />
 Return to Login
 </button>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">

 {/* Mobile Header (Only visible on small screens) */}
 <div className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-stone-200 p-4 sticky top-0 z-50 flex flex-col gap-4 shadow-sm">
 <div className="flex items-center justify-between">
 <Logo size="sm" />
 <div className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 uppercase tracking-wide">
 Step {step} of {totalSteps}
 </div>
 </div>
 {/* Progress Bar */}
 <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden w-full">
 <m.div
 className="h-full bg-gradient-to-r from-teal-500 to-blue-500"
 initial={{ width: 0 }}
 animate={{ width: `${progress}%` }}
 />
 </div>
 </div>

 {/* Content Area */}
 <main className="flex-1 w-full relative p-4 md:p-8 lg:p-12 xl:p-16 flex flex-col">
 {/* Floating Background Shapes */}
 <div className="absolute top-0 right-0 -z-10 size-[800px] bg-gradient-to-br from-teal-50/50 to-blue-50/50 rounded-full blur-3xl opacity-60 translate-x-1/2 -translate-y-1/2 pointer-events-none" />

 {/* Content Container */}
 <m.div
 key={step}
 variants={fadeVariants}
 initial="initial"
 animate="animate"
 exit="exit"
 transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
 className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-center"
 >
 <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white ring-1 ring-stone-900/5 p-8 md:p-12 relative overflow-hidden">
 {/* Card Decor */}
 <div className="absolute top-0 right-0 size-32 bg-gradient-to-br from-teal-500/5 to-transparent rounded-bl-[2.5rem] pointer-events-none" />

 {renderStep()}
 </div>
 </m.div>

 <div className="text-center mt-8 text-stone-400 text-xs font-medium">
 &copy; 2025 Raiyah Plus. All rights reserved.
 </div>
 </main>
 </div>
 </div>
 );
}
