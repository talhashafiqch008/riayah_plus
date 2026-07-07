
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Shield, MapPin, Clock, Check, CheckCircle, User, Globe, Calculator, Sparkles, Sun, Moon, Sunrise, Sunset, Home, Laptop } from "lucide-react";
import { useState, useEffect } from "react";
import type { ProviderOnboardingData } from "../OnboardingPage";

const DAYS_OF_WEEK = [
 { id: 'sun', label: 'Sun' },
 { id: 'mon', label: 'Mon' },
 { id: 'tue', label: 'Tue' },
 { id: 'wed', label: 'Wed' },
 { id: 'thu', label: 'Thu' },
 { id: 'fri', label: 'Fri' },
 { id: 'sat', label: 'Sat' },
];

const TIME_SEGMENTS = [
 { id: 'morning', label: 'Morning', time: '6AM - 12PM', icon: Sunrise, color: 'from-orange-100 to-amber-50', activeColor: 'from-orange-400 to-amber-500', iconColor: 'text-orange-600' },
 { id: 'afternoon', label: 'Afternoon', time: '12PM - 6PM', icon: Sun, color: 'from-amber-100 to-yellow-50', activeColor: 'from-amber-400 to-yellow-500', iconColor: 'text-amber-600' },
 { id: 'evening', label: 'Evening', time: '6PM - 10PM', icon: Sunset, color: 'from-indigo-100 to-purple-50', activeColor: 'from-indigo-500 to-purple-500', iconColor: 'text-indigo-600' },
 { id: 'overnight', label: 'Overnight', time: '10PM - 6AM', icon: Moon, color: 'from-stone-100 to-stone-50', activeColor: 'from-stone-700 to-stone-900', iconColor: 'text-stone-600' },
];

const LANGUAGES = [
 { code: 'Arabic', label: 'العربية', flag: '🇸🇦' },
 { code: 'English', label: 'English', flag: '🇬🇧' },
 { code: 'Tagalog', label: 'Tagalog', flag: '🇵🇭' },
 { code: 'Hindi', label: 'हिन्दी', flag: '🇮🇳' },
 { code: 'Urdu', label: 'اردو', flag: '🇵🇰' },
 { code: 'Bengali', label: 'বাংলা', flag: '🇧🇩' },
 { code: 'Malayalam', label: 'മലയാളം', flag: '🇮🇳' },
];

