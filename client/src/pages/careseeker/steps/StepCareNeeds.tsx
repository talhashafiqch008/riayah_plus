
import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
 ArrowRight, ArrowLeft, Check, Heart, Info,
 Baby, Activity, Home, Accessibility, UserPlus,
 Stethoscope, Sparkles, X, Trash2
} from "lucide-react";

// Care categories with Lucide icons
const CARE_CATEGORIES = [
 {
 id: 'aged_care',
 label: 'Home Care', // Renamed from Aged Care
 icon: UserPlus,
 color: 'bg-orange-100 text-orange-600',
 description: 'Elderly & Home support',
 options: [
 { id: 'personal_care', label: 'Personal care', hint: 'Bathing, grooming' },
 { id: 'companionship', label: 'Companionship', hint: 'Social interaction' },
 { id: 'mobility_assistance', label: 'Mobility support', hint: 'Walking, transfers' },
 { id: 'meal_preparation', label: 'Meal prep', hint: 'Cooking, nutrition' },
 { id: 'medication_reminders', label: 'Medication', hint: 'Reminders only' },
 { id: 'nursing_aged', label: 'Nursing', hint: 'Clinical support' },
 ]
 },
 {
 id: 'disability_support',
 label: 'Disability',
 icon: Accessibility,
 color: 'bg-purple-100 text-purple-600',
 description: 'Special needs care',
 options: [
 { id: 'support_worker', label: 'Support Worker', hint: 'Daily assistance' }, // Added
 { id: 'cleaner', label: 'Cleaner', hint: 'House cleaning' }, // Added
 { id: 'gardener', label: 'Gardener', hint: 'Garden maintenance' }, // Added
 { id: 'daily_living', label: 'Daily living', hint: 'Everyday tasks' },
 { id: 'community_access', label: 'Social Access', hint: 'Outings, activities' },
 { id: 'skill_building', label: 'Skill building', hint: 'Independence' },
 { id: 'nursing_disability', label: 'Nursing', hint: 'Clinical support' },
 ]
 },
 {
 id: 'child_family',
 label: 'Babysitting', // Renamed from Child Care
 icon: Baby,
 color: 'bg-blue-100 text-blue-600',
 description: 'Kids & Families',
 options: [
 { id: 'childcare', label: 'Babysitting', hint: 'Supervision' },
 { id: 'special_needs_child', label: 'Special Needs', hint: 'Disability support' },
 { id: 'newborn_support', label: 'Newborn', hint: 'New parent help' },
 { id: 'school_pickup', label: 'School Run', hint: 'Transport' },
 ]
 },
 {
 id: 'allied_health',
 label: 'Therapy',
 icon: Stethoscope,
 color: 'bg-rose-100 text-rose-600',
 description: 'Rehab services',
 options: [
 { id: 'physiotherapy', label: 'Physio', hint: 'Exercise' },
 { id: 'occupational', label: 'Occ. Therapy', hint: 'Function' },
 { id: 'speech_therapy', label: 'Speech', hint: 'Communication' },
 { id: 'mental_wellness', label: 'Wellness', hint: 'Emotional' },
 ]
 },
 {
 id: 'home_support',
 label: 'Home Visit', // Renamed from Home Help
 icon: Home,
 color: 'bg-emerald-100 text-emerald-600',
 description: 'House tasks',
 options: [
 { id: 'cleaning', label: 'Cleaning', hint: 'Housekeeping' },
 { id: 'laundry', label: 'Laundry', hint: 'Washing/Ironing' },
 { id: 'meal_prep_home', label: 'Cooking', hint: 'Meal prep' },
 { id: 'shopping_errands', label: 'Errands', hint: 'Shopping' },
 ]
 },
];

