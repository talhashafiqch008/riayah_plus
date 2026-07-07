
import { useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Stethoscope, Heart, MapPin, Languages, ChevronRight, Award, User, Building2, Activity, CheckSquare, Sparkles } from "lucide-react";
import { ProviderOnboardingData } from "../OnboardingPage";

// Provider Types
const PROVIDER_TYPES = [
 { id: 'INDIVIDUAL', label: 'Individual Specialist', icon: User, description: 'Freelancer or independent professional', color: 'from-blue-500 to-indigo-500' },
 { id: 'AGENCY_CLINIC', label: 'Clinic / Agency', icon: Building2, description: 'Registered facility employing multiple staff', color: 'from-purple-500 to-pink-500' },
];

// Healthcare roles
const HEALTHCARE_ROLES = [
 { id: 'NURSE', label: 'Nurse', icon: '👩‍⚕️', description: 'Registered or licensed nurse providing home-based care', color: 'bg-teal-50 border-teal-200 text-teal-700' },
 { id: 'ALLIED_HEALTH', label: 'Allied Health', icon: '🧠', description: 'Specialized therapeutic and rehabilitation services', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
];

// Allied Health Specialties
const ALLIED_HEALTH_SPECIALTIES = [
 "Arts Therapist", "Audiologist", "Chiropractor", "Counsellor",
 "Dietitian", "Exercise Physiologist", "Massage Therapist", "Music Therapist",
 "Occupational Therapist", "Optometrist", "Orthoptist", "Osteopath",
 "Physiotherapist", "Podiatrist", "Psychologist", "Social Worker",
 "Speech Therapist", "Behaviour Support Practitioner"
];

const AU_PROFESSIONS = [
 { id: 'OT', label: 'Occupational Therapist', icon: '🤲', description: 'AHPRA Registration' },
 { id: 'PHYSIO', label: 'Physiotherapist', icon: '💪', description: 'AHPRA Registration' },
 { id: 'PSYCH', label: 'Psychologist', icon: '🧠', description: 'AHPRA Registration' },
 { id: 'POD', label: 'Podiatrist', icon: '🦶', description: 'AHPRA Registration' },
 { id: 'NURSE', label: 'Nurse (RN / EN)', icon: '👩‍⚕️', description: 'AHPRA Registration' },
 { id: 'SPEECH', label: 'Speech Pathologist', icon: '🗣️', description: 'Certified Practising Speech Pathologist (CPSP)' },
 { id: 'DIET', label: 'Dietitian', icon: '🥗', description: 'Accredited Practising Dietitian (APD)' },
 { id: 'EP', label: 'Exercise Physiologist', icon: '🏃', description: 'Accredited Exercise Physiologist (AEP)' },
 { id: 'SW', label: 'Social Worker', icon: '🤝', description: 'Accredited Social Worker' },
 { id: 'MUSIC', label: 'Music Therapist', icon: '🎵', description: 'Registered Music Therapist (RMT)' },
 { id: 'ART', label: 'Art Therapist', icon: '🎨', description: 'Professional Member (ATh)' },
 { id: 'DEV_ED', label: 'Developmental Educator', icon: '📚', description: 'Full Member DEAI (Dev. Educators Aus Inc)' },
 { id: 'AUDIO', label: 'Audiologist', icon: '👂', description: 'Accredited Audiologist (AudA)' },
 { id: 'REHAB', label: 'Rehab Counsellor', icon: '🧘', description: 'Full Member ASORC or RCAA' },
 { id: 'ORTHO', label: 'Orthotist / Prosthetist', icon: '🦴', description: 'Certified Orthotist/Prosthetist' },
];

// Support roles
const SUPPORT_ROLES = [
 { id: 'SUPPORT_WORKER', label: 'Support Worker', icon: '🤝', description: 'Personal care, daily living, companionship', color: 'bg-amber-50 border-amber-200 text-amber-700' },
 { id: 'CHILDCARE', label: 'Childcare Provider', icon: '👶', description: 'Childcare, nanny, special needs support', color: 'bg-rose-50 border-rose-200 text-rose-700' },
 { id: 'CLEANER', label: 'Household Support', icon: '🏠', description: 'Cleaning, household assistance', color: 'bg-blue-50 border-blue-200 text-blue-700' },
 { id: 'GARDENER', label: 'Gardener', icon: '🌱', description: 'Garden maintenance and landscaping', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
 { id: 'DRIVER', label: 'Transport Assistant', icon: '🚗', description: 'Transport for appointments & outings', color: 'bg-stone-50 border-stone-200 text-stone-700' },
 { id: 'TRAINER', label: 'Trainer / Educator', icon: '🎓', description: 'Training, education, and skill development', color: 'bg-violet-50 border-violet-200 text-violet-700' },
];

const COUNTRIES = [
 { code: 'QAT', shortCode: 'QA', label: 'Qatar', flag: '🇶🇦' },
 { code: 'SAU', shortCode: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
 { code: 'EGY', shortCode: 'EG', label: 'Egypt', flag: '🇪🇬' },
 { code: 'AUS', shortCode: 'AU', label: 'Australia', flag: '🇦🇺' },
];

const LANGUAGES = [
 { code: 'ENGLISH', label: 'English', native: null },
 { code: 'ARABIC', label: 'Arabic', native: 'العربية' },
 { code: 'TAGALOG', label: 'Tagalog', native: null },
 { code: 'HINDI', label: 'Hindi', native: 'हिन्दी' },
 { code: 'URDU', label: 'Urdu', native: 'اردو' },
 { code: 'MALAYALAM', label: 'Malayalam', native: 'മലയാളം' },
 { code: 'BENGALI', label: 'Bengali', native: 'বাংলা' },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
 exit: { opacity: 0, y: -10 }
};

interface StepRoleCountryProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onNext: () => void;
 onBack: () => void;
}

import { useCountry } from "../../../contexts/CountryContext";

export default function StepRoleCountry({ data, onUpdate, onNext, onBack }: StepRoleCountryProps) {
 const { isAustralia, country } = useCountry();
 const isAgency = data.providerType === 'AGENCY_CLINIC';

 // Auto-fill country from Context if not set in form data
 useEffect(() => {
 if (!data.country && country) {

 let code = country;
 if (country === 'AU') code = 'AUS'; // Map AU to AUS just in case
 if (country === 'SA') code = 'SAU'; // Map SA to SAU

 // Only update if it's one of our supported onboarding countries
 if (['QAT', 'EGY', 'AUS', 'SAU'].includes(code)) {
 onUpdate({ country: code });
 }
 }
 }, [country, data.country, onUpdate]);

 // Helpers to handle single/multi select depending on Provider Type
 const selectedCategories = isAgency
 ? (Array.isArray(data.roleCategories) ? data.roleCategories : [])
 : (data.roleCategory ? [data.roleCategory] : []);

 const selectedRoles = isAgency
 ? (Array.isArray(data.roles) ? data.roles : [])
 : (data.role ? [data.role] : []);

 // Check if Allied Health is selected (in either mode)
 const isAlliedHealthSelected = isAgency
 ? selectedRoles.includes('ALLIED_HEALTH')
 : data.role === 'ALLIED_HEALTH';

 // Validation
 const isProviderTypeSelected = !!data.providerType;
 const hasCategory = selectedCategories.length > 0;
 const hasRole = selectedRoles.length > 0;
 const hasSpecialty = !isAlliedHealthSelected || (isAlliedHealthSelected && !!data.alliedHealthSpecialty);

 const isLocationSelected = !!data.country && !!data.preferredLanguage;
 const isValid = isProviderTypeSelected && hasCategory && hasRole && isLocationSelected;


 // Handlers
 const handleCategorySelect = (category: 'HEALTHCARE' | 'SUPPORT') => {
 if (isAgency) {
 // Multi-select logic
 let newCats = [...selectedCategories];
 if (newCats.includes(category)) {
 newCats = newCats.filter(c => c !== category);
 // Also remove roles belonging to this category? roughly
 // keeping it simple: just update categories
 } else {
 newCats.push(category);
 }
 onUpdate({ roleCategories: newCats });
 } else {
 // Single select logic
 if (data.roleCategory !== category) {
 onUpdate({ roleCategory: category, role: '', alliedHealthSpecialty: '' });
 } else {
 onUpdate({ roleCategory: category });
 }
 }
 };

 const handleRoleSelect = (roleId: string) => {
 if (isAgency) {
 // Multi-select logic
 let newRoles = [...selectedRoles];
 if (newRoles.includes(roleId)) {
 newRoles = newRoles.filter(r => r !== roleId);
 } else {
 newRoles.push(roleId);
 }
 onUpdate({ roles: newRoles });
 } else {
 // Single select logic
 if (data.role !== roleId) {
 onUpdate({ role: roleId, alliedHealthSpecialty: '' });
 }
 }
 };

 return (
 <div className="space-y-12">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200/50 ring-4 ring-teal-50">
 <Award className="size-7 text-white" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">Define Your Profile</h2>
 <p className="text-stone-500 text-lg">
 {isAgency ? 'Configure your agency services.' : 'Select your professional designation.'}
 </p>
 </div>
 </div>
 </m.div>

 {/* 1. Location & Language */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-6">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">1</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Where are you based?
 </h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Country */}
 <div className="space-y-4">
 <span className="text-sm font-bold text-stone-700 uppercase tracking-wide">Select Country</span>
 <div className="grid grid-cols-2 gap-4">
 {/* TODO: Consider combining iterations */}
 {COUNTRIES.filter(c => isAustralia ? c.code === 'AUS' : c.code !== 'AUS').map((country) => {
 const isSelected = data.country === country.code;
 return (
 <m.button
 key={country.code}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => onUpdate({
 country: country.code,
 role: '',
 roles: [],
 alliedHealthSpecialty: ''
 })}
 className={`flex-1 flex flex-col items-center justify-center p-6 rounded-3xl border transition-all ${isSelected ? 'border-transparent bg-stone-900 text-white shadow-xl shadow-stone-200' : 'border-stone-200 bg-white hover:border-stone-300 text-stone-600 hover:shadow-md' }`}
 >
 <span className="text-4xl mb-3 drop-shadow-sm">{country.flag}</span>
 <span className="font-bold text-base tracking-wide">{country.label}</span>
 </m.button>
 );
 })}
 </div>
 </div>

 {/* Language */}
 <div className="space-y-4">
 <span className="text-sm font-bold text-stone-700 uppercase tracking-wide">Primary Language</span>
 <div className="flex flex-wrap gap-3">
 {LANGUAGES.map((lang) => {
 const isSelected = data.preferredLanguage === lang.code;
 return (
 <button
 key={lang.code}
 onClick={() => onUpdate({ preferredLanguage: lang.code })}
 className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${isSelected ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-transparent shadow-lg shadow-teal-200' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:shadow-sm' }`}
 >
 {lang.label}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </m.div>

 {/* 2. Provider Type */}
 {data.country && (
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-6 pt-8 border-t border-stone-100">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">2</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Are you an individual or an organization?
 </h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {PROVIDER_TYPES.map((type) => {
 const isSelected = data.providerType === type.id;
 const Icon = type.icon;
 return (
 <m.button
 key={type.id}
 onClick={() => {
 // Reset specific selections when type changes
 onUpdate({
 providerType: type.id,
 roleCategory: '', roleCategories: [],
 role: '', roles: [],
 alliedHealthSpecialty: ''
 });
 }}
 whileHover={{ scale: 1.02, y: -4 }}
 whileTap={{ scale: 0.98 }}
 className={`relative p-1 rounded-3xl text-left transition-all duration-300 h-full group ${isSelected ? 'bg-gradient-to-br from-stone-900 to-stone-800 shadow-xl shadow-stone-200' : 'bg-white hover:bg-stone-50' }`}
 >
 <div className={`relative h-full p-6 rounded-[22px] ${isSelected ? 'bg-transparent' : 'bg-white border-2 border-stone-100 group-hover:border-stone-200'} flex flex-col`}>
 <div className="flex items-start justify-between mb-4">
 <div className={`p-3.5 rounded-2xl ${isSelected
 ? `bg-white/10 text-white`
 : `bg-gradient-to-br ${type.color} text-white shadow-md`
 }`}>
 <Icon className="size-6" />
 </div>
 {isSelected && (
 <div className="size-6 bg-white rounded-full flex items-center justify-center">
 <Check className="size-3.5 text-stone-900 stroke-[3px]" />
 </div>
 )}
 </div>

 <h4 className={`text-lg font-semibold mb-1 ${isSelected ? 'text-white' : 'text-stone-900'}`}>{type.label}</h4>
 <p className={`text-sm leading-relaxed ${isSelected ? 'text-stone-400' : 'text-stone-500'}`}>{type.description}</p>
 </div>
 </m.button>
 );
 })}
 </div>
 </m.div>
 )}

 {/* 2. Category Selection (Hero Cards) */}
 <AnimatePresence>
 {data.providerType && (
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-6 pt-8 border-t border-stone-100">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">3</span>
 <h3 className="text-xl font-semibold text-stone-900">
 {isAgency ? 'Select service categories' : 'Choose your path'}
 </h3>
 </div>
 {isAgency && <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">Multi-select allowed</span>}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Healthcare Card */}
 <m.button
 onClick={() => handleCategorySelect('HEALTHCARE')}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`relative overflow-hidden p-8 rounded-[2rem] text-left transition-all duration-300 group shadow-lg ${selectedCategories.includes('HEALTHCARE') ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/30' : 'bg-white border-2 border-stone-100 hover:border-teal-200 text-stone-900 shadow-stone-100' }`}
 >
 <div className="absolute top-0 right-0 size-48 bg-white/10 rounded-full blur-[50px] -mr-12 -mt-12 pointer-events-none" />

 <div className="relative z-10 flex flex-col h-full">
 <div className={`size-14 rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm ${selectedCategories.includes('HEALTHCARE') ? 'bg-white/20 backdrop-blur-md text-white' : 'bg-teal-50 text-teal-600' }`}>
 <Stethoscope className="size-7" />
 </div>
 <h4 className="text-2xl font-semibold mb-2">Healthcare Professional</h4>
 <p className={`text-sm mb-6 ${selectedCategories.includes('HEALTHCARE') ? 'text-teal-50' : 'text-stone-500'}`}>Licensed nurses, therapists, and medical specialists.</p>

 <div className="mt-auto flex items-center gap-2">
 {isAgency ? (
 <div className={`flex items-center gap-2 text-sm font-bold bg-white/20 backdrop-blur-sm pl-2 pr-3 py-1.5 rounded-lg w-fit ${selectedCategories.includes('HEALTHCARE') ? 'text-white' : 'text-stone-400 bg-stone-50'}`}>
 {selectedCategories.includes('HEALTHCARE') ? <CheckSquare className="size-4" /> : <div className="size-4 rounded border-2 border-stone-300" />}
 {selectedCategories.includes('HEALTHCARE') ? 'Selected' : 'Select'}
 </div>
 ) : (
 <div className={`flex items-center text-sm font-bold transition-all ${selectedCategories.includes('HEALTHCARE') ? 'text-white' : 'text-teal-600 group-hover:translate-x-1'}`}>
 {selectedCategories.includes('HEALTHCARE') ? 'Selected' : 'Select Category'}
 <ChevronRight className={`size-4 ml-1 ${selectedCategories.includes('HEALTHCARE') ? 'hidden' : 'block'}`} />
 {selectedCategories.includes('HEALTHCARE') && <Check className="size-4 ml-1" />}
 </div>
 )}
 </div>
 </div>
 </m.button>

 {/* Support Card */}
 <m.button
 onClick={() => handleCategorySelect('SUPPORT')}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`relative overflow-hidden p-8 rounded-[2rem] text-left transition-all duration-300 group shadow-lg ${selectedCategories.includes('SUPPORT') ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30' : 'bg-white border-2 border-stone-100 hover:border-blue-200 text-stone-900 shadow-stone-100' }`}
 >
 <div className="absolute top-0 right-0 size-48 bg-white/10 rounded-full blur-[50px] -mr-12 -mt-12 pointer-events-none" />

 <div className="relative z-10 flex flex-col h-full">
 <div className={`size-14 rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm ${selectedCategories.includes('SUPPORT') ? 'bg-white/20 backdrop-blur-md text-white' : 'bg-blue-50 text-blue-600' }`}>
 <Heart className="size-7" />
 </div>
 <h4 className="text-2xl font-semibold mb-2">Support Worker</h4>
 <p className={`text-sm mb-6 ${selectedCategories.includes('SUPPORT') ? 'text-blue-50' : 'text-stone-500'}`}>Caregivers, nannies, and household assistance.</p>

 <div className="mt-auto flex items-center gap-2">
 {isAgency ? (
 <div className={`flex items-center gap-2 text-sm font-bold bg-white/20 backdrop-blur-sm pl-2 pr-3 py-1.5 rounded-lg w-fit ${selectedCategories.includes('SUPPORT') ? 'text-white' : 'text-stone-400 bg-stone-50'}`}>
 {selectedCategories.includes('SUPPORT') ? <CheckSquare className="size-4" /> : <div className="size-4 rounded border-2 border-stone-300" />}
 {selectedCategories.includes('SUPPORT') ? 'Selected' : 'Select'}
 </div>
 ) : (
 <div className={`flex items-center text-sm font-bold transition-all ${selectedCategories.includes('SUPPORT') ? 'text-white' : 'text-blue-600 group-hover:translate-x-1'}`}>
 {selectedCategories.includes('SUPPORT') ? 'Selected' : 'Select Category'}
 <ChevronRight className={`size-4 ml-1 ${selectedCategories.includes('SUPPORT') ? 'hidden' : 'block'}`} />
 {selectedCategories.includes('SUPPORT') && <Check className="size-4 ml-1" />}
 </div>
 )}
 </div>
 </div>
 </m.button>
 </div>
 </m.div>
 )}
 </AnimatePresence>

 {/* 3. Specific Role Selection */}
 <AnimatePresence mode="wait">
 {selectedCategories.length > 0 && (
 <m.div
 key="role-selection"
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="space-y-6 pt-4"
 >
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">4</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Select desired services
 </h3>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {/* Healthcare Roles - Logic split for AUS vs Others */}
 {selectedCategories.includes('HEALTHCARE') && (
 data.country === 'AUS' ? (
 // Australian Professions
 AU_PROFESSIONS.map((role) => {
 const isSelected = selectedRoles.includes(role.id);
 return (
 <m.button
 key={role.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 onClick={() => handleRoleSelect(role.id)}
 className={`group flex items-start gap-4 p-5 rounded-3xl border text-left transition-all hover:shadow-lg ${isSelected
 ? `ring-2 ring-teal-500 border-transparent shadow-md bg-teal-50`
 : 'border-stone-100 bg-white hover:border-teal-100'
 }`}
 >
 <div className="text-3xl pt-1 drop-shadow-sm group-hover:scale-110 transition-transform">{role.icon}</div>
 <div className="flex-1">
 <div className="flex justify-between items-center mb-1">
 <h4 className={`font-semibold text-base ${isSelected ? 'text-teal-900' : 'text-stone-800'}`}>{role.label}</h4>
 {isSelected && <div className="size-5 bg-teal-500 rounded-full flex items-center justify-center"><Check className="size-3 text-white" /></div>}
 </div>
 <p className="text-xs text-stone-500 leading-relaxed font-medium">{role.description}</p>
 </div>
 </m.button>
 );
 })
 ) : (
 // Standard Healthcare Roles
 HEALTHCARE_ROLES.map((role) => {
 const isSelected = selectedRoles.includes(role.id);
 return (
 <m.button
 key={role.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 onClick={() => handleRoleSelect(role.id)}
 className={`group flex items-start gap-4 p-5 rounded-3xl border text-left transition-all hover:shadow-lg ${isSelected
 ? `ring-2 ring-teal-500 border-transparent shadow-md bg-teal-50`
 : 'border-stone-100 bg-white hover:border-teal-100'
 }`}
 >
 <div className="text-3xl pt-1 drop-shadow-sm group-hover:scale-110 transition-transform">{role.icon}</div>
 <div className="flex-1">
 <div className="flex justify-between items-center mb-1">
 <h4 className={`font-semibold text-base ${isSelected ? 'text-teal-900' : 'text-stone-800'}`}>{role.label}</h4>
 {isSelected && <div className="size-5 bg-teal-500 rounded-full flex items-center justify-center"><Check className="size-3 text-white" /></div>}
 </div>
 <p className="text-xs text-stone-500 leading-relaxed font-medium">{role.description}</p>
 </div>
 </m.button>
 );
 })
 )
 )}

 {/* Support Roles */}
 {selectedCategories.includes('SUPPORT') && SUPPORT_ROLES.map((role) => {
 const isSelected = selectedRoles.includes(role.id);
 return (
 <m.button
 key={role.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 onClick={() => handleRoleSelect(role.id)}
 className={`group flex items-start gap-4 p-5 rounded-3xl border text-left transition-all hover:shadow-lg ${isSelected
 ? `ring-2 ring-blue-500 border-transparent shadow-md bg-blue-50`
 : 'border-stone-100 bg-white hover:border-blue-100'
 }`}
 >
 <div className="text-3xl pt-1 drop-shadow-sm group-hover:scale-110 transition-transform">{role.icon}</div>
 <div className="flex-1">
 <div className="flex justify-between items-center mb-1">
 <h4 className={`font-semibold text-base ${isSelected ? 'text-blue-900' : 'text-stone-800'}`}>{role.label}</h4>
 {isSelected && <div className="size-5 bg-blue-500 rounded-full flex items-center justify-center"><Check className="size-3 text-white" /></div>}
 </div>
 <p className="text-xs text-stone-500 leading-relaxed font-medium">{role.description}</p>
 </div>
 </m.button>
 );
 })}
 </div>
 </m.div>
 )}
 </AnimatePresence>

 {/* 3.5 Allied Health Specialists (Nested) */}
 <AnimatePresence>
 {isAlliedHealthSelected && (
 <m.div
 key="allied-specialty"
 initial={{ opacity: 0, y: -20, height: 0 }}
 animate={{ opacity: 1, y: 0, height: 'auto' }}
 exit={{ opacity: 0, y: -20, height: 0 }}
 className="bg-gradient-to-br from-cyan-50 to-blue-50 p-8 rounded-3xl border border-cyan-100 space-y-6"
 >
 <h4 className="flex items-center gap-3 text-cyan-900 font-semibold text-lg">
 <div className="p-2 bg-cyan-100 rounded-lg">
 <Activity className="size-5 text-cyan-600" />
 </div>
 Specific Allied Health Specialty
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {ALLIED_HEALTH_SPECIALTIES.map((spec) => {
 const isSelected = data.alliedHealthSpecialty === spec;
 return (
 <button
 key={spec}
 onClick={() => onUpdate({ alliedHealthSpecialty: spec })}
 className={`px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all ${isSelected ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200 ring-2 ring-cyan-400 ring-offset-2 ring-offset-cyan-50' : 'bg-white/80 text-stone-600 hover:bg-white hover:text-cyan-700 hover:shadow-md' }`}
 >
 {spec}
 </button>
 );
 })}
 </div>
 </m.div>
 )}
 </AnimatePresence>



 {/* Navigation */}
 <m.div
 className="flex justify-end items-center pt-8 border-t border-stone-50"
 >
 <div className="flex-1 text-xs text-stone-400 font-medium px-2">
 {isValid ? (
 <span className="text-teal-600 flex items-center gap-1.5 animate-pulse bg-teal-50 w-fit px-3 py-1 rounded-full">
 <Sparkles className="size-3" />
 Ready to continue
 </span>
 ) : 'Please complete all selections'}
 </div>

 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02, x: 5 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-3 ${isValid ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-300 hover:shadow-xl' : 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none' }`}
 >
 Continue
 <ArrowRight className="size-5" />
 </m.button>
 </m.div>
 </div>
 );
}

// Export role lists for use in other components
export { AU_PROFESSIONS };
