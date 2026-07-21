
import { m, LazyMotion, domAnimation } from "framer-motion";
import {
 ArrowRight, ArrowLeft, Check,
 User, Users, UserRound,
 Languages, MapPin, Heart,
 Home, Globe, MonitorSmartphone
} from "lucide-react";

// Professional options with consistent Lucide icons
const GENDER_OPTIONS = [
 {
 id: 'female_only',
 label: 'Female',
 description: 'Female provider only',
 icon: UserRound,
 color: 'bg-rose-100 text-rose-600',
 ringColor: 'ring-rose-50',
 borderColor: 'border-rose-200'
 },
 {
 id: 'male_only',
 label: 'Male',
 description: 'Male provider only',
 icon: UserRound,
 color: 'bg-blue-100 text-blue-600',
 ringColor: 'ring-blue-50',
 borderColor: 'border-blue-200'
 },
 {
 id: 'no_preference',
 label: 'No Preference',
 description: 'Either is fine',
 icon: Users,
 color: 'bg-indigo-100 text-indigo-600',
 ringColor: 'ring-indigo-50',
 borderColor: 'border-indigo-200'
 },
];

const LANGUAGE_OPTIONS = [
 { code: 'Arabic', label: 'العربية', enLabel: 'Arabic', flag: '🇸🇦' },
 { code: 'English', label: 'English', enLabel: 'English', flag: '🇬🇧' },
 { code: 'Tagalog', label: 'Tagalog', enLabel: 'Tagalog', flag: '🇵🇭' },
 { code: 'Hindi', label: 'हिन्दी', enLabel: 'Hindi', flag: '🇮🇳' },
 { code: 'Urdu', label: 'اردو', enLabel: 'Urdu', flag: '🇵🇰' },
 { code: 'Bengali', label: 'বাংলা', enLabel: 'Bengali', flag: '🇧🇩' },
 { code: 'Malayalam', label: 'മലയാളം', enLabel: 'Malayalam', flag: '🇮🇳' },
];

