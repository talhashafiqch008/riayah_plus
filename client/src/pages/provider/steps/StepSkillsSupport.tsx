
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Wrench, Award, Briefcase, Check, ChevronDown, ChevronUp, Star, Sparkles } from "lucide-react";
import { useState } from "react";
import { ProviderOnboardingData } from "../OnboardingPage";

// Role-specific skill configurations
const ROLE_SKILL_CONFIGS: Record<string, {
 title: string;
 description: string;
 skillCategories: Record<string, { label: string; icon: string; skills: string[] }>;
 certifications: Array<{ id: string; label: string; icon: string }>;
 experienceAreas: Array<{ id: string; label: string; icon: string }>;
 minSkills: number;
}> = {
 // Support Worker - General care and support
 SUPPORT_WORKER: {
 title: 'Your Skills & Experience',
 description: 'Select the services you can provide to clients.',
 skillCategories: {
 personal_care: {
 label: 'Personal Care',
 icon: '🧴',
 skills: ['Bathing/Showering', 'Dressing', 'Grooming', 'Toileting', 'Oral Care', 'Skin Care']
 },
 mobility: {
 label: 'Mobility & Transfers',
 icon: '🚶',
 skills: ['Walking Assistance', 'Wheelchair Transfers', 'Hoist Operation', 'Bed Positioning', 'Fall Prevention']
 },
 daily_living: {
 label: 'Daily Living',
 icon: '🏠',
 skills: ['Meal Preparation', 'Medication Reminders', 'Light Housekeeping', 'Laundry', 'Shopping/Errands']
 },
 companionship: {
 label: 'Companionship',
 icon: '💬',
 skills: ['Social Activities', 'Conversation', 'Reading/Games', 'Outings', 'Pet Care Assistance']
 },
 specialized: {
 label: 'Specialized Support',
 icon: '⭐',
 skills: ['Dementia Support', 'Autism Support', 'Behavioral Support', 'Palliative Support', 'Post-Surgery Care']
 }
 },
 certifications: [
 { id: 'first_aid', label: 'First Aid & CPR', icon: '🩹' },
 { id: 'manual_handling', label: 'Manual Handling', icon: '🏋️' },
 { id: 'dementia', label: 'Dementia Care', icon: '🧠' },
 { id: 'disability', label: 'Disability Support', icon: '♿' },
 { id: 'aged_care', label: 'Aged Care Certificate', icon: '👴' },
 { id: 'food_safety', label: 'Food Safety', icon: '🍽️' },
 { id: 'infection_control', label: 'Infection Control', icon: '🧼' },
 ],
 experienceAreas: [
 { id: 'aged_care', label: 'Aged Care', icon: '👴' },
 { id: 'disability', label: 'Disability Support', icon: '♿' },
 { id: 'mental_health', label: 'Mental Health', icon: '🧠' },
 { id: 'post_hospital', label: 'Post-Hospital Care', icon: '🏥' },
 ],
 minSkills: 3
 },
 // Childcare Provider - Child-focused skills
 CHILDCARE: {
 title: 'Childcare Skills',
 description: 'Select the childcare services and activities you can provide.',
 skillCategories: {
 child_care: {
 label: 'Child Care',
 icon: '👶',
 skills: ['Feeding & Mealtime', 'Diaper Changing', 'Bathing Children', 'Bedtime Routines', 'Play Activities', 'Homework Support']
 },
 safety: {
 label: 'Safety & Supervision',
 icon: '🛡️',
 skills: ['Child Safety', 'First Aid for Children', 'Emergency Response', 'Safe Play Environments', 'Supervision']
 },
 development: {
 label: 'Child Development',
 icon: '📚',
 skills: ['Educational Activities', 'Reading & Storytelling', 'Creative Play', 'Social Skills', 'Motor Skills Support']
 },
 special_needs: {
 label: 'Special Needs Support',
 icon: '⭐',
 skills: ['Autism Support', 'ADHD Support', 'Developmental Delays', 'Behavioral Support', 'Sensory Support']
 },
 activities: {
 label: 'Activities & Outings',
 icon: '🎨',
 skills: ['Outdoor Play', 'Arts & Crafts', 'Sports Activities', 'Park Visits', 'Educational Outings']
 }
 },
 certifications: [
 { id: 'first_aid', label: 'First Aid & CPR', icon: '🩹' },
 { id: 'childcare', label: 'Childcare Certificate', icon: '👶' },
 { id: 'child_safety', label: 'Child Safety', icon: '🛡️' },
 { id: 'special_needs', label: 'Special Needs Care', icon: '⭐' },
 { id: 'early_childhood', label: 'Early Childhood Education', icon: '📚' },
 { id: 'food_safety', label: 'Food Safety', icon: '🍽️' },
 ],
 experienceAreas: [
 { id: 'child_care', label: 'Child Care', icon: '👶' },
 { id: 'infant_care', label: 'Infant Care', icon: '🍼' },
 { id: 'special_needs', label: 'Special Needs', icon: '⭐' },
 { id: 'after_school', label: 'After School Care', icon: '🎒' },
 ],
 minSkills: 3
 },
 // Household Support - Cleaning and household tasks
 CLEANER: {
 title: 'Household Services',
 description: 'Select the household and cleaning services you can provide.',
 skillCategories: {
 cleaning: {
 label: 'Cleaning Services',
 icon: '🧹',
 skills: ['Deep Cleaning', 'Regular Maintenance', 'Kitchen Cleaning', 'Bathroom Cleaning', 'Window Cleaning', 'Carpet Cleaning']
 },
 // organization: {
 // label: 'Organization',
 // icon: '📦',
 // skills: ['Decluttering', 'Storage Solutions', 'Wardrobe Organization', 'Kitchen Organization', 'Space Planning']
 // },
 laundry: {
 label: 'Laundry & Ironing',
 icon: '👔',
 skills: ['Washing & Drying', 'Ironing', 'Folding', 'Stain Removal', 'Delicate Care', 'Bedding Care']
 },
 maintenance: {
 label: 'Basic Maintenance',
 icon: '🔧',
 skills: ['Light Bulb Replacement', 'Basic Repairs', 'Appliance Care', 'Garden Maintenance', 'Waste Management']
 }
 },
 certifications: [
 { id: 'cleaning_cert', label: 'Cleaning Certificate', icon: '🧹' },
 { id: 'food_safety', label: 'Food Safety', icon: '🍽️' },
 { id: 'infection_control', label: 'Infection Control', icon: '🧼' },
 { id: 'chemical_safety', label: 'Chemical Safety', icon: '⚠️' },
 ],
 experienceAreas: [
 { id: 'residential', label: 'Residential Cleaning', icon: '🏠' },
 { id: 'commercial', label: 'Commercial Cleaning', icon: '🏢' },
 { id: 'deep_cleaning', label: 'Deep Cleaning', icon: '✨' },
 ],
 minSkills: 3
 },
 // Transport Assistant - Driving and transport
 DRIVER: {
 title: 'Transport Services',
 description: 'Select the transport services and capabilities you can provide.',
 skillCategories: {
 driving: {
 label: 'Driving Services',
 icon: '🚗',
 skills: ['Medical Appointments', 'Shopping Trips', 'Social Outings', 'Airport Transfers', 'School Pickups', 'Emergency Transport']
 },
 safety: {
 label: 'Safety & Assistance',
 icon: '🛡️',
 skills: ['Wheelchair Assistance', 'Mobility Aid Support', 'Safe Entry/Exit', 'Seat Belt Assistance', 'Emergency Response']
 },
 navigation: {
 label: 'Navigation & Planning',
 icon: '🗺️',
 skills: ['Route Planning', 'Traffic Management', 'GPS Navigation', 'Time Management', 'Multiple Stops']
 },
 vehicle: {
 label: 'Vehicle Care',
 icon: '🔧',
 skills: ['Vehicle Maintenance', 'Fuel Management', 'Cleanliness', 'Safety Checks', 'Documentation']
 }
 },
 certifications: [
 { id: 'drivers_license', label: 'Valid Driver License', icon: '🚗' },
 { id: 'first_aid', label: 'First Aid & CPR', icon: '🩹' },
 { id: 'defensive_driving', label: 'Defensive Driving', icon: '🛡️' },
 { id: 'passenger_assistance', label: 'Passenger Assistance', icon: '👥' },
 ],
 experienceAreas: [
 { id: 'medical_transport', label: 'Medical Transport', icon: '🏥' },
 { id: 'elderly_transport', label: 'Elderly Transport', icon: '👴' },
 { id: 'disability_transport', label: 'Disability Transport', icon: '♿' },
 { id: 'child_transport', label: 'Child Transport', icon: '👶' },
 ],
 minSkills: 2
 },
 // Gardener - Garden and landscaping services
 GARDENER: {
 title: 'Gardening Services',
 description: 'Select the gardening and landscaping services you can provide.',
 skillCategories: {
 garden_maintenance: {
 label: 'Garden Maintenance',
 icon: '🌿',
 skills: ['Lawn Mowing', 'Weeding', 'Pruning', 'Planting', 'Fertilizing', 'Pest Control']
 },
 landscaping: {
 label: 'Landscaping',
 icon: '🌳',
 skills: ['Garden Design', 'Hardscaping', 'Irrigation Systems', 'Tree Care', 'Seasonal Planting']
 },
 specialized: {
 label: 'Specialized Services',
 icon: '🌺',
 skills: ['Organic Gardening', 'Indoor Plants', 'Vegetable Gardens', 'Herb Gardens', 'Flower Arrangements']
 },
 equipment: {
 label: 'Equipment & Tools',
 icon: '🔧',
 skills: ['Equipment Operation', 'Tool Maintenance', 'Safety Practices', 'Waste Management']
 }
 },
 certifications: [
 { id: 'gardening_cert', label: 'Gardening Certificate', icon: '🌱' },
 { id: 'landscaping_cert', label: 'Landscaping Certificate', icon: '🌳' },
 { id: 'pest_control', label: 'Pest Control License', icon: '🐛' },
 { id: 'safety', label: 'Safety Training', icon: '🛡️' },
 ],
 experienceAreas: [
 { id: 'residential_garden', label: 'Residential Gardens', icon: '🏠' },
 { id: 'commercial', label: 'Commercial Landscaping', icon: '🏢' },
 { id: 'organic', label: 'Organic Gardening', icon: '🌿' },
 ],
 minSkills: 2
 },
 // Trainer / Educator - Training and education services
 TRAINER: {
 title: 'Training Services',
 description: 'Select the training and education services you can provide.',
 skillCategories: {
 training: {
 label: 'Training Services',
 icon: '📚',
 skills: ['Skills Training', 'Life Skills', 'Independence Training', 'Job Training', 'Computer Skills', 'Language Training']
 },
 education: {
 label: 'Education Support',
 icon: '✏️',
 skills: ['Tutoring', 'Homework Support', 'Study Skills', 'Test Preparation', 'Educational Planning']
 },
 specialized: {
 label: 'Specialized Training',
 icon: '⭐',
 skills: ['Disability Support Training', 'Aged Care Training', 'First Aid Training', 'Safety Training', 'Wellness Education']
 },
 delivery: {
 label: 'Delivery Methods',
 icon: '💻',
 skills: ['In-Person Training', 'Online Training', 'Group Sessions', 'One-on-One', 'Workshop Facilitation']
 }
 },
 certifications: [
 { id: 'training_cert', label: 'Training Certificate', icon: '🎓' },
 { id: 'education_cert', label: 'Education Certificate', icon: '📖' },
 { id: 'first_aid', label: 'First Aid & CPR', icon: '🩹' },
 { id: 'special_needs', label: 'Special Needs Training', icon: '⭐' },
 ],
 experienceAreas: [
 { id: 'adult_training', label: 'Adult Training', icon: '👤' },
 { id: 'child_education', label: 'Child Education', icon: '👶' },
 { id: 'disability_training', label: 'Disability Support', icon: '♿' },
 { id: 'aged_care_training', label: 'Aged Care Training', icon: '👴' },
 ],
 minSkills: 2
 }
};