const SERVICE_LOCATIONS = [
 { id: 'home_visits', label: 'Home Visits', description: 'Travel to client homes', icon: Home },
 { id: 'remote', label: 'Remote Only', description: 'Online care services', icon: Laptop },
 { id: 'both', label: 'Hybrid', description: 'Both in-person & online', icon: Globe },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepComplianceProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepCompliance({ data, onUpdate, onNext, onBack }: StepComplianceProps) {
 const selectedDays: string[] = data.availableDays || [];
 const selectedTimeSlots: string[] = data.availableTimeSlots || [];
 const selectedLanguages: string[] = data.languages || [];

 // Calculate potential weekly earnings (Gamification)
 const hourlyRate = data.hourlyRate || 0;
 const daysCount = selectedDays.length || 0;
 const hoursPerDayEstimate = selectedTimeSlots.length * 4; // Approx 4 hours per slot
 const potentialWeekly = hourlyRate * daysCount * hoursPerDayEstimate;

 const toggleDay = (day: string) => {
 const newDays = selectedDays.includes(day)
 ? selectedDays.filter(d => d !== day)
 : [...selectedDays, day];
 onUpdate({ availableDays: newDays });
 };

 const toggleTimeSlot = (slot: string) => {
 const newSlots = selectedTimeSlots.includes(slot)
 ? selectedTimeSlots.filter(s => s !== slot)
 : [...selectedTimeSlots, slot];
 onUpdate({ availableTimeSlots: newSlots });
 };

 const toggleLanguage = (lang: string) => {
 const newLangs = selectedLanguages.includes(lang)
 ? selectedLanguages.filter(l => l !== lang)
 : [...selectedLanguages, lang];
 onUpdate({ languages: newLangs });
 };

 const isValid = data.gender && data.serviceLocation;

 return (
 <div className="space-y-12">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 ring-4 ring-emerald-50">
 <Shield className="size-7 text-white" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">Work Preferences</h2>
 <p className="text-stone-500 text-lg">Customize your schedule and service area.</p>
 </div>
 </div>
 </m.div>

 {/* 1. Basic Info & Languages */}
 <div className="grid grid-cols-1 gap-8">
 {/* Gender - redesigned as cards */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-4">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-6 rounded-full bg-stone-900 text-white font-bold text-xs">1</span>
 <h3 className="font-semibold text-stone-900">Basic Information</h3>
 </div>

 <div className="grid grid-cols-2 gap-4">
 {[
 { id: 'male', label: 'Male', icon: User },
 { id: 'female', label: 'Female', icon: User },
 ].map((option) => {
 const isSelected = data.gender === option.id;
 const Icon = option.icon;
 return (
 <button
 key={option.id}
 onClick={() => onUpdate({ gender: option.id })}
 className={`relative group overflow-hidden rounded-2xl p-4 border-2 transition-all duration-300 flex items-center gap-4 ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500/20' : 'border-stone-100 bg-white hover:border-emerald-200 hover:bg-stone-50' }`}
 >
 <span className={`text-3xl rounded-full p-2 shadow-sm ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
 <Icon className="size-6" />
 </span>
 <div className="text-left">
 <div className={`font-bold text-lg ${isSelected ? 'text-emerald-900' : 'text-stone-700'}`}>
 {option.label}
 </div>
 </div>
 {isSelected && (
 <div className="absolute top-4 right-4 text-emerald-500">
 <Check className="size-5 stroke-[3px]" />
 </div>
 )}
 </button>
 );
 })}
 </div>
 </m.div>

 {/* Languages - Chips */}
 <m.div {...fadeIn} transition={{ delay: 0.15 }}>
 <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-3 ml-1">Spoken Languages</h3>
 <div className="flex flex-wrap gap-2">
 {LANGUAGES.map((lang) => {
 const isSelected = selectedLanguages.includes(lang.code);
 return (
 <button
 key={lang.code}
 onClick={() => toggleLanguage(lang.code)}
 className={`pl-1.5 pr-4 py-1.5 rounded-full border-2 transition-all duration-200 flex items-center gap-2.5 ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:text-emerald-700' }`}
 >
 <span className="size-7 rounded-full bg-white/20 flex items-center justify-center text-base shadow-inner">{lang.flag}</span>
 <span className="text-sm font-bold">{lang.label}</span>
 </button>
 );
 })}
 </div>
 </m.div>
 </div>

 <hr className="border-stone-100" />

 {/* 2. Availability Cycle */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }} className="space-y-6">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-6 rounded-full bg-stone-900 text-white font-bold text-xs">2</span>
 <h3 className="font-semibold text-stone-900">Availability</h3>
 </div>

 {/* Day Dots Selector */}
 <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200">
 <div className="flex justify-between items-center mb-4">
 <span className="text-sm font-bold text-stone-500 uppercase tracking-wider">Weekly Schedule</span>
 <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">{selectedDays.length} days selected</span>
 </div>

 <div className="flex justify-between gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
 {DAYS_OF_WEEK.map((day) => {
 const isSelected = selectedDays.includes(day.id);
 return (
 <button
 key={day.id}
 onClick={() => toggleDay(day.id)}
 className={`w-12 h-14 rounded-2xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-300 flex-shrink-0 ${isSelected ? 'bg-gradient-to-b from-stone-800 to-stone-900 text-white shadow-lg shadow-stone-300 transform -translate-y-1' : 'bg-white border border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600' }`}
 >
 <span>{day.label}</span>
 {isSelected && <div className="size-1.5 bg-emerald-400 rounded-full mt-1.5" />}
 </button>
 );
 })}
 </div>
 </div>

 {/* Time Segments */}
 {/* Time Selection (Specific Hours) */}
 <div className="bg-white p-6 rounded-3xl border border-stone-200">
 <h4 className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-4">Select Working Hours</h4>
 <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
 {Array.from({ length: 24 }).map((_, i) => {
 // Format: "9 AM", "12 PM", etc.
 const hour = i;
 const ampm = hour >= 12 ? 'PM' : 'AM';
 const displayHour = hour % 12 || 12;
 const label = `${displayHour} ${ampm}`;
 const value = `${hour.toString().padStart(2, '0')}:00`; // "09:00"

 const isActive = selectedTimeSlots.includes(value);

 return (
 <button
 key={value}
 onClick={() => toggleTimeSlot(value)}
 className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${isActive ? 'bg-stone-900 border-stone-900 text-white shadow-md transform scale-105' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50' }`}
 >
 {label}
 </button>
 );
 })}
 </div>
 <div className="mt-4 flex justify-end">
 <p className="text-xs text-stone-400 font-medium">Selected: {selectedTimeSlots.length} hours</p>
 </div>
 </div>
 </m.div>

 <hr className="border-stone-100" />

 {/* 3. Radius Radar & Location */}
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-6 rounded-full bg-stone-900 text-white font-bold text-xs">3</span>
 <h3 className="font-semibold text-stone-900">Location & Rate</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Radius Radar */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.3 }}
 className="relative p-6 rounded-3xl bg-stone-900 text-white overflow-hidden flex flex-col justify-between min-h-[280px]"
 >
 {/* Background Grid */}
 <div className="absolute inset-0 opacity-10"
 style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
 </div>

 {/* Glow effects */}
 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 blur-[60px] pointer-events-none" />

 {/* Radar Animation Container */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-full flex items-center justify-center pointer-events-none opacity-30">
 {[1, 2, 3].map(i => (
 <div key={`orbit-${i}`} className="absolute rounded-full border border-white/20" style={{ width: `${i * 100}px`, height: `${i * 100}px` }} />
 ))}
 </div>

 {/* Content */}
 <div className="relative z-10 flex justify-between items-start">
 <div>
 <div className="flex items-center gap-2 mb-2 text-emerald-400">
 <MapPin className="size-5" />
 <span className="text-xs font-bold uppercase tracking-wider">Service Radius</span>
 </div>
 <div className="text-5xl font-black text-white tracking-tight">
 {data.maxDistanceKm || 0}<span className="text-2xl text-stone-500 ml-1 font-medium">km</span>
 </div>
 </div>
 </div>

 <div className="relative z-10">
 <input
 type="range"
 min="0"
 max="100"
 value={data.maxDistanceKm || 0}
 onChange={(e) => onUpdate({ maxDistanceKm: parseInt(e.target.value) })}
 className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
 />
 <div className="flex justify-between mt-3 text-xs font-medium text-stone-500">
 <span>Specific location</span>
 <span>City-wide</span>
 </div>
 </div>
 </m.div>

 <div className="space-y-4">
 {/* Service Location */}
 <div className="grid grid-cols-3 gap-3">
 {SERVICE_LOCATIONS.map((loc) => {
 const isSelected = data.serviceLocation === loc.id;
 const Icon = loc.icon;
 return (
 <button
 key={loc.id}
 onClick={() => onUpdate({ serviceLocation: loc.id })}
 className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 h-full ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-stone-100 bg-white hover:border-stone-200' }`}
 >
 <div className={`mb-2 p-2 rounded-full ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-50 text-stone-400'}`}>
 <Icon className="size-6" />
 </div>
 <span className={`font-bold text-xs text-center leading-tight ${isSelected ? 'text-emerald-900' : 'text-stone-600'}`}>{loc.label}</span>
 </button>
 );
 })}
 </div>

 {/* Rate Calculator */}
 <div
 className="p-5 rounded-3xl bg-white border border-stone-200 flex flex-col gap-4 shadow-sm"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-stone-900">
 <div className="p-1.5 bg-stone-100 rounded-lg"><Calculator className="size-4" /></div>
 <span className="font-bold text-sm">Hourly Rate</span>
 </div>
 <div className="flex items-center gap-2">
 <input
 type="number"
 min="0"
 value={data.hourlyRate || ''}
 onChange={(e) => onUpdate({ hourlyRate: parseInt(e.target.value) || 0 })}
 placeholder="0"
 className="w-24 text-right text-2xl font-black text-stone-900 border-b-2 border-stone-100 focus:border-emerald-500 outline-none bg-transparent p-1 placeholder:text-stone-200"
 />
 <span className="text-sm text-stone-400 font-medium">QAR</span>
 </div>
 </div>

 <input
 type="range"
 min="0"
 max="500"
 step="5"
 value={data.hourlyRate || 0}
 onChange={(e) => onUpdate({ hourlyRate: parseInt(e.target.value) })}
 className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
 />

 {/* Fun Estimate */}
 {potentialWeekly > 0 && (
 <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-2xl text-white shadow-lg shadow-emerald-200/50">
 <div className="flex items-center gap-2 font-bold mb-1 text-xs uppercase tracking-wide text-emerald-100">
 <Sparkles className="size-3" />
 <span>Potential Earnings</span>
 </div>
 <p className="text-2xl font-bold">
 {potentialWeekly.toLocaleString()} <span className="text-sm font-medium opacity-80">QAR / week</span>
 </p>
 <p className="text-[10px] text-white/70 mt-1">Based on {daysCount} days availability</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.4 }}
 className="flex justify-between items-center pt-8 border-t border-stone-100 mt-8"
 >
 <button
 onClick={onBack}
 className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-600 transition-colors px-6 py-3 hover:bg-stone-50 rounded-2xl"
 >
 <ArrowLeft className="size-4 stroke-[3px]" />
 Back
 </button>
 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02, x: 5 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-3 ${isValid ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-300 hover:shadow-xl' : 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none' }`}
 >
 Continue
 <ArrowRight className="size-5 stroke-[3px]" />
 </m.button>
 </m.div>
 </div >
 );
}
