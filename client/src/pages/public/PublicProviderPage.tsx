
import { useState, useEffect , useRef } from 'react';
import { useParams } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
 MapPin, Star, User, Languages, Stethoscope,
 Award, Clock, Calendar, ShieldCheck, Heart,
 MessageCircle, MoveRight, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
;
import { getDoctorById } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { WhatsAppWidget } from '@/components/WhatsAppWidget';




interface Review {
 id: number;
 rating: number;
 comment: string;
 authorName?: string;
 createdAt?: string;
}

interface DoctorProfile {
 public_profile_id: string;
 name: string;
 avatar: string | null;
 specialties: string[];
 languages: string[];
 gender: 'male' | 'female';
 hourly_rate: string;
 city: string | null;
 bio: string;
 average_rating: number;
 rating_count: number;
 service_location?: string;
 reviews?: Review[];

 // UI Helpers / Optional from DB
 id?: number;
 years_of_experience?: number;
 qualifications?: string[];
 time_available?: {
 days: string[];
 timeSlots: string[];
 };
}

const formatRole = (specialties: string[]) => {
 if (!specialties || !specialties.length) return 'Healthcare Provider';
 return specialties[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function DoctorProfilePage() {
 const params = useParams();
 const id = params?.id as string;
 const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 const fetchDoctor = async () => {
 if (!id) return;
 try {
 // Using the specific API endpoint requested
 const data = await getDoctorById(id);

 if (data.success && data.data) {
 setDoctor(data.data);
 } else {
 setError('Doctor not found');
 }
 } catch (err) {
 console.error(err);
 setError('Failed to load profile');

 // Fallback for development if API fails (optional, remove in prod)
 // This ensures we can see the UI even if the backend endpoint isn't fully ready
 } finally {
 setLoading(false);
 }
 };

 fetchDoctor();
 }, [id]);

 if (loading) {
 return (
 <div className="min-h-screen bg-stone-50 flex flex-col">
 <Navbar />
 <div className="flex-1 flex items-center justify-center">
 <div className="size-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
 </div>
 </div>
 );
 }

 if (error || !doctor) {
 return (
 <div className="min-h-screen bg-stone-50 flex flex-col">
 <Navbar />
 <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">Profile Not Found</h2>
 <p className="text-stone-500 mb-6">{error || "We couldn't find the doctor you're looking for."}</p>
 <Link to="/browse" className="px-6 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors">
 Back to Experts
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#F8FAFC]">
 <Navbar />

 <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
 {/* Breadcrumb / Back */}
 <Link
 to="/browse"
 className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-teal-600 mb-8 transition-colors"
 >
 <ArrowLeft size={16} /> Back to Browse
 </Link>

 <div className="grid lg:grid-cols-12 gap-8 items-start">

 {/* Left Column: Profile Card */}
 <div className="lg:col-span-4 space-y-6">
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-[2rem] p-6 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-stone-100 overflow-hidden relative"
 >
 <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-50 to-lime-50" />

 <div className="relative flex flex-col items-center text-center">
 <div className="size-32 rounded-3xl bg-white p-1.5 shadow-xl shadow-stone-100 mb-4">
 <div className="size-full rounded-2xl bg-stone-50 overflow-hidden relative">
 {doctor.avatar && doctor.avatar.startsWith('http') ? (
 <img
 src={doctor.avatar}
 alt={doctor.name}
 width={128}
 height={128}
 className="size-full object-cover"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-5xl">
 {doctor.avatar || (doctor.gender === 'male' ? '👨‍⚕️' : '👩‍⚕️')}
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 mb-1">
 <h1 className="text-2xl font-semibold text-stone-900">{doctor.name}</h1>
 <ShieldCheck className="size-5 text-teal-500 fill-teal-500/10" />
 </div>
 <p className="text-teal-600 font-medium mb-4">{formatRole(doctor.specialties)}</p>

 <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-full mb-6">
 <Star className="size-4 text-amber-400 fill-amber-400" />
 <span className="font-bold text-stone-900">{doctor.average_rating ? Number(doctor.average_rating).toFixed(1) : 'New'}</span>
 {doctor.rating_count !== undefined && doctor.rating_count > 0 && (
 <span className="text-stone-400 text-sm">({doctor.rating_count} reviews)</span>
 )}
 </div>

 <div className="w-full flex gap-3 mb-6">
 <div className="bg-stone-50 p-3 rounded-2xl flex-1">
 <p className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-1">Rate</p>
 <p className="font-bold text-stone-900">QAR {Math.round(parseFloat(doctor.hourly_rate))}<span className="text-xs text-stone-400 font-normal">/hr</span></p>
 </div>
 {doctor.years_of_experience && (
 <div className="bg-stone-50 p-3 rounded-2xl flex-1">
 <p className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-1">XP</p>
 <p className="font-bold text-stone-900">{doctor.years_of_experience} Years</p>
 </div>
 )}
 </div>

 <div className="w-full space-y-3">
 <button
 className="w-full py-3.5 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/10"
 onClick={() => window.open(`/login`, '_blank')}
 >
 Book Now <MoveRight size={18} />
 </button>
 <button
 onClick={() => window.open(`https://wa.me/?phone=15551790682&text=Hi, I have a question for Dr. ${doctor.name} and id : ${doctor.public_profile_id}`)}
 className="w-full py-3.5 bg-white text-stone-900 border-2 border-stone-100 rounded-xl font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
 >
 <MessageCircle size={18} className="text-green-600" /> Chat via WhatsApp
 </button>
 </div>
 </div>
 </m.div>

 {doctor.time_available && (
 <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-100">
 <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <Clock size={18} className="text-teal-500" /> Availability
 </h3>
 <div className="space-y-4">
 {doctor.time_available.days && doctor.time_available.days.length > 0 && (
 <div>
 <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">Days</p>
 <div className="flex flex-wrap gap-2">
 {doctor.time_available.days.map(day => (
 <span key={day} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm capitalize font-medium border border-teal-100">
 {day}
 </span>
 ))}
 </div>
 </div>
 )}

 {doctor.time_available.timeSlots && doctor.time_available.timeSlots.length > 0 && (
 <div>
 <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">Time Slots</p>
 <div className="flex flex-wrap gap-2">
 {doctor.time_available.timeSlots.map(slot => (
 <span key={slot} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm capitalize font-medium border border-orange-100">
 {slot}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Right Column: Details */}
 <m.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.1 }}
 className="lg:col-span-8 space-y-8"
 >
 {/* About */}
 <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-100">
 <h2 className="text-xl font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <User className="text-teal-500" size={24} /> About Dr. {doctor.name}
 </h2>
 <div className="prose prose-gray max-w-none text-stone-600 leading-relaxed">
 <p>{doctor.bio || `No biography available.`}</p>
 </div>
 </section>

 {/* Stats Grid */}
 <div className="grid md:grid-cols-2 gap-4">
 <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
 <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <Languages className="text-blue-500" size={20} /> Languages
 </h3>
 <div className="flex flex-wrap gap-2">
 {doctor.languages.map(lang => (
 <span key={lang} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
 {lang}
 </span>
 ))}
 </div>
 </div>
 <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
 <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <MapPin className="text-red-500" size={20} /> Location
 </h3>
 <p className="text-stone-600 font-medium">{doctor.city || 'Location not specified'}</p>
 <p className="text-sm text-stone-400 mt-1">Available for home visits</p>
 </div>
 </div>

 {/* Specialties */}
 <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-100">
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Stethoscope className="text-purple-500" size={24} /> Specialties & Expertise
 </h2>
 <div className="flex flex-wrap gap-3">
 {doctor.specialties.map(spec => (
 <div key={spec} className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-xl font-medium border border-purple-100/50">
 <div className="size-1.5 rounded-full bg-purple-500" />
 {spec.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
 </div>
 ))}
 {(!doctor.specialties || doctor.specialties.length === 0) && (
 <span className="text-stone-500 italic">No specific specialties listed</span>
 )}
 </div>
 </section>

 {/* Qualifications (Static for now as not in interface, but good for UI) */}
 {/* Qualifications */}
 {doctor.qualifications && doctor.qualifications.length > 0 && (
 <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-stone-100">
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Award className="text-orange-500" size={24} /> Qualifications
 </h2>
 <div className="space-y-4">
 {doctor.qualifications.map((qual) => (
 <div key={qual} className="flex gap-4">
 <div className="size-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
 <Award className="size-6 text-orange-500" />
 </div>
 <div>
 <h4 className="font-semibold text-stone-900">{qual}</h4>
 </div>
 </div>
 ))}
 </div>
 </section>
 )}

 </m.div>
 </div>
 </main>

 <WhatsAppWidget selectedCategory={doctor.specialties?.[0] || 'General'} />
 </div>
 );
}
