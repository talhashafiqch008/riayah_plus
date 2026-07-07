
import { useState, useEffect , useRef } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence, Variants } from "framer-motion";
import {
 Calendar,
 Clock,
 CheckCircle,
 Activity,
 FileText,
 Video,
 MapPin,
 AlertCircle,
 ChevronRight,
 Star,
 Pill,
 Stethoscope,
 HeartPulse,
 Sparkles,
 Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getCareTimeline } from '@/lib/api/careseeker';


const staggerContainer: Variants = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: {
 staggerChildren: 0.2,
 delayChildren: 0.1
 }
 }
};

const floatUp: Variants = {
 hidden: { opacity: 0, y: 50, scale: 0.9 },
 show: {
 opacity: 1,
 y: 0,
 scale: 1,
 transition: {
 type: "spring",
 stiffness: 40,
 damping: 15
 }
 }
};

const CATEGORY_CONFIG: Record<string, {
 icon: typeof Stethoscope;
 color: string;
 lightColor: string;
}> = {
 booking: { icon: Stethoscope, color: 'from-teal-400 to-emerald-500', lightColor: 'bg-emerald-50 text-emerald-700' },
 medication: { icon: Pill, color: 'from-purple-400 to-fuchsia-500', lightColor: 'bg-fuchsia-50 text-fuchsia-700' },
 report: { icon: FileText, color: 'from-blue-400 to-indigo-500', lightColor: 'bg-indigo-50 text-indigo-700' },
 video: { icon: Video, color: 'from-rose-400 to-pink-500', lightColor: 'bg-rose-50 text-rose-700' },
 emergency: { icon: HeartPulse, color: 'from-red-400 to-orange-500', lightColor: 'bg-red-50 text-red-700' },
 general: { icon: Activity, color: 'from-amber-400 to-orange-500', lightColor: 'bg-amber-50 text-amber-700' },
};

function getCategoryConfig(category: string) {
 return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
}

interface TimelineEvent {
 id: string;
 type: 'upcoming' | 'past';
 category: string;
 title: string;
 provider?: string;
 time: string;
 duration?: string;
 status: string;
 description?: string;
}

