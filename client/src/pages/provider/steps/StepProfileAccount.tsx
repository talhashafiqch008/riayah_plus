

import { useState, useRef } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, User, Quote, Star, Sparkles, CheckCircle2, Upload, X, ShieldCheck, MapPin, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import type { ProviderOnboardingData } from "../OnboardingPage";

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepProfileAccountProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepProfileAccount({ data, onUpdate, onNext, onBack }: StepProfileAccountProps) {
 const [profilePhoto, setProfilePhoto] = useState<string | null>(data.profilePhoto || null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const fullName = `${data.firstName || 'Provider'} ${data.lastName || ''}`;

 const getBio = (): string => {
 const creds = (data.clinicalCredentials as Record<string, unknown>)?.bio as string;
 const skills = (data.supportSkills as Record<string, unknown>)?.bio as string;
 return data.roleCategory === 'HEALTHCARE' ? (creds || '') : (skills || '');
 };

 const getBioLength = (): number => {
 const creds = ((data.clinicalCredentials as Record<string, unknown>)?.bio as string)?.length || 0;
 const skills = ((data.supportSkills as Record<string, unknown>)?.bio as string)?.length || 0;
 return creds || skills;
 };

 const handleContinue = () => {
 if (!processValidation()) return;
 onNext();
 };

 const processValidation = () => {
 if (!data.firstName?.trim() || !data.lastName?.trim()) {
 toast.error('Please enter your name');
 return false;
 }
 return true;
 };

 const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 if (!file.type.startsWith('image/')) {
 toast.error('Please upload an image file');
 return;
 }
 if (file.size > 5 * 1024 * 1024) {
 toast.error('Image size should be less than 5MB');
 return;
 }

 const reader = new FileReader();
 reader.onloadend = () => {
 const photoUrl = reader.result as string;
 setProfilePhoto(photoUrl);
 // Store both the preview URL and the raw file
 onUpdate({
 profilePhoto: photoUrl,
 profilePhotoFile: file
 });
 };
 reader.readAsDataURL(file);
 }
 };

 const handleRemovePhoto = (e: React.MouseEvent) => {
 e.stopPropagation();
 setProfilePhoto(null);
 onUpdate({ profilePhoto: null, profilePhotoFile: undefined });
 if (fileInputRef.current) fileInputRef.current.value = '';
 };

 return (
 <div className="space-y-8">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200/50 ring-4 ring-teal-50">
 <User className="size-7 text-white" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">Your Profile</h2>
 <p className="text-stone-500 text-lg">Create a professional presence that stands out.</p>
 </div>
 </div>
 </m.div>

 <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

 {/* Left Column: Form */}
 <m.div className="flex-1 w-full space-y-8 order-2 lg:order-1" {...fadeIn} transition={{ delay: 0.1 }}>

 {/* Photo Upload - Horizontal on mobile, cleaner */}
 <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
 <h3 className="font-semibold text-stone-900 mb-4">Profile Photo</h3>
 <div className="flex items-center gap-6">
 <div role="button" tabIndex={0}
 onClick={() => fileInputRef.current?.click()}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`relative size-24 rounded-full overflow-hidden cursor-pointer transition-all duration-300 group ${profilePhoto ? 'ring-4 ring-indigo-100' : 'bg-stone-50 border-2 border-dashed border-stone-300 hover:border-indigo-400 hover:bg-indigo-50' }`}
 >
 {profilePhoto ? (
 <img src={profilePhoto} alt="Profile" className="size-full object-cover" />
 ) : (
 <div className="size-full flex flex-col items-center justify-center text-stone-400 group-hover:text-teal-500">
 <Camera className="size-8" />
 </div>
 )}

 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
 <span className="text-white text-xs font-bold">Change</span>
 </div>
 </div>

 <div className="flex-1">
 <p className="text-sm text-stone-600 mb-3 leading-relaxed">
 Upload a clear, professional photo. This is the first thing clients will see.
 </p>
 <div className="flex gap-3">
 <button
 onClick={() => fileInputRef.current?.click()}
 className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2"
 >
 <Upload className="size-3" />
 Upload Photo
 </button>
 {profilePhoto && (
 <button
 onClick={handleRemovePhoto}
 className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
 >
 <X className="size-3" />
 Remove
 </button>
 )}
 </div>
 <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
 </div>
 </div>
 </div>

 {/* Personal Details */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="space-y-2">
 <label htmlFor="first-name" className="text-sm font-bold text-stone-700 ml-1">First Name</label>
 <input id="first-name"
 type="text"
 value={data.firstName || ''}
 onChange={(e) => onUpdate({ firstName: e.target.value })}
 placeholder="e.g. Sarah"
 className="w-full px-5 py-4 bg-white border-2 border-stone-100 rounded-xl text-stone-900 font-bold placeholder:text-stone-300 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
 />
 </div>
 <div className="space-y-2">
 <label htmlFor="last-name" className="text-sm font-bold text-stone-700 ml-1">Last Name</label>
 <input id="last-name"
 type="text"
 value={data.lastName || ''}
 onChange={(e) => onUpdate({ lastName: e.target.value })}
 placeholder="e.g. Ahmed"
 className="w-full px-5 py-4 bg-white border-2 border-stone-100 rounded-xl text-stone-900 font-bold placeholder:text-stone-300 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
 />
 </div>
 </div>

 {/* Bio */}
 <div className="space-y-2">
 <div className="flex justify-between items-center ml-1">
 <span className="text-sm font-bold text-stone-700">Bio</span>
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${getBioLength() > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-stone-100 text-stone-400' }`}>
 {getBioLength()}/500
 </span>
 </div>
 <div className="relative">
 <textarea
 value={getBio()}
 onChange={(e) => {
 const val = e.target.value;
 if (data.roleCategory === 'HEALTHCARE') {
 onUpdate({ clinicalCredentials: { ...data.clinicalCredentials, bio: val } });
 } else {
 onUpdate({ supportSkills: { ...data.supportSkills, bio: val } });
 }
 }}
 placeholder="Introduce yourself to potential clients. Highlight your experience and passion for care..."
 rows={6}
 maxLength={500}
 className="w-full p-5 bg-white border-2 border-stone-100 rounded-2xl text-stone-800 font-medium placeholder:text-stone-300 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 resize-none transition-all leading-relaxed"
 />
 <div className="absolute right-4 bottom-4 pointer-events-none">
 <Quote className="size-6 text-stone-200" />
 </div>
 </div>
 <p className="text-xs text-stone-400 ml-1 flex items-center gap-1.5">
 <Sparkles className="size-3 text-teal-400" />
 <span>Pro tip: Keep it friendly and mention your years of experience.</span>
 </p>
 </div>

 </m.div>

 {/* Right Column: Live Preview */}
 <m.div
 className="w-full lg:w-[380px] order-1 lg:order-2"
 {...fadeIn}
 transition={{ delay: 0.2 }}
 >
 <div className="sticky top-8">
 <div className="text-center mb-6 lg:text-left flex items-center justify-between">
 <span className="text-xs font-bold uppercase tracking-widest text-stone-400 bg-stone-100 px-3 py-1 rounded-full">Live Preview</span>
 </div>

 {/* ID Card */}
 <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-teal-100/50 border border-stone-100 relative group">
 {/* Header Background */}
 <div className="h-28 bg-gradient-to-r from-teal-500 to-teal-600 relative overflow-hidden">
 <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20"></div>
 <div className="absolute -bottom-8 -right-8 size-32 bg-white/10 rounded-full blur-2xl"></div>
 </div>

 <div className="px-6 pb-6 relative">
 {/* Photo - overlapping header */}
 <div className="absolute -top-12 left-6">
 <div className="p-1 bg-white rounded-2xl shadow-md">
 <div className="size-24 bg-stone-100 rounded-xl overflow-hidden relative">
 {profilePhoto ? (
 <img src={profilePhoto} className="size-full object-cover" alt="Profile" />
 ) : (
 <User className="size-10 text-stone-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
 )}
 </div>
 </div>
 </div>

 {/* Verification Badge */}
 <div className="absolute top-4 right-2">
 <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide border border-emerald-100 shadow-sm">
 <ShieldCheck className="size-3" />
 <span>Verified</span>
 </div>
 </div>

 {/* Content - with margin to clear photo */}
 <div className="mt-16 space-y-2">
 <h3 className="text-xl font-semibold text-stone-900 truncate pr-2">
 {(data.firstName || data.lastName) ? fullName : 'Your Name'}
 </h3>

 <div className="flex flex-col gap-1">
 <p className="text-sm font-medium text-stone-600 flex items-center gap-2">
 <Briefcase className="size-3.5 text-teal-500" />
 {data.role || 'Provider Role'}
 </p>
 {data.country && (
 <p className="text-xs text-stone-400 flex items-center gap-2">
 <MapPin className="size-3.5" />
 {data.country}
 </p>
 )}
 </div>
 </div>

 {/* Rating */}
 <div className="mt-4 flex items-center gap-2 bg-stone-50 w-fit px-3 py-1.5 rounded-lg border border-stone-100">
 <div className="flex gap-0.5">
 {[1, 2, 3, 4, 5].map(i => <Star key={`star-${i}`} className="size-3 fill-amber-400 text-amber-400" />)}
 </div>
 <span className="text-xs font-bold text-stone-700">5.0</span>
 <span className="text-[10px] text-stone-400 font-medium">(New Profile)</span>
 </div>

 {/* Bio */}
 <div className="mt-5 pt-5 border-t border-stone-100">
 <p className="text-sm text-stone-600 italic leading-relaxed line-clamp-3">
 "{getBio() || 'Your bio will appear here. Write something that connects with families!'}"
 </p>
 </div>

 {/* Buttons */}
 <div className="mt-6 flex gap-3">
 <div className="flex-1 py-3 bg-stone-900 text-white text-xs font-bold rounded-xl flex items-center justify-center shadow-lg shadow-stone-200">
 Book Now
 </div>
 <div className="flex-1 py-3 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center hover:bg-stone-50 transition-colors">
 Message
 </div>
 </div>
 </div>
 </div>

 {data.firstName && data.lastName && (
 <m.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-5 p-4 rounded-2xl bg-white border border-emerald-100 shadow-xl shadow-emerald-100/20 flex items-center gap-4"
 >
 <div className="size-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-emerald-200">
 <CheckCircle2 className="size-5" />
 </div>
 <div>
 <p className="text-sm font-bold text-stone-900">Looking Professional!</p>
 <p className="text-xs text-stone-500">Your profile is ready to attract clients.</p>
 </div>
 </m.div>
 )}
 </div>
 </m.div>

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
 onClick={handleContinue}
 whileHover={{ scale: 1.02, x: 5 }}
 whileTap={{ scale: 0.98 }}
 className="px-8 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-3 bg-stone-900 text-white hover:bg-stone-800 shadow-stone-300 hover:shadow-xl"
 >
 Continue
 <ArrowRight className="size-5 stroke-[3px]" />
 </m.button>
 </m.div>
 </div>
 );
}
