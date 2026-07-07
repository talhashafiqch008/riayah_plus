
;
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
 Shield, MapPin, Star, UserCheck, Calendar,
 MessageCircle, Heart, Stethoscope, Clock,
 CheckCircle, ArrowLeft, Loader2
} from "lucide-react";
import { getProviderById } from '@/lib/api';
import { CARE_TYPES, SUPPORT_AREAS, CLINICAL_SKILLS } from "@/lib/taxonomy";




interface ProviderProfile {
 id: string;
 firstName: string;
 lastName: string;
 role: string;
 avatar?: string;
 verificationStatus?: string;
 profile?: {
 bio?: string;
 skills?: string[];
 questionnaire?: {
 languages?: string[];
 };
 };
}

export default function ProviderProfilePage() {
 const params = useParams();
 const navigate = useNavigate();
 const [provider, setProvider] = useState<ProviderProfile | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (params.id) {
 loadProvider(params.id as string);
 }
 }, [params.id]);

 const loadProvider = async (id: string) => {
 try {
 setLoading(true);
 const data = await getProviderById(id);
 setProvider(data);
 } catch (error) {
 console.error("Failed to load provider", error);
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-stone-50">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 );
 }

 if (!provider) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-stone-50">
 <div className="text-center">
 <UserCheck className="size-12 text-stone-300 mx-auto mb-4" />
 <h2 className="text-xl font-semibold text-stone-900">Provider Not Found</h2>
 <button onClick={() => navigate(-1)} className="mt-4 text-teal-600 font-bold hover:underline">
 Go Back
 </button>
 </div>
 </div>
 );
 }

 // Helper to find taxonomy labels
 // const getSkillLabel = (id: string) => {
 // return [...CARE_TYPES, ...SUPPORT_AREAS, ...CLINICAL_SKILLS].find(t => t.id === id)?.label || id.replace(/_/g, ' ');
 // };

 const isClinical = ['GP', 'Nurse', 'Physiotherapist'].includes(provider.role);

 return (
 <div className="min-h-screen bg-stone-50 font-body pb-20">
 {/* Nav */}
 <nav className="bg-white border-b border-stone-200 sticky top-0 z-30">
 <div className="container mx-auto px-6 h-16 flex items-center justify-between">
 <button onClick={() => navigate(-1)} className="flex items-center text-stone-500 hover:text-stone-900 font-bold">
 <ArrowLeft className="size-5 mr-2" /> Back
 </button>
 <span className="font-bold text-stone-900">Provider Profile</span>
 <div className="w-8" />
 </div>
 </nav>

 <main className="container mx-auto px-6 py-8 max-w-5xl">
 <div className="grid lg:grid-cols-3 gap-8">

 {/* Left Column: Profile Card */}
 <div className="lg:col-span-1">
 <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden sticky top-24">
 <div className="h-32 bg-gradient-to-br from-teal-500 to-teal-700 relative">
 {provider.verificationStatus === 'verified' && (
 <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center text-white text-xs font-bold border border-white/30">
 <Shield className="size-3 mr-1 fill-white" /> VERIFIED
 </div>
 )}
 </div>
 <div className="px-6 pb-6 text-center -mt-16">
 <div className="size-32 mx-auto bg-white rounded-full p-1 shadow-lg mb-4">
 <div className="size-full bg-stone-100 rounded-full relative overflow-hidden">
 {provider.avatar ? (
 <img width={100} height={100} src={provider.avatar} alt={`${provider.firstName} ${provider.lastName}`} className="size-full object-cover" loading="lazy" />
 ) : (
 <div className="size-full flex items-center justify-center bg-stone-200 text-stone-400 font-bold text-3xl">
 {provider.firstName[0]}
 </div>
 )}
 </div>
 </div>

 <h1 className="text-2xl font-semibold text-stone-900 mb-1">
 {provider.firstName} {provider.lastName}
 </h1>
 <div className="inline-flex items-center gap-2 mb-4">
 <span className="text-teal-600 font-bold uppercase tracking-wider text-sm bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">
 {provider.role}
 </span>
 {isClinical && (
 <span className="text-stone-500 font-bold text-xs bg-stone-100 px-2 py-1 rounded-lg border border-stone-200" title="License Verified">
 LICENSED
 </span>
 )}
 </div>

 <div className="flex justify-center gap-6 text-sm mb-6 border-t border-b border-stone-50 py-4">
 <div className="text-center">
 <div className="flex items-center justify-center gap-1 font-bold text-stone-900 text-lg">
 <Star className="size-4 text-amber-400 fill-amber-400" />
 4.9
 </div>
 <span className="text-stone-400 text-xs">Rating</span>
 </div>
 <div className="text-center">
 <div className="font-bold text-stone-900 text-lg">120+</div>
 <span className="text-stone-400 text-xs">Hours</span>
 </div>
 <div className="text-center">
 <div className="font-bold text-stone-900 text-lg">3</div>
 <span className="text-stone-400 text-xs">Years Exp</span>
 </div>
 </div>

 <div className="space-y-3">
 <button
 onClick={() => navigate(`/patient/appointments/book?providerId=${provider.id}`)}
 className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-200 transition-all active:scale-95 flex items-center justify-center gap-2"
 >
 Request Session <Calendar className="size-4" />
 </button>
 <button className="w-full py-3 bg-white border-2 border-stone-100 hover:border-teal-200 text-stone-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2">
 Message <MessageCircle className="size-4" />
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Right Column: Details */}
 <div className="lg:col-span-2 space-y-6">
 {/* Bio */}
 <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200">
 <h2 className="text-xl font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <UserCheck className="size-5 text-teal-600" /> About {provider.firstName}
 </h2>
 <p className="text-stone-600 leading-relaxed">
 {provider.profile?.bio || `A dedicated ${provider.role} focused on providing high-quality care. Verified and background checked.`}
 </p>
 </div>

 {/* Skills & Experience */}
 <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200">
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Stethoscope className="size-5 text-teal-600" /> Skills & Services
 </h2>

 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">Specialized Skills</h3>
 <div className="flex flex-wrap gap-2">
 {provider.profile?.skills?.map((skill: string) => (
 <span key={skill} className="px-3 py-1.5 bg-stone-50 text-stone-700 font-medium rounded-lg border border-stone-200">
 {/* {getSkillLabel(skill)} */}
 </span>
 ))}
 {!provider.profile?.skills?.length && <span className="text-stone-400 italic">No specific skills listed</span>}
 </div>
 </div>

 <div>
 <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">Languages Spoken</h3>
 <div className="flex flex-wrap gap-2">
 {provider.profile?.questionnaire?.languages?.map((lang: string) => (
 <span key={lang} className="px-3 py-1.5 bg-teal-50 text-teal-700 font-bold rounded-lg border border-teal-100 text-sm">
 {lang}
 </span>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Availability Snapshot (Visual Mock) */}
 <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200">
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Clock className="size-5 text-teal-600" /> Availability
 </h2>
 <div className="flex gap-2 justify-between">
 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
 <div key={day} className="flex flex-col items-center gap-2">
 <span className="text-xs font-bold text-stone-400 uppercase">{day}</span>
 <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold ${i < 5 ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-300' }`}>
 {i < 5 ? <CheckCircle className="size-5" /> : '-'}
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>
 </div>
 </main>
 </div>
 );
}