export default function TimelinePage() {
 const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
 const [events, setEvents] = useState<TimelineEvent[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 async function fetchTimeline() {
 try {
 setIsLoading(true);
 setError(null);
 const response = await getCareTimeline();
 const data = response.data || response;
 if (Array.isArray(data)) {
 setEvents(data);
 } else {
 setEvents([]);
 }
 } catch (err) {
 console.error('Failed to fetch care timeline', err);
 setError('Failed to load timeline events. Please try again.');
 } finally {
 setIsLoading(false);
 }
 }

 fetchTimeline();
 }, []);

 const filteredEvents = events.filter(event => {
 if (filter === 'all') return true;
 return event.type === filter;
 });

 if (isLoading) {
 return (
 <div className="max-w-5xl mx-auto space-y-12 pb-24 px-4 sm:px-6">
 <div className="relative overflow-hidden rounded-[3rem] bg-stone-900 p-12 text-white shadow-2xl shadow-stone-200/50 min-h-[300px] flex items-center justify-center">
 <Loader2 className="size-8 animate-spin text-teal-400" />
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-5xl mx-auto space-y-12 pb-24 px-4 sm:px-6">
 <div className="relative overflow-hidden rounded-[3rem] bg-stone-900 p-12 text-white shadow-2xl shadow-stone-200/50 min-h-[300px] flex items-center">
 <div className="absolute top-0 right-0 size-[500px] bg-gradient-to-br from-teal-600/30 to-purple-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
 <div className="absolute bottom-0 left-0 size-[400px] bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

 <div className="relative z-10 w-full">
 <m.div
 initial={{ opacity: 0, y: 30 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.8, ease: "easeOut" }}
 className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
 >
 <div>
 <div className="flex items-center gap-2 mb-4">
 <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold uppercase tracking-widest text-teal-200">
 Your Health Journey
 </span>
 </div>
 <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-4 text-white">
 Care Timeline
 </h1>
 <p className="text-stone-300 max-w-xl text-lg leading-relaxed">
 A holistic view of your care history, upcoming appointments, and health milestones, beautifully organized for you.
 </p>
 </div>

 <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10">
 {['all', 'upcoming', 'past'].map((tab) => (
 <button
 key={tab}
 onClick={() => setFilter(tab as 'all' | 'upcoming' | 'past')}
 className={`relative px-6 py-3 rounded-xl text-sm font-bold transition-transform duration-300 ${filter === tab ? 'text-stone-900 shadow-lg' : 'text-stone-400 hover:text-white hover:bg-white/5' }`}
 >
 {filter === tab && (
 <m.div
 layoutId="activeTab"
 className="absolute inset-0 bg-white rounded-xl"
 transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
 />
 )}
 <span className="relative z-10 capitalize">{tab}</span>
 </button>
 ))}
 </div>
 </m.div>
 </div>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
 <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-red-900">Error</p>
 <p className="text-sm text-red-700">{error}</p>
 <Button
 size="sm"
 variant="outline"
 className="mt-2"
 onClick={() => window.location.reload()}
 >
 Retry
 </Button>
 </div>
 </div>
 )}

 <m.div
 variants={staggerContainer}
 initial="hidden"
 animate="show"
 className="relative"
 >
 <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-1 md:-ml-0.5 bg-gradient-to-b from-stone-200 via-stone-200 to-transparent rounded-full opacity-50" />

 <div className="space-y-16">
 <AnimatePresence mode='popLayout'>
 {filteredEvents.map((event, index) => {
 const isEven = index % 2 === 0;
 const config = getCategoryConfig(event.category);
 const IconComponent = config.icon;
 return (
 <m.div
 key={event.id}
 variants={floatUp}
 layout
 className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 relative ${isEven ? 'md:flex-row-reverse' : '' }`}
 >
 <div className="absolute left-[10px] md:left-1/2 top-0 md:top-8 -ml-0 md:-ml-5 z-20 flex flex-col items-center">
 <div className={`size-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.1)] border-4 border-white bg-gradient-to-br ${config.color} transition-transform duration-500 hover:scale-110`}>
 <IconComponent className="size-4 text-white" />
 </div>
 </div>

 <div className={`w-full md:w-[calc(50%-4rem)] pl-16 md:pl-0 ${!isEven ? 'md:text-right' : ''}`}>
 <div className={`mb-3 flex items-center gap-2 ${!isEven ? 'md:justify-end' : ''}`}>
 <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-bold uppercase tracking-wider">
 {event.time.split(',')[0]}
 </span>
 </div>

 <div className="group relative bg-white rounded-[2.5rem] p-8 transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-stone-100/50">
 <div className={`absolute -inset-1 rounded-[2.6rem] bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />

 <div className="relative z-10">
 <div className={`flex items-start gap-4 mb-4 ${!isEven ? 'md:flex-row-reverse' : ''}`}>
 <div className={`p-3 rounded-2xl ${config.lightColor} hidden sm:flex items-center justify-center`}>
 <IconComponent className="size-6" />
 </div>
 <div>
 <h3 className="text-xl font-semibold text-stone-900 group-hover:text-stone-900 transition-transform duration-300">
 {event.title}
 </h3>
 <p className="text-sm font-medium text-stone-500 mt-1">
 {event.provider}
 </p>
 </div>
 </div>

 <p className="text-stone-600 text-sm leading-relaxed mb-6">
 {event.description || `${event.title} scheduled for ${event.time}.`}
 </p>

 <div className={`flex items-center gap-3 ${!isEven ? 'md:flex-row-reverse' : ''}`}>
 {event.status === 'confirmed' && (
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
 <div className="size-2 rounded-full bg-teal-500 animate-pulse" />
 Confirmed
 </div>
 )}
 {event.status === 'completed' && (
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-bold">
 <CheckCircle className="size-3.5" />
 Done
 </div>
 )}
 {event.status === 'pending' && (
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
 <Clock className="size-3.5" />
 Pending
 </div>
 )}

 <div className="flex-1" />

 <button className="flex items-center gap-1 text-sm font-bold text-stone-400 group-hover:text-stone-900 transition-colors">
 Details <ChevronRight className="size-4" />
 </button>
 </div>
 </div>
 </div>
 </div>

 <div className="hidden md:block w-[calc(50%-4rem)]" />
 </m.div>
 );
 })}
 </AnimatePresence>
 </div>
 </m.div>

 {filteredEvents.length === 0 && !error && (
 <div className="text-center py-24">
 <m.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 className="inline-flex items-center justify-center size-24 rounded-full bg-stone-50 mb-6"
 >
 <Sparkles className="size-10 text-stone-300" />
 </m.div>
 <h3 className="text-xl font-semibold text-stone-900">No events found</h3>
 <p className="text-stone-500 mt-2">Your timeline is empty for this filter.</p>
 <Link to="/careseeker/providers">
 <Button className="mt-4">Book a Session</Button>
 </Link>
 </div>
 )}

 <div className="flex justify-center pt-8">
 <Link to="/careseeker">
 <Button variant="ghost" className="text-stone-400 hover:text-stone-600">
 Return to Dashboard
 </Button>
 </Link>
 </div>
 </div>
 );
}
