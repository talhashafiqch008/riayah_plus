
import { useState, useEffect , useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence, Variants } from "framer-motion";
import {
 AlertTriangle, Phone, MapPin, Clock, Users, Heart,
 ArrowLeft, CheckCircle, Loader2, Shield, Stethoscope,
 Home, Activity, Baby, Brain, Siren, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitEmergencyRequest } from '@/lib/api/emergency';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';




// Care categories for emergency
const EMERGENCY_CATEGORIES = [
 { id: 'medical', label: 'Medical Emergency', icon: Stethoscope, description: 'Doctor or nurse needed urgently', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
 { id: 'elderly', label: 'Elderly Care', icon: Heart, description: 'Urgent aged care support', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
 { id: 'disability', label: 'Disability Support', icon: Activity, description: 'Urgent disability care', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
 { id: 'childcare', label: 'Child Care', icon: Baby, description: 'Emergency childcare needed', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
 { id: 'mental', label: 'Mental Health', icon: Brain, description: 'Crisis support needed', color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' },
 { id: 'homecare', label: 'Home Care', icon: Home, description: 'Urgent home assistance', color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
];

export default function EmergencyPage() {
 const navigate = useNavigate();
 const [step, setStep] = useState(1);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [formData, setFormData] = useState({
 category: '',
 urgency: 'within_hour',
 description: '',
 location: '',
 contactPhone: '',
 careRecipient: 'self',
 });

 const handleSubmit = async () => {
 setIsSubmitting(true);
 try {
 await submitEmergencyRequest({
 category: formData.category,
 urgency: formData.urgency,
 description: formData.description,
 location: formData.location,
 contact_phone: formData.contactPhone,
 care_recipient: formData.careRecipient,
 });
 setSubmitted(true);
 toast.success('Emergency request submitted. Our team will contact you shortly.');
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to submit emergency request. Please try again.');
 } else {
 toast.error('Failed to submit emergency request. Please try again.');
 }
 } finally {
 setIsSubmitting(false);
 }
 };

 const containerVariants: Variants = {
 hidden: { opacity: 0, y: 20 },
 visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
 exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
 };

 if (submitted) {
 return (
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="min-h-[80vh] flex items-center justify-center p-4 bg-stone-50/50"
 >
 <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-emerald-500/10 max-w-lg w-full text-center border border-emerald-100">
 <m.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: "spring", stiffness: 200, damping: 15 }}
 className="size-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30"
 >
 <CheckCircle className="size-12 text-white" />
 </m.div>
 <h1 className="text-3xl font-semibold text-stone-900 mb-4">Request Received</h1>
 <p className="text-stone-600 text-lg mb-8 leading-relaxed">
 We are broadcasting your request to nearby providers. You will receive a confirmation within <span className="font-bold text-stone-900">5 minutes</span>.
 </p>

 <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-left">
 <div className="flex gap-3">
 <Phone className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <p className="text-amber-900 text-sm font-medium leading-relaxed">
 For immediate life-threatening emergencies, please hang up and call <span className="font-bold text-lg">999</span> (Qatar) or <span className="font-bold text-lg">123</span> (Egypt).
 </p>
 </div>
 </div>

 <div className="space-y-4">
 <Button
 onClick={() => navigate('/careseeker/bookings')}
 className="w-full h-14 text-base font-bold bg-stone-900 hover:bg-stone-800 rounded-xl"
 >
 Track Request Status
 </Button>
 <Button
 variant="outline"
 onClick={() => navigate('/careseeker')}
 className="w-full h-14 text-base font-bold border-2 rounded-xl"
 >
 Return to Dashboard
 </Button>
 </div>
 </div>
 </m.div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50/50 pb-20">
 {/* Ambient Background */}
 <div className="fixed inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-0 right-0 size-[500px] bg-red-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
 <div className="absolute bottom-0 left-0 size-[500px] bg-teal-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
 </div>

 <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
 {/* Header */}
 <header className="mb-8">
 <div className="flex items-center gap-4 mb-6">
 <Link to="/careseeker" className="size-10 flex items-center justify-center bg-white rounded-xl ring-1 ring-stone-200/50 hover:bg-stone-50 hover:border-stone-300 transition-transform duration-300 ">
 <ArrowLeft className="size-5 text-stone-700" />
 </Link>
 <div>
 <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
 Emergency Care <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wide">SOS</span>
 </h1>
 <p className="text-stone-500 font-medium">Fast-track connection to urgent care providers</p>
 </div>
 </div>

 {/* SOS Banner */}
 <div className="relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl p-6 shadow-xl shadow-red-500/20 text-white">
 <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-4 text-center sm:text-left">
 <div className="size-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
 <Siren className="size-6 text-white" />
 </div>
 <div>
 <h3 className="font-semibold text-lg text-white">Life-Threatening Emergency?</h3>
 <p className="text-red-100 text-sm">Do not use this app. Call emergency services immediately.</p>
 </div>
 </div>
 <a href="tel:999" className="flex-shrink-0 bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-lg flex items-center gap-2">
 <Phone className="size-4" /> Call 999
 </a>
 </div>
 {/* Decorative circles */}
 <div className="absolute top-0 right-0 size-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
 </div>
 </header>

 {/* Progress Indicators */}
 <div className="flex items-center justify-between mb-8 px-2 relative">
 <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-200 rounded-full -z-10"></div>
 <div
 className="absolute top-1/2 left-0 h-1 bg-stone-900 rounded-full -z-10 transition-transform duration-300"
 style={{ width: `${((step - 1) / 2) * 100}%` }}
 ></div>

 {[1, 2, 3].map((s) => (
 <div key={s} className="flex flex-col items-center gap-2">
 <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm transition-transform duration-300 border-4 border-stone-50 ${step >= s ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20 scale-110' : 'bg-stone-100 text-stone-400' }`}>
 {s}
 </div>
 <span className={`text-xs font-bold uppercase tracking-wider ${step >= s ? 'text-stone-900' : 'text-stone-400'}`}>
 {s === 1 ? 'Category' : s === 2 ? 'Details' : 'Contact'}
 </span>
 </div>
 ))}
 </div>

 {/* Main Content Area */}
 <AnimatePresence mode="wait">
 {/* Step 1: Category Selection */}
 {step === 1 && (
 <m.div key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Stethoscope className="size-5 text-teal-600" />
 Select Emergency Type
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {EMERGENCY_CATEGORIES.map((category) => (
 <button
 key={category.id}
 onClick={() => {
 setFormData(prev => ({...prev, category: category.id }));
 setStep(2);
 }}
 className={`group relative p-6 rounded-[2rem] border transition-transform duration-300 text-left hover:-translate-y-1 active:scale-[0.98] hover:shadow-xl hover:shadow-stone-200/50 ${formData.category === category.id
 ? `bg-white border-stone-900 ring-2 ring-stone-900 ring-offset-2 ring-offset-stone-50 shadow-lg`
 : `bg-white ring-1 ring-stone-100/50 hover:border-stone-300`
 }`}
 >
 <div className={`size-12 rounded-2xl ${category.bg} ${category.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
 <category.icon className="size-6" />
 </div>
 <h3 className="text-lg font-semibold text-stone-900 mb-1">{category.label}</h3>
 <p className="text-sm text-stone-500 font-medium">{category.description}</p>

 <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
 <ArrowLeft className="size-5 text-stone-300 rotate-180" />
 </div>
 </button>
 ))}
 </div>
 </m.div>
 )}

 {/* Step 2: Details */}
 {step === 2 && (
 <m.div key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
 <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-stone-200/50 ring-1 ring-stone-100/50">
 <div className="space-y-8">
 {/* Urgency Section */}
 <div>
 <span className="block text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
 <Clock className="size-4 text-emerald-500" />
 Required Timeframe
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {[
 { id: 'asap', label: 'ASAP', sublabel: '< 30 Minutes', icon: Siren },
 { id: 'within_hour', label: 'Urgent', sublabel: '< 1 Hour', icon: Clock },
 { id: 'today', label: 'Today', sublabel: '< 4 Hours', icon: Calendar },
 ].map((urgency) => (
 <button
 key={urgency.id}
 onClick={() => setFormData(prev => ({...prev, urgency: urgency.id }))}
 className={`p-4 rounded-2xl border-2 transition-transform duration-300 flex flex-col items-center justify-center gap-2 ${formData.urgency === urgency.id ? 'border-red-500 bg-red-50 text-red-900 ring-1 ring-red-500' : 'ring-1 ring-stone-100/50 hover:border-stone-300 hover:bg-stone-50' }`}
 >
 {formData.urgency === urgency.id && <m.div layoutId="check" className="absolute top-2 right-2 text-red-500"><CheckCircle className="size-4" /></m.div>}
 <span className="font-bold">{urgency.label}</span>
 <span className="text-xs font-medium opacity-70">{urgency.sublabel}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Recipient Section */}
 <div>
 <span className="block text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
 <Users className="size-4 text-blue-500" />
 Review Recipient
 </span>
 <div className="flex bg-stone-100 p-1.5 rounded-2xl">
 {['self', 'family', 'other'].map((opt) => (
 <button
 key={opt}
 onClick={() => setFormData(prev => ({...prev, careRecipient: opt }))}
 className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-transform duration-300 ${formData.careRecipient === opt ? 'bg-white text-stone-900 ' : 'text-stone-500 hover:text-stone-700' }`}
 >
 {opt === 'self' ? 'Myself' : opt === 'family' ? 'Family' : 'Other'}
 </button>
 ))}
 </div>
 </div>

 {/* Description Section */}
 <div>
 <label htmlFor="input-src-app-careseeker-emergency-page-tsx-284-287" className="block text-sm font-bold text-stone-900 mb-4">
 Situation Details (Optional)
 </label>
 <div className="relative">
 <textarea
 value={formData.description}
 onChange={(e) => setFormData(prev => ({...prev, description: e.target.value }))}
 placeholder="Please briefly describe the symptoms or assistance required…"
 rows={4}
 className="w-full px-5 py-4 bg-stone-50 ring-1 ring-stone-200/50 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:outline-none focus:bg-white transition-transform duration-300 resize-none font-medium placeholder:text-stone-400"
 />
 <div className="absolute bottom-4 right-4 text-xs font-bold text-stone-400 pointer-events-none">
 SECURE
 </div>
 </div>
 </div>

 <div className="flex gap-4 pt-4">
 <Button
 variant="ghost"
 onClick={() => setStep(1)}
 className="px-6 h-12 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100"
 >
 Back
 </Button>
 <Button
 className="flex-1 h-12 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold flex items-center justify-center gap-2"
 onClick={() => setStep(3)}
 >
 Next Step <ArrowLeft className="size-4 rotate-180" />
 </Button>
 </div>
 </div>
 </div>
 </m.div>
 )}

 {/* Step 3: Contact & Submit */}
 {step === 3 && (
 <m.div key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
 <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-stone-200/50 ring-1 ring-stone-100/50">
 <div className="space-y-8">
 <div>
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Final Confirmation</h2>
 <p className="text-stone-500">Please provide your location so we can dispatch the nearest provider.</p>
 </div>

 <div className="space-y-5">
 <div>
 <label htmlFor="my-location" className="block text-sm font-bold text-stone-900 mb-2">My Location</label>
 <div className="relative">
 <input id="my-location"
 type="text"
 value={formData.location}
 onChange={(e) => setFormData(prev => ({...prev, location: e.target.value }))}
 placeholder="Building, Street, Area…"
 className="w-full pl-12 pr-4 py-4 bg-stone-50 ring-1 ring-stone-200/50 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:outline-none focus:bg-white transition-transform duration-300 font-medium"
 />
 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
 <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl  ring-1 ring-stone-100/50 text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors">
 <span className="text-xs font-bold">Autofill</span>
 </button>
 </div>
 </div>

 <div>
 <label htmlFor="mobile-number" className="block text-sm font-bold text-stone-900 mb-2">Mobile Number</label>
 <div className="relative">
 <input id="mobile-number"
 type="tel"
 value={formData.contactPhone}
 onChange={(e) => setFormData(prev => ({...prev, contactPhone: e.target.value }))}
 placeholder="+974 …"
 className="w-full pl-12 pr-4 py-4 bg-stone-50 ring-1 ring-stone-200/50 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:outline-none focus:bg-white transition-transform duration-300 font-medium"
 />
 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
 </div>
 </div>
 </div>

 <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex gap-4">
 <div className="size-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
 <Shield className="size-5 text-emerald-600" />
 </div>
 <div className="text-xs text-emerald-800 leading-relaxed font-medium">
 By tapping submit, you authorize Raiyah to broadcast this request to all verified providers within a 10km radius. This is a priority action.
 </div>
 </div>

 <div className="flex gap-4 pt-2">
 <Button
 variant="ghost"
 onClick={() => setStep(2)}
 className="px-6 h-14 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100"
 >
 Back
 </Button>
 <Button
 className={`flex-1 h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform duration-300 ${!formData.contactPhone ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 hover:-translate-y-1 active:scale-[0.98]' }`}
 onClick={handleSubmit}
 disabled={isSubmitting || !formData.contactPhone}
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 Broadcasting Request…
 </>
 ) : (
 <>
 <AlertTriangle className="size-5" />
 Submit Priority Request
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
}

// Helper for urgency icons in step 2 (used just to define types if needed, but inlined above)
function Calendar(props: React.SVGProps<SVGSVGElement>) {
 return (
 <svg
 {...props}
 xmlns="http://www.w3.org/2000/svg"
 width="24"
 height="24"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
 <line x1="16" x2="16" y1="2" y2="6" />
 <line x1="8" x2="8" y1="2" y2="6" />
 <line x1="3" x2="21" y1="10" y2="10" />
 </svg>
 )
}
