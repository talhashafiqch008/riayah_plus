
import { m, LazyMotion, domAnimation } from "framer-motion";
import { ArrowRight, MapPin, Languages, Users, User, HeartHandshake, Check, Briefcase } from "lucide-react";

// Country options
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

const ACCOUNT_TYPES = [
 {
 id: 'myself',
 title: 'Individual Account',
 subtitle: 'For Myself',
 description: 'I am looking for care or support for my own needs.',
 details: [] as string[],
 icon: User,
 color: 'bg-teal-100 text-teal-600'
 },
 {
 id: 'family_member',
 title: 'Family Guardian',
 subtitle: 'For My Family',
 description: 'I want to manage care for my parents, children, or relatives.',
 details: [
 'Request support and upload documents',
 'Stay informed about the care journey',
 'Cannot edit clinical records or care plans alone',
 ],
 icon: Users,
 color: 'bg-blue-100 text-blue-600'
 },
 {
 id: 'support_coordinator',
 title: 'Support Coordinator',
 subtitle: 'For Clients',
 description: 'I coordinate support for NDIS participants and clients.',
 details: [] as string[],
 icon: Briefcase,
 color: 'bg-purple-100 text-purple-600'
 }
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepCountryLanguageProps {
 data: Record<string, unknown>;
 onUpdate: (data: Record<string, unknown>) => void;
 onNext: () => void;
 onBack?: () => void;
 variant?: 'careseeker' | 'family';
}

export default function StepCountryLanguage({ data, onUpdate, onNext, variant = 'careseeker' }: StepCountryLanguageProps) {
 const showRoleDetails = variant === 'family';
 const isValid = data.country && data.preferredLanguage && data.careRecipientType;

 // Filter account types based on country
 // Support Coordinator is ONLY for Australia
 const visibleAccountTypes = ACCOUNT_TYPES.filter(type => {
 if (type.id === 'support_coordinator') {
 return data.country === 'AUS';
 }
 return true;
 });

 const handleCountrySelect = (code: string) => {
 const updates: Record<string, unknown> = { country: code };

 // If switching away from Australia, deselect Support Coordinator if selected
 if (code !== 'AUS' && data.careRecipientType === 'support_coordinator') {
 updates.careRecipientType = '';
 }

 onUpdate(updates);
 };

 return (
 <div className="space-y-10">

 <div className="grid md:grid-cols-2 gap-10">
 {/* 1. Country Selection (First) */}
 <m.div {...fadeIn} className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="size-10 bg-teal-50 rounded-full flex items-center justify-center">
 <MapPin className="size-5 text-teal-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">Location</h3>
 <p className="text-xs text-stone-500">Where are you based?</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 {COUNTRIES.map((country) => (
 <button
 key={country.code}
 onClick={() => handleCountrySelect(country.code)}
 className={`relative p-4 rounded-2xl border-2 transition-transform duration-300 text-center group ${data.country === country.code ? 'border-teal-500 bg-teal-600 text-white shadow-lg' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50' }`}
 >
 <span className="text-2xl block mb-1">{country.flag}</span>
 <span className={`text-sm font-bold uppercase tracking-wide ${data.country === country.code ? 'text-white' : 'text-stone-600'}`}>
 {country.label}
 </span>
 </button>
 ))}
 </div>
 </m.div>

 {/* 2. Language Selection */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="size-10 bg-teal-50 rounded-full flex items-center justify-center">
 <Languages className="size-5 text-teal-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">Language</h3>
 <p className="text-xs text-stone-500">Preferred for communication</p>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 {LANGUAGES.map((lang) => (
 <button
 key={lang.code}
 onClick={() => onUpdate({ preferredLanguage: lang.code })}
 className={`px-4 py-2 rounded-xl border-2 transition-transform duration-300 text-sm font-bold ${data.preferredLanguage === lang.code ? 'border-teal-500 bg-teal-600 text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50' }`}
 >
 {lang.label}
 </button>
 ))}
 </div>
 </m.div>
 </div>

 <div className="w-full h-px bg-stone-100"></div>

 {/* 3. Account Type Selection (Dependent on Country) */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }}>
 <div className="flex items-center gap-3 mb-6">
 <div className="size-12 bg-teal-100 rounded-2xl flex items-center justify-center rotate-3">
 <HeartHandshake className="size-6 text-teal-600" />
 </div>
 <div>
 <h2 className="text-2xl font-semibold text-stone-900 leading-none">Who needs care?</h2>
 <p className="text-stone-500 mt-1">Select the type of account you'd like to create.</p>
 </div>
 </div>

 <div className={`grid grid-cols-1 gap-4 ${visibleAccountTypes.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
 {visibleAccountTypes.map((type, index) => {
 const isSelected = data.careRecipientType === type.id;
 const Icon = type.icon;

 return (
 <m.button
 key={type.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 + index * 0.1 }}
 onClick={() => onUpdate({ careRecipientType: type.id })}
 whileHover={{ scale: 1.02, y: -2 }}
 whileTap={{ scale: 0.98 }}
 className={`relative flex flex-col items-start p-6 rounded-[24px] border-2 text-left transition-transform duration-300 h-full ${isSelected ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-100' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 hover:shadow-lg' }`}
 >
 <div className={`size-14 rounded-2xl mb-4 flex items-center justify-center transition-colors ${isSelected ? 'bg-teal-600 text-white' : type.color }`}>
 <Icon className="size-7" />
 </div>

 <div className="flex-1 w-full">
 <div className="flex justify-between items-start w-full">
 <span className={`text-xs font-bold uppercase tracking-wider mb-1 block ${isSelected ? 'text-stone-900' : 'text-stone-400'}`}>
 {type.subtitle}
 </span>
 {isSelected && <Check className="size-5 text-stone-900" />}
 </div>

 <h3 className={`text-lg font-semibold mb-2 text-stone-900`}>
 {type.title}
 </h3>
 <p className="text-sm text-stone-500 leading-relaxed">
 {type.description}
 </p>
 {showRoleDetails && type.details.length > 0 && (
 <ul className="mt-3 space-y-1.5">
 {type.details.map((line) => (
 <li key={line} className="text-xs text-stone-500 flex items-start gap-1.5">
 <span className="mt-1 size-1 rounded-full bg-teal-500 shrink-0" />
 <span>{line}</span>
 </li>
 ))}
 </ul>
 )}
 </div>
 </m.button>
 );
 })}
 </div>
 </m.div>

 {/* Continue Button */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.3 }}
 className="flex justify-end pt-6 border-t ring-1 ring-stone-100/50"
 >
 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className="px-8 py-4 bg-teal-600 text-white hover:bg-teal-700 font-bold rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
 >
 Continue
 <ArrowRight className="size-5" />
 </m.button>
 </m.div>
 </div>
 );
}