// Default fallback configuration
const DEFAULT_SKILL_CONFIG = ROLE_SKILL_CONFIGS.SUPPORT_WORKER;

const EXPERIENCE_YEARS = [
 { id: '0-1', label: '< 1 year', years: 0 },
 { id: '1-3', label: '1-3 years', years: 1 },
 { id: '3-5', label: '3-5 years', years: 3 },
 { id: '5-10', label: '5-10 years', years: 5 },
 { id: '10+', label: '10+ years', years: 10 },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepSkillsSupportProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepSkillsSupport({ data, onUpdate, onNext, onBack }: StepSkillsSupportProps) {
 // Get role-specific configuration
 const roleId = data.role || 'SUPPORT_WORKER';
 const roleConfig = ROLE_SKILL_CONFIGS[roleId] || DEFAULT_SKILL_CONFIG;
 const SKILL_CATEGORIES = roleConfig.skillCategories;
 const CERTIFICATIONS = roleConfig.certifications;
 const EXPERIENCE_AREAS = roleConfig.experienceAreas;
 const MIN_SKILLS = roleConfig.minSkills;

 // Get first category key for initial expansion
 const firstCategoryKey = Object.keys(SKILL_CATEGORIES)[0];
 const [expandedCategory, setExpandedCategory] = useState<string | null>(firstCategoryKey);

 const skills = (data.supportSkills || {}) as Record<string, unknown>;
 const selectedSkills: string[] = (skills.skills as string[]) || [];
 const selectedCerts: string[] = (skills.certifications as string[]) || [];
 const selectedAreas: string[] = (skills.experienceAreas as string[]) || [];

 const updateSkills = (field: string, value: string | string[] | boolean | number) => {
 onUpdate({
 supportSkills: {
 ...skills,
 [field]: value
 }
 });
 };

 const toggleSkill = (skill: string) => {
 const newSkills = selectedSkills.includes(skill)
 ? selectedSkills.filter(s => s !== skill)
 : [...selectedSkills, skill];
 updateSkills('skills', newSkills);
 };

 const toggleCert = (cert: string) => {
 const newCerts = selectedCerts.includes(cert)
 ? selectedCerts.filter(c => c !== cert)
 : [...selectedCerts, cert];
 updateSkills('certifications', newCerts);
 };

 const toggleArea = (area: string) => {
 const newAreas = selectedAreas.includes(area)
 ? selectedAreas.filter(a => a !== area)
 : [...selectedAreas, area];
 updateSkills('experienceAreas', newAreas);
 };

 const isValid = selectedSkills.length >= MIN_SKILLS;

 return (
 <div className="space-y-10">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200/50 ring-4 ring-teal-50">
 <Wrench className="size-7 text-white" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">{roleConfig.title}</h2>
 <p className="text-stone-500 text-lg">{roleConfig.description}</p>
 </div>
 </div>
 </m.div>

 {/* Skills Counter */}
 {selectedSkills.length > 0 && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="bg-teal-50/50 rounded-2xl p-5 border border-teal-100 flex items-center justify-between shadow-sm relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 size-32 bg-teal-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
 <div className="flex items-center gap-3 relative z-10">
 <div className="size-10 rounded-full bg-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-200">
 <Check className="size-5 stroke-[3px]" />
 </div>
 <span className="font-bold text-teal-900 text-lg">
 {selectedSkills.length} skills selected
 </span>
 </div>
 {selectedSkills.length < MIN_SKILLS && (
 <span className="text-sm font-bold text-teal-600 bg-white/60 px-3 py-1 rounded-full relative z-10">
 Select {MIN_SKILLS - selectedSkills.length} more
 </span>
 )}
 </m.div>
 )}

 {/* Skills by Category - Accordion style */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-4">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">1</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Core Competencies
 </h3>
 </div>

 <div className="space-y-3">
 {Object.entries(SKILL_CATEGORIES).map(([categoryId, category], index) => {
 const isExpanded = expandedCategory === categoryId;
 const categorySkillsSelected = category.skills.filter(s => selectedSkills.includes(s)).length;

 return (
 <m.div
 key={categoryId}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 + index * 0.05 }}
 className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-500 shadow-xl shadow-indigo-100 bg-white ring-1 ring-indigo-500/20' : (categorySkillsSelected > 0 ? 'border-indigo-200 bg-indigo-50/30' : 'border-stone-200 bg-white hover:border-indigo-200') }`}
 >
 <button
 onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
 className="w-full p-5 flex items-center justify-between text-left transition-colors"
 >
 <div className="flex items-center gap-4">
 <span className="text-3xl filter drop-shadow-sm">{category.icon}</span>
 <div>
 <h4 className={`font-semibold text-lg ${isExpanded ? 'text-indigo-900' : 'text-stone-900'}`}>{category.label}</h4>
 {categorySkillsSelected > 0 && (
 <div className="flex items-center gap-1 text-xs font-bold text-teal-600 mt-0.5">
 <Sparkles className="size-3" />
 {categorySkillsSelected} selected
 </div>
 )}
 </div>
 </div>
 <div className={`size-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-stone-50 text-stone-400'}`}>
 <ChevronDown className="size-5 stroke-[3px]" />
 </div>
 </button>

 <AnimatePresence>
 {isExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.3, ease: "easeInOut" }}
 className="overflow-hidden bg-stone-50/50"
 >
 <div className="p-5 pt-2 flex flex-wrap gap-3 border-t border-stone-100">
 {category.skills.map((skill) => {
 const isSelected = selectedSkills.includes(skill);
 return (
 <m.button
 key={skill}
 onClick={() => toggleSkill(skill)}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${isSelected ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-200 border-transparent' : 'bg-white border border-stone-200 text-stone-600 hover:border-indigo-300 hover:text-indigo-700' }`}
 >
 {isSelected && <Check className="size-4 stroke-[3px]" />}
 {skill}
 </m.button>
 );
 })}
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </m.div>
 );
 })}
 </div>
 </m.div>

 {/* Certifications */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }} className="space-y-4">
 <div className="flex items-center gap-3 mt-8">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">2</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Certifications
 </h3>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {CERTIFICATIONS.map((cert) => {
 const isSelected = selectedCerts.includes(cert.id);
 return (
 <m.button
 key={cert.id}
 onClick={() => toggleCert(cert.id)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`p-4 rounded-2xl text-left transition-all flex items-center gap-4 border-2 ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500/20' : 'border-stone-100 bg-white hover:border-indigo-200 text-stone-600' }`}
 >
 <span className="text-2xl filter drop-shadow-sm">{cert.icon}</span>
 <span className={`font-bold flex-1 ${isSelected ? 'text-indigo-900' : 'text-stone-700'}`}>{cert.label}</span>
 <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-stone-300 bg-stone-50' }`}>
 {isSelected && <Check className="size-3 stroke-[3px]" />}
 </div>
 </m.button>
 );
 })}
 </div>
 </m.div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Experience Areas */}
 <m.div {...fadeIn} transition={{ delay: 0.25 }} className="space-y-4">
 <div className="flex items-center gap-3 mt-4">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">3</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Areas of Expertise
 </h3>
 </div>
 <div className="grid grid-cols-2 gap-3">
 {EXPERIENCE_AREAS.map((area) => {
 const isSelected = selectedAreas.includes(area.id);
 return (
 <m.button
 key={area.id}
 onClick={() => toggleArea(area.id)}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className={`p-4 rounded-2xl border-2 text-center flex flex-col items-center justify-center gap-2 transition-all h-full ${isSelected ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100 text-purple-900' : 'border-stone-100 bg-white hover:border-purple-200 hover:shadow-md text-stone-600' }`}
 >
 <span className="text-3xl mb-1 filter drop-shadow-sm">{area.icon}</span>
 <span className="font-bold text-sm leading-tight">{area.label}</span>
 </m.button>
 );
 })}
 </div>
 </m.div>

 {/* Years Experience */}
 <m.div {...fadeIn} transition={{ delay: 0.3 }} className="space-y-4">
 <div className="flex items-center gap-3 mt-4">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">4</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Total Experience
 </h3>
 </div>
 <div className="flex flex-col gap-3">
 {EXPERIENCE_YEARS.map((exp) => {
 const isSelected = skills.yearsExperience === exp.years;
 return (
 <m.button
 key={exp.id}
 onClick={() => updateSkills('yearsExperience', exp.years)}
 whileHover={{ x: 5 }}
 whileTap={{ scale: 0.98 }}
 className={`px-5 py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-between ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md' : 'border-stone-100 bg-white text-stone-600 hover:border-indigo-200 hover:bg-stone-50' }`}
 >
 <span>{exp.label}</span>
 {isSelected && <Star className="size-5 fill-teal-500 text-teal-500" />}
 </m.button>
 );
 })}
 </div>
 </m.div>
 </div>

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.35 }}
 className="flex justify-between items-center pt-8 border-t border-stone-50 mt-8"
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
 </div>
 );
}
