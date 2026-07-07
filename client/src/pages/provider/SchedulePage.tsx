
import { useState, useEffect, useMemo } from 'react';
import {
 Calendar as CalendarIcon, Clock, MapPin, Video,
 User, ChevronRight, MoreHorizontal, Filter,
 CheckCircle, XCircle, AlertCircle, Play, Square,
 Briefcase, DollarSign, Target, Loader2, LucideIcon
} from 'lucide-react';
import { completeBookingSession, getProviderSchedule, startBookingSession } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { Link } from 'react-router-dom';
import { BCard } from '@/components/BCard';
import { StatPill } from '@/components/StatPill';


interface ScheduleItem {
 id: string;
 client: {
 id: string;
 name: string;
 avatar: string | null;
 };
 serviceType: string;
 consultationMethod: string;
 scheduledAt: string;
 startTime: string;
 endTime: string;
 status: string;
 notes: string;
 meetingLink: string | null;
}

export default function SchedulePage() {
 const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

 useEffect(() => {
 fetchSchedule();
 }, []);

 const fetchSchedule = async () => {
 try {
 setLoading(true);
 const data = await getProviderSchedule();
 if (data?.schedule) {
 setSchedule(data.schedule);
 }
 } catch (error) {
 console.error(error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load schedule');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load schedule');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleStartSession = async (bookingId: string) => {
 try {
 await startBookingSession(bookingId);
 toast.success('Session started successfully');
 setSchedule(prev => prev.map(item =>
 item.id === bookingId ? { ...item, status: 'in_progress' } : item
 ));
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to start session');
 } else {
 toast.error('Failed to start session');
 }
 }
 };

 const handleCompleteSession = async (bookingId: string) => {
 try {
 await completeBookingSession(bookingId);
 toast.success('Session completed successfully');
 setSchedule(prev => prev.filter(item => item.id !== bookingId));
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to complete session');
 } else {
 toast.error('Failed to complete session');
 }
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
 case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-100';
 case 'completed': return 'bg-stone-100 text-stone-700 border-stone-200';
 default: return 'bg-stone-50 text-stone-700 border-stone-100';
 }
 };

 const formatTime = (timeStr: string) => {
 if (!timeStr) return '';
 // Assuming HH:MM:SS format
 const [h, m] = timeStr.split(':');
 const hour = parseInt(h);
 const ampm = hour >= 12 ? 'PM' : 'AM';
 const hour12 = hour % 12 || 12;
 return `${hour12}:${m} ${ampm}`;
 };

  const filteredSchedule = useMemo(() => schedule.filter(item => {
  if (activeTab === 'upcoming') {
  return ['confirmed', 'in_progress', 'accepted_awaiting_payment'].includes(item.status);
  }
  return ['completed', 'cancelled'].includes(item.status);
  }), [schedule, activeTab]);

 return (
 <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 My Schedule
 <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-xs font-bold text-teal-600 hidden sm:inline-block">
 {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
 </span>
 </h1>
 <p className="text-stone-500 mt-2 font-medium max-w-2xl">
 Manage your appointments and track your daily flow.
 </p>
 </div>

 <div className="flex bg-stone-100 p-1 rounded-xl">
 <button
 onClick={() => setActiveTab('upcoming')}
 className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
 >
 Upcoming
 </button>
 <button
 onClick={() => setActiveTab('history')}
 className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
 >
 History
 </button>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <BCard>
 <StatPill
 label="Today's Sessions"
 value={schedule.filter(s => s.status === 'confirmed').length}
 subtext="Confirmed appointments"
 icon={CalendarIcon}
 bgColor="bg-blue-50"
 iconColor="text-blue-600"
 />
 </BCard>
 <BCard>
 <StatPill
 label="Hours Booked"
 value="4.5"
 subtext="Total duration today"
 icon={Clock}
 bgColor="bg-teal-50"
 iconColor="text-teal-600"
 />
 </BCard>
 <BCard>
 <StatPill
 label="Completion Rate"
 value="100%"
 subtext="On-time performance"
 icon={CheckCircle}
 bgColor="bg-purple-50"
 iconColor="text-purple-600"
 />
 </BCard>
 </div>

 {/* Schedule List */}
 <div className="space-y-4">
 {loading ? (
 <div className="flex justify-center p-12">
 <Loader2 className="size-10 animate-spin text-teal-600" />
 </div>
 ) : filteredSchedule.length === 0 ? (
 <BCard>
 <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-12">
 <div className="p-4 bg-stone-50 rounded-full mb-4">
 <CalendarIcon className="size-12 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No {activeTab} sessions</h3>
 <p className="text-stone-500">Your schedule is clear for this view.</p>
 </div>
 </BCard>
 ) : (
 filteredSchedule.map((item) => (
 <div key={item.id} className="group bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-xl transition-all duration-300">
 <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
 {/* Time Column */}
 <div className="min-w-[140px] md:border-r border-stone-100 pr-6">
 <div className="text-2xl font-black text-stone-900">
 {formatTime(item.startTime)}
 </div>
 <div className="text-sm font-bold text-stone-400 mt-1">
 to {formatTime(item.endTime)}
 </div>
 <span className={`inline-block mt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md border ${getStatusColor(item.status)}`}>
 {item.status.replace('_', ' ')}
 </span>
 </div>

 {/* Details Column */}
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <div className="size-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-black text-stone-600">
 {item.client.name.charAt(0)}
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{item.client.name}</h3>
 <p className="text-sm text-stone-500 font-medium">{item.serviceType}</p>
 </div>
 </div>

 <div className="flex flex-wrap gap-4 mt-4 text-sm font-medium text-stone-500">
 {item.consultationMethod === 'video' ? (
 <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
 <Video className="size-4" />
 <span>Video Consultation</span>
 </div>
 ) : (
 <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg">
 <MapPin className="size-4 text-stone-400" />
 <span>In-Person Visit</span>
 </div>
 )}

 {item.notes && (
 <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg max-w-md truncate">
 <AlertCircle className="size-4 text-stone-400" />
 <span className="truncate">{item.notes}</span>
 </div>
 )}
 </div>
 </div>

 {/* Action Column */}
 <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
 {item.status === 'confirmed' && (
 <button
 onClick={() => handleStartSession(item.id)}
 className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
 >
 <Play className="size-4" />
 Start Session
 </button>
 )}
 {item.status === 'in_progress' && (
 <button
 onClick={() => handleCompleteSession(item.id)}
 className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
 >
 <CheckCircle className="size-4" />
 Complete
 </button>
 )}
 {item.meetingLink && item.status === 'confirmed' && (
 <a
 href={item.meetingLink}
 target="_blank"
 rel="noreferrer"
 className="w-full md:w-auto px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
 >
 <Video className="size-4" />
 Join
 </a>
 )}
 {item.status !== 'confirmed' && item.status !== 'in_progress' && (
 <button className="w-full md:w-auto px-6 py-3 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
 View Details
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
}