const PLAN_TYPES = [
 { id: 'ndia_managed', label: 'NDIA Managed' },
 { id: 'plan_managed', label: 'Plan Managed' },
 { id: 'self_managed', label: 'Self Managed' },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepCareNeedsProps {
 data: Record<string, unknown>;
 onUpdate: (data: Record<string, unknown>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepCareNeeds({ data, onUpdate, onNext, onBack }: StepCareNeedsProps) {
 // Determine active category for detail view (last selected or manually toggled)
 const [activeDetailId, setActiveDetailId] = useState<string | null>(
 (data.careCategories as string[])?.[0] || null
 );

 const selectedCategories: string[] = (data.careCategories as string[]) || [];
 const selectedNeeds: Record<string, string[]> = (data.careNeeds as Record<string, string[]>) || {};

 const toggleCategory = (categoryId: string) => {
 let newCategories: string[];
 const newNeeds = { ...selectedNeeds };

 if (selectedCategories.includes(categoryId)) {
 // If clicking active/selected category, just ensure it's the active detail view
 if (activeDetailId !== categoryId) {
 setActiveDetailId(categoryId);
 return;
 }
 // If active and clicking again, simple toggle off
 newCategories = selectedCategories.filter(c => c !== categoryId);
 if (activeDetailId === categoryId) setActiveDetailId(null);
 delete newNeeds[categoryId];

 // Clear plan data if removing disability
 if (categoryId === 'disability_support') {
 onUpdate({
 careCategories: newCategories,
 careNeeds: newNeeds,
 supportPlanType: undefined,
 planDates: undefined
 });
 return;
 }

 } else {
 // Adding category
 newCategories = [...selectedCategories, categoryId];
 setActiveDetailId(categoryId);
 }

 onUpdate({ careCategories: newCategories, careNeeds: newNeeds });
 };

 const toggleNeed = (categoryId: string, needId: string) => {
 const categoryNeeds = selectedNeeds[categoryId] || [];
 const newCategoryNeeds = categoryNeeds.includes(needId)
 ? categoryNeeds.filter(n => n !== needId)
 : [...categoryNeeds, needId];

 onUpdate({
 careNeeds: {
 ...selectedNeeds,
 [categoryId]: newCategoryNeeds
 }
 });
 };

 const isValid = selectedCategories.length > 0;

 return (
 <div className="space-y-8">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3 mb-2">
 <div className="size-12 bg-teal-100 rounded-2xl flex items-center justify-center rotate-3">
 <Activity className="size-6 text-teal-600" />
 </div>
 <div>
 <h2 className="text-2xl font-semibold text-stone-900 leading-none">What support do you need?</h2>
 <p className="text-stone-500 mt-1">Select all categories that apply.</p>
 </div>
 </div>

 {/* Clear All Button */}
 <AnimatePresence>
 {selectedCategories.length > 1 && (
 <m.button
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 onClick={() => {
 onUpdate({ careCategories: [], careNeeds: {} });
 setActiveDetailId(null);
 }}
 className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-800 hover:text-red-600 bg-stone-100 hover:bg-red-50 rounded-lg transition-colors"
 >
 <Trash2 className="size-4" />
 Clear All
 </m.button>
 )}
 </AnimatePresence>
 </div>
 </m.div>

 {/* Categories Grid */}
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
 {CARE_CATEGORIES.map((category, index) => {
 const isSelected = selectedCategories.includes(category.id);
 const Icon = category.icon;
 const needsCount = (selectedNeeds[category.id] || []).length;

 return (
 <m.div
 key={category.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: index * 0.05 }}
 onClick={() => toggleCategory(category.id)}
 whileHover={{ scale: 1.02, y: -2 }}
 whileTap={{ scale: 0.98 }}
 role="button"
 tabIndex={0}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 toggleCategory(category.id);
 }
 }}
 className={`relative flex flex-col items-center p-5 rounded-[24px] border-2 text-center transition-transform duration-300 cursor-pointer ${isSelected ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-100' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 hover:shadow-lg' }`}
 >
 <div className={`size-14 rounded-full flex items-center justify-center mb-3 transition-colors ${isSelected ? 'bg-teal-600 text-white' : category.color }`}>
 <Icon className="size-7" />
 </div>

 <h3 className={`font-semibold text-stone-900 mb-1 ${isSelected ? 'text-stone-900' : ''}`}>
 {category.label}
 </h3>
 <p className="text-xs text-stone-500 leading-tight">
 {category.description}
 </p>

 {/* Remove Button (X) */}
 {isSelected && (
 <button
 onClick={(e) => {
 e.stopPropagation(); // Prevent opening details
 toggleCategory(category.id); // Deselect
 }}
 className="absolute top-3 right-3 size-7 bg-white hover:bg-stone-100 text-stone-400 hover:text-red-500 rounded-full flex items-center justify-center border border-stone-200 transition-colors z-10 group/close"
 >
 <div className="group-hover/close:hidden">
 <Check className="size-4 text-stone-900" strokeWidth={3} />
 </div>
 <div className="hidden group-hover/close:block">
 <X className="size-4" strokeWidth={3} />
 </div>
 </button>
 )}

 {/* Badge for selected needs count */}
 {needsCount > 0 && (
 <div className="absolute top-3 left-3 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
 {needsCount} selected
 </div>
 )}
 </m.div>
 );
 })}
 </div>

 {/* Specific Needs Panel (Conditional) */}
 <AnimatePresence mode="wait">
 {activeDetailId && selectedCategories.includes(activeDetailId) && (
 <m.div
 key={activeDetailId}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 className="bg-stone-50 rounded-[24px] p-6 ring-1 ring-stone-200/50 overflow-hidden relative"
 >
 {/* Decorative gradient */}
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-stone-800 to-stone-600" />

 <div className="flex items-center gap-2 mb-4">
 <Sparkles className="size-4 text-stone-600" />
 <h3 className="font-semibold text-stone-900">
 Specific needs for {CARE_CATEGORIES.find(c => c.id === activeDetailId)?.label}
 </h3>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {CARE_CATEGORIES.find(c => c.id === activeDetailId)?.options.map((option) => {
 const isNeedSelected = (selectedNeeds[activeDetailId] || []).includes(option.id);
 return (
 <m.button
 key={option.id}
 onClick={() => toggleNeed(activeDetailId, option.id)}
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.99 }}
 className={`p-3 rounded-xl border text-left transition-transform duration-300 relative overflow-hidden ${isNeedSelected ? 'bg-teal-50 border-teal-600 shadow-sm ring-1 ring-teal-100' : 'bg-white border border-stone-200 hover:border-stone-400' }`}
 >
 {isNeedSelected && (
 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-600" />
 )}
 <div className="pl-2">
 <span className={`block text-sm font-bold ${isNeedSelected ? 'text-stone-900' : 'text-stone-700'}`}>
 {option.label}
 </span>
 <span className="text-[10px] text-stone-400">
 {option.hint}
 </span>
 </div>
 {isNeedSelected && (
 <Check className="absolute top-3 right-3 size-4 text-stone-900" />
 )}
 </m.button>
 );
 })}
 </div>
 </m.div>
 )}
 </AnimatePresence>

 {/* Disability Support Plan (Conditional) */}
 <AnimatePresence>
 {selectedCategories.includes('disability_support') && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="bg-purple-50/50 rounded-[24px] p-6 border-2 border-purple-100 shadow-sm overflow-hidden mt-6"
 >
 <div className="flex items-center gap-3 mb-6">
 <div className="size-10 bg-purple-100 rounded-full flex items-center justify-center">
 <Accessibility className="size-5 text-purple-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">NDIS Plan Details</h3>
 <p className="text-xs text-stone-500">Select how your plan is managed</p>
 </div>
 </div>

 <div className="space-y-8">
 {/* Plan Type Selection */}
 <div className="bg-stone-100 p-1.5 rounded-xl flex flex-col md:flex-row gap-1">
 {PLAN_TYPES.map((plan) => {
 const isPlanSelected = (data.supportPlanType as string) === plan.id;
 return (
 <button
 key={plan.id}
 onClick={() => onUpdate({ supportPlanType: plan.id })}
 className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-transform duration-300 ${isPlanSelected ? 'bg-white text-purple-700 shadow-sm ring-1 ring-purple-100' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50' }`}
 >
 {plan.label}
 </button>
 );
 })}
 </div>

 {/* Dynamic Fields based on Plan Type */}
 {Boolean(data.supportPlanType) && (
 <m.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-6"
 >
 {/* NDIS Number - Mandatory for Plan & NDIA, Optional for Self */}
 <div className="space-y-1.5">
 <span className="block text-sm font-bold text-stone-900">
 NDIS Number
 {(data.supportPlanType === 'plan_managed' || data.supportPlanType === 'ndia_managed') !== false && <span className="text-red-500 ml-1">*</span>}
 {data.supportPlanType === 'self_managed' && <span className="text-stone-400 font-normal ml-1">(Optional)</span>}
 </span>
 <input
 type="text"
 className="w-full px-4 py-3.5 rounded-xl border-2 ring-1 ring-stone-200/50 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 bg-white text-stone-900 placeholder:text-stone-400 font-medium transition-transform duration-300"
 value={(data.ndisNumber as string) || ''}
 onChange={(e) => onUpdate({ ndisNumber: e.target.value })}
 placeholder="e.g. 430xxxxxx"
 />
 </div>

 {/* Plan Manager Email - Mandatory ONLY for Plan Managed */}
 {data.supportPlanType === 'plan_managed' && (
 <div className="space-y-1.5">
 <label htmlFor="input-src-app-careseeker-onboarding-steps-StepCareNeeds-tsx-390-392" className="block text-sm font-bold text-stone-900">
 Plan Manager's Email <span className="text-red-500">*</span>
 </label>
 <input
 type="email"
 className="w-full px-4 py-3.5 rounded-xl border-2 ring-1 ring-stone-200/50 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 bg-white text-stone-900 placeholder:text-stone-400 font-medium transition-transform duration-300"
 value={(data.planManagerEmail as string) || ''}
 onChange={(e) => onUpdate({ planManagerEmail: e.target.value })}
 placeholder="manager@example.com"
 />
 <p className="text-xs text-stone-500 flex items-center gap-1.5">
 <Info className="size-3.5" />
 Invoices will be sent directly to your Plan Manager
 </p>
 </div>
 )}

 {/* Date of Birth - Mandatory for NDIA, Optional for others */}
 <div className="space-y-1.5">
 <span className="block text-sm font-bold text-stone-900">
 Date of Birth
 {data.supportPlanType === 'ndia_managed' && <span className="text-red-500 ml-1">*</span>}
 {data.supportPlanType !== 'ndia_managed' && <span className="text-stone-400 font-normal ml-1">(Optional)</span>}
 </span>
 <input
 type="date"
 className="w-full px-4 py-3.5 rounded-xl border-2 ring-1 ring-stone-200/50 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 bg-white text-stone-900 placeholder:text-stone-400 font-medium transition-transform duration-300"
 value={(data.dateOfBirth as string) || ''}
 onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
 />
 </div>

 {/* NDIA Specifics: Plan Dates & Info */}
 {data.supportPlanType === 'ndia_managed' && (
 <div className="space-y-4">
 <div className="space-y-1.5">
 <span className="block text-sm font-bold text-stone-900">
 Plan Dates (Start - End) <span className="text-red-500">*</span>
 </span>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider ml-1">Start Date</span>
 <input
 type="date"
 className="w-full px-4 py-3.5 rounded-xl border-2 ring-1 ring-stone-200/50 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 bg-white text-stone-900 placeholder:text-stone-400 font-medium transition-transform duration-300"
 value={(data.planStartDate as string) || ''}
 onChange={(e) => onUpdate({ planStartDate: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider ml-1">End Date</span>
 <input
 type="date"
 className="w-full px-4 py-3.5 rounded-xl border-2 ring-1 ring-stone-200/50 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 bg-white text-stone-900 placeholder:text-stone-400 font-medium transition-transform duration-300"
 value={(data.planEndDate as string) || ''}
 onChange={(e) => onUpdate({ planEndDate: e.target.value })}
 />
 </div>
 </div>
 </div>

 <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-start gap-3">
 <div className="size-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
 <Info className="size-4 text-purple-600" />
 </div>
 <div className="text-sm text-stone-700 pt-1">
 <p className="font-bold mb-1 text-stone-900">Important for NDIA Managed</p>
 <ul className="list-disc pl-4 space-y-1 text-stone-600">
 <li>Payments are claimed via the NDIS Portal.</li>
 <li>You can only connect with <span className="font-bold text-purple-700">Registered NDIS Providers</span>.</li>
 </ul>
 </div>
 </div>
 </div>
 )}

 {/* Self Managed Info */}
 {data.supportPlanType === 'self_managed' && (
 <div className="bg-stone-50 p-4 rounded-xl ring-1 ring-stone-200/50 text-sm text-stone-600 flex items-center gap-3">
 <div className="size-8 bg-white rounded-full border border-stone-200 flex items-center justify-center flex-shrink-0 ">
 <Info className="size-4 text-stone-400" />
 </div>
 Payment via Credit Card / Direct Debit. Invoices sent to your email.
 </div>
 )}

 </m.div>
 )}
 </div>
 </m.div>
 )}
 </AnimatePresence>

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.2 }}
 className="flex justify-between items-center pt-8 border-t ring-1 ring-stone-100/50"
 >
 <button
 onClick={onBack}
 className="flex items-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors px-4 py-2 rounded-xl hover:bg-stone-100"
 >
 <ArrowLeft className="size-4" />
 Back
 </button>
 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className="px-8 py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
 >
 Continue
 <ArrowRight className="size-5" />
 </m.button>
 </m.div>
 </div>
 );
}