const LOCATION_OPTIONS = [
 {
 id: 'home',
 label: 'At Home',
 description: 'Provider comes to you',
 icon: Home,
 color: 'bg-emerald-100 text-emerald-600',
 borderColor: 'border-emerald-200'
 },
 {
 id: 'remote',
 label: 'Virtual',
 description: 'Online video calls',
 icon: MonitorSmartphone,
 color: 'bg-sky-100 text-sky-600',
 borderColor: 'border-sky-200'
 },
 {
 id: 'both',
 label: 'Flexible',
 description: 'Any location works',
 icon: MapPin,
 color: 'bg-amber-100 text-amber-600',
 borderColor: 'border-amber-200'
 },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepPreferencesProps {
 data: Record<string, unknown>;
 onUpdate: (data: Record<string, unknown>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepPreferences({ data, onUpdate, onNext, onBack }: StepPreferencesProps) {
 const selectedLanguages: string[] = (data.languages as string[]) || [];

 const toggleLanguage = (lang: string) => {
 const newLanguages = selectedLanguages.includes(lang)
 ? selectedLanguages.filter(l => l !== lang)
 : [...selectedLanguages, lang];
 onUpdate({ languages: newLanguages });
 };

 const isValid = data.practitionerGender && data.careLocation;

 return (
 <div className="space-y-10">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-3 mb-2">
 <div className="size-12 bg-teal-100 rounded-2xl flex items-center justify-center rotate-3">
 <Heart className="size-6 text-teal-600" />
 </div>
 <div>
 <h2 className="text-2xl font-semibold text-stone-900 leading-none">Provider Preferences</h2>
 <p className="text-stone-500 mt-1">Customize your ideal care provider.</p>
 </div>
 </div>
 </m.div>

 {/* Provider Gender */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }}>
 <div className="flex items-center gap-2 mb-4">
 <User className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Provider Gender</h3>
 <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wide">Required</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {GENDER_OPTIONS.map((option, index) => {
 const isSelected = data.practitionerGender === option.id;
 const Icon = option.icon;

 return (
 <m.button
 key={option.id}
 onClick={() => onUpdate({ practitionerGender: option.id })}
 whileHover={{ scale: 1.02, y: -2 }}
 whileTap={{ scale: 0.98 }}
 transition={{ delay: index * 0.05 }}
 className={`relative p-5 rounded-[24px] border-2 text-center transition-transform duration-300 flex flex-col items-center ${isSelected
 ? `border-stone-900 bg-stone-50 ring-2 ring-offset-1 ${option.ringColor}`
 : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 hover:shadow-lg'
 }`}
 >
 <div className={`size-14 rounded-full flex items-center justify-center mb-3 transition-colors ${isSelected ? 'bg-teal-600 text-white' : option.color }`}>
 <Icon className="size-6" strokeWidth={2.5} />
 </div>
 <span className={`font-bold text-lg mb-1 ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
 {option.label}
 </span>
 <span className="text-xs text-stone-400">{option.description}</span>

 {isSelected && (
 <div className="absolute top-4 right-4 text-stone-900">
 <Check className="size-5" strokeWidth={3} />
 </div>
 )}
 </m.button>
 );
 })}
 </div>
 </m.div>

 {/* Provider Languages */}
 <m.div {...fadeIn} transition={{ delay: 0.15 }}>
 <div className="flex items-center gap-2 mb-4">
 <Languages className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Spoken Languages</h3>
 <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full uppercase tracking-wide">Optional</span>
 </div>
 <div className="flex flex-wrap gap-3">
 {LANGUAGE_OPTIONS.map((lang, index) => {
 const isSelected = selectedLanguages.includes(lang.code);
 return (
 <m.button
 key={lang.code}
 onClick={() => toggleLanguage(lang.code)}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className={`group px-5 py-3 rounded-2xl border-2 text-sm font-medium transition-transform duration-300 flex items-center gap-3 ${isSelected ? 'border-teal-500 bg-teal-600 text-white shadow-lg shadow-stone-200' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'}`}
 >
 <span className="text-xl leading-none grayscale group-hover:grayscale-0 transition-transform duration-300">{lang.flag}</span>
 <div className="flex flex-col items-start -gap-0.5">
 <span>{lang.label}</span>
 {lang.label !== lang.enLabel && (
 <span className={`text-[10px] ${isSelected ? 'text-stone-400' : 'text-stone-400'}`}>
 {lang.enLabel}
 </span>
 )}
 </div>
 {isSelected && <Check className="size-4 ml-1" />}
 </m.button>
 );
 })}
 </div>
 </m.div>

 {/* Care Location */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }}>
 <div className="flex items-center gap-2 mb-4">
 <MapPin className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Care Location</h3>
 <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wide">Required</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {LOCATION_OPTIONS.map((option, index) => {
 const isSelected = data.careLocation === option.id;
 const Icon = option.icon;

 return (
 <m.button
 key={option.id}
 onClick={() => onUpdate({ careLocation: option.id })}
 whileHover={{ scale: 1.02, y: -2 }}
 whileTap={{ scale: 0.98 }}
 className={`relative p-5 rounded-[24px] border-2 text-left transition-transform duration-300 ${isSelected ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-100' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 hover:shadow-lg' }`}
 >
 <div className={`size-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isSelected ? 'bg-teal-600 text-white' : option.color }`}>
 <Icon className="size-6" />
 </div>

 <span className={`font-bold text-lg block mb-1 ${isSelected ? 'text-stone-900' : 'text-stone-800'}`}>
 {option.label}
 </span>
 <span className="text-xs text-stone-500">{option.description}</span>

 {isSelected && (
 <div className="absolute top-5 right-5 text-stone-900">
 <Check className="size-5" strokeWidth={3} />
 </div>
 )}
 </m.button>
 );
 })}
 </div>
 </m.div>

 {/* Address Input Animation */}
 <m.div>
 {data.careLocation === 'home' && (
 <m.div
 initial={{ opacity: 0, height: 0, y: -10 }}
 animate={{ opacity: 1, height: 'auto', y: 0 }}
 className="overflow-hidden"
 >
 <div className="pt-2">
 <label htmlFor="street-address---area" className="block text-sm font-bold text-stone-700 mb-2 ml-1">Street Address / Area</label>
 <div className="relative">
 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
 <input id="street-address---area"
 type="text"
 value={(data.address as string) || ''}
 onChange={(e) => onUpdate({ address: e.target.value })}
 placeholder="e.g. West Bay, Doha..."
 className="w-full p-4 pl-12 border-2 border-stone-200 rounded-2xl focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-100 transition-transform duration-300 bg-white"
 />
 </div>
 </div>
 </m.div>
 )}
 </m.div>

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.25 }}
 className="flex justify-between items-center pt-8 border-t ring-1 ring-stone-100/50"
 >
 <button
 onClick={onBack}
 className="group flex items-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors px-4 py-2 rounded-xl hover:bg-stone-100"
 >
 <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
 Back
 </button>
 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className="px-8 py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
 >
 Continue
 <ArrowRight className="size-5" />
 </m.button>
 </m.div>
 </div>
 );
}
