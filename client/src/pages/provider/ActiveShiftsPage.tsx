
import { useState, useEffect } from 'react';
import {
 Briefcase, MapPin, Clock, Calendar, DollarSign, User, Star, Filter,
 ChevronRight, MessageCircle, Check, X, Heart, Shield, AlertCircle,
 Target, TrendingUp, Loader2, Zap, ArrowRight, MoreHorizontal, LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { addProviderBookingNotes, getProviderBookingRequests, respondToBookingRequest } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { BCard } from '@/components/BCard';
import { StatPill } from '@/components/StatPill';


interface JobRequest {
 id: string;
 patientId: string;
 patientInitials: string;
 careType: string;
 careLevel: 'low' | 'moderate' | 'high';
 duration: string;
 payRate: number;
 totalPay: number;
 location: string;
 distance: number;
 date: string;
 time: string;
 description: string;
 requirements: string[];
 matchScore: number;
 isRecurring: boolean;
 postedAt: string;
}

export default function JobRequestsPage() {
 const [requests, setRequests] = useState<JobRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<'all' | 'best_match' | 'highest_pay' | 'closest'>('all');
 const [careTypeFilter, setCareTypeFilter] = useState<string>('all');

 // Decline Modal State
 const [showDeclineModal, setShowDeclineModal] = useState(false);
 const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
 const [declineReason, setDeclineReason] = useState('');
 const [actionLoading, setActionLoading] = useState(false);

 useEffect(() => {
 fetchRequests();
 }, []);

  const fetchRequests = async () => {
  try {
  setLoading(true);
  const response: { requests?: unknown[] | unknown } = await getProviderBookingRequests();

  let requestsData: unknown[] = [];
  if (Array.isArray(response)) {
    requestsData = response;
  } else if (response && typeof response === 'object') {
    const res = response as Record<string, unknown>;
    if (Array.isArray(res.requests)) {
      requestsData = res.requests;
    } else if (res.requests && typeof res.requests === 'object' && !Array.isArray(res.requests)) {
      const nested = res.requests as Record<string, unknown>;
      if (Array.isArray(nested.data)) {
        requestsData = nested.data;
      }
    }
  }

  const mappedRequests: JobRequest[] = (requestsData as Array<Record<string, unknown>>).map((item) => {
  const client = item.client as Record<string, unknown> | undefined;
 return {
 id: String(item.id),
 // SAFETY FIX: Ensure client_id is converted to String to prevent .substring() crashes
 patientId: item.client_id ? String(item.client_id) : 'unknown',
 patientInitials: client ? `${String(client.firstName || '').charAt(0)}${String(client.lastName || '').charAt(0)}`.toUpperCase() : '??',
 careType: item.service_type ? (String(item.service_type).charAt(0).toUpperCase() + String(item.service_type).slice(1)) : 'General Care',
 careLevel: 'moderate',
 duration: `${String(item.duration_hours || '1')} hours`,
 payRate: parseFloat(String(item.hourly_rate || '0')),
 totalPay: parseFloat(String(item.total_amount || '0')),
 location: item.consultation_method === 'video' ? 'Online Meeting' : (String(client?.country || 'Location Hidden')),
 distance: 0,
 date: item.scheduled_at ? new Date(String(item.scheduled_at)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD',
 time: item.start_time && item.end_time ? `${String(item.start_time).substring(0, 5)} - ${String(item.end_time).substring(0, 5)}` : 'TBD',
 description: String(item.notes || `New ${item.booking_type} booking request for ${item.service_type} via ${item.consultation_method}.`),
 requirements: [String(item.consultation_method || 'Standard'), String(item.booking_type || 'One-off')],
 matchScore: 95,
 isRecurring: false,
 postedAt: item.created_at ? new Date(String(item.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
 };
 });

 setRequests(mappedRequests);
 } catch (error) {
 console.error('Failed to fetch requests:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load job requests');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load job requests');
 }
 } finally {
 setLoading(false);
 }
 };

 const sortedRequests = [...requests].toSorted((a, b) => {
 switch (filter) {
 case 'best_match': return b.matchScore - a.matchScore;
 case 'highest_pay': return b.payRate - a.payRate;
 case 'closest': return a.distance - b.distance;
 default: return 0;
 }
 }).filter(r => careTypeFilter === 'all' || r.careType === careTypeFilter);

 const careTypes = [...new Set(requests.map(r => r.careType))];

 const stats = {
 available: requests.length,
 avgPay: requests.length > 0 ? Math.round(requests.reduce((acc, r) => acc + r.payRate, 0) / requests.length) : 0,
 bestMatch: requests.length > 0 ? Math.max(...requests.map(r => r.matchScore)) : 0,
 };

 const getLevelColor = (level: string) => {
 switch (level) {
 case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
 case 'moderate': return 'bg-amber-50 text-amber-700 border-amber-100';
 case 'high': return 'bg-rose-50 text-rose-700 border-rose-100';
 default: return 'bg-stone-50 text-stone-700 border-stone-100';
 }
 };

 const handleAccept = async (id: string) => {
 try {
 await respondToBookingRequest(id, 'accept');
 toast.success('Booking accepted successfully!');
 setRequests(prev => prev.filter(r => r.id !== id));
 } catch (error) {
 console.error(error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to accept booking');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to accept booking');
 }
 }
 };

 // Open Modal instead of direct decline
 const handleDeclineClick = (id: string) => {
 setSelectedRequestId(id);
 setShowDeclineModal(true);
 setDeclineReason('');
 };

 // Confirm Decline Logic
 const confirmDecline = async () => {
 if (!selectedRequestId) return;
 if (!declineReason.trim()) {
 toast.error('Please provide a reason for declining');
 return;
 }

 try {
 setActionLoading(true);

 // 1. Reject Booking
 await respondToBookingRequest(selectedRequestId, 'reject');

 // 2. Add Provider Notes (Reason)
 await addProviderBookingNotes(selectedRequestId, declineReason);

 toast.success('Request declined successfully');
 setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
 setShowDeclineModal(false);
 } catch (error) {
 console.error('Failed to decline:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to decline request. Please try again.');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to decline request. Please try again.');
 }
 } finally {
 setActionLoading(false);
 }
 };

 return (
 <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 Job Requests
 <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-xs font-bold text-teal-600 hidden sm:inline-block">
 {requests.length} Active
 </span>
 </h1>
 <p className="text-stone-500 mt-2 font-medium max-w-2xl">
 Opportunities matched to your profile. Review and accept to fill your schedule.
 </p>
 </div>
 </div>

 {/* Stats Overview Bento */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <BCard>
 <StatPill
 label="Available Jobs"
 value={stats.available}
 subtext="Matching your skills"
 icon={Briefcase}
 bgColor="bg-teal-50"
 iconColor="text-teal-600"
 />
 </BCard>
 <BCard>
 <StatPill
 label="Average Rate"
 value={`AED ${stats.avgPay}`}
 subtext="Per hour across jobs"
 icon={DollarSign}
 bgColor="bg-blue-50"
 iconColor="text-blue-600"
 />
 </BCard>
 <BCard>
 <StatPill
 label="Top Match"
 value={`${stats.bestMatch}%`}
 subtext="Compatibility score"
 icon={Target}
 bgColor="bg-purple-50"
 iconColor="text-purple-600"
 />
 </BCard>
 </div>

 {/* Filters & Content */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

 {/* Filters Sidebar (Sticky) */}
 <div className="lg:col-span-3 space-y-6">
 <BCard className="sticky top-8">
 <div className="flex items-center gap-2 mb-6">
 <Filter className="size-4 text-stone-400" />
 <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-widest">Filters</h3>
 </div>

 <div className="space-y-6">
 <div>
 <span className="text-xs font-bold text-stone-500 mb-3 block">Sort By</span>
 <div className="space-y-2">
 {['all', 'best_match', 'highest_pay', 'closest'].map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f as 'all' | 'best_match' | 'highest_pay' | 'closest')}
 className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900' }`}
 >
 {f === 'all' ? 'Default' :
 f === 'best_match' ? 'Best Match' :
 f === 'highest_pay' ? 'Highest Pay' : 'Closest Distance'}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label htmlFor="care-type" className="text-xs font-bold text-stone-500 mb-3 block">Care Type</label>
 <select id="care-type"
 value={careTypeFilter}
 onChange={(e) => setCareTypeFilter(e.target.value)}
 className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
 >
 <option value="all">All Types</option>
 {careTypes.map((type) => (
 <option key={type} value={type}>{type}</option>
 ))}
 </select>
 </div>
 </div>
 </BCard>
 </div>

 {/* Job List */}
 <div className="lg:col-span-9 space-y-4">
 {loading ? (
 <div className="flex justify-center p-12">
 <Loader2 className="size-10 animate-spin text-teal-600" />
 </div>
 ) : sortedRequests.length === 0 ? (
 <BCard>
 <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
 <div className="p-6 bg-stone-50 rounded-full mb-6">
 <Briefcase className="size-12 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No jobs available right now</h3>
 <p className="text-stone-500 mb-8 max-w-sm">We'll notify you when new opportunities matching your profile appear.</p>
 <Link to="/provider/schedule">
 <Button className="bg-stone-900 text-white rounded-xl px-8 py-4 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
 Update Availability
 </Button>
 </Link>
 </div>
 </BCard>
 ) : (
 sortedRequests.map((job) => (
 <div
 key={job.id}
 className="group bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 size-32 bg-stone-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-teal-50 transition-colors" />

 <div className="relative z-10 flex flex-col md:flex-row gap-6">
 {/* Left Content */}
 <div className="flex-1">
 <div className="flex items-start justify-between mb-4">
 <div className="flex flex-wrap items-center gap-2">
 <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md border ${getLevelColor(job.careLevel)}`}>
 {job.careLevel} Care
 </span>
 {job.isRecurring && (
 <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md bg-purple-50 text-purple-700 border border-purple-100">
 Recurring
 </span>
 )}
 <span className="text-xs font-bold text-stone-400 pl-2 border-l border-stone-200">Posted {job.postedAt}</span>
 </div>
 <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full">
 <Zap className="size-3 fill-current" />
 <span className="text-xs font-black">{job.matchScore}% Match</span>
 </div>
 </div>

 <h3 className="text-xl font-semibold text-stone-900 mb-2">{job.careType}</h3>
 <p className="text-stone-600 text-sm mb-6 leading-relaxed max-w-2xl">{job.description}</p>

 <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-stone-500">
 <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg">
 <Calendar className="size-4 text-stone-400" />
 <span>{job.date}</span>
 </div>
 <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg">
 <Clock className="size-4 text-stone-400" />
 <span>{job.time} ({job.duration})</span>
 </div>
 <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg">
 <MapPin className="size-4 text-stone-400" />
 <span>{job.location}</span>
 </div>
 </div>
 </div>

 {/* Right Action Area */}
 <div className="md:w-72 flex flex-col justify-between border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-0 md:pl-6 gap-6">
 <div className="text-left md:text-right">
 <div className="flex items-center justify-end gap-2 mb-2">
 <div className="size-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-black text-stone-600">
 {job.patientInitials}
 </div>
 <span className="text-sm font-bold text-stone-900">Patient #{job.patientId.substring(0, 4)}</span>
 </div>
 <div className="flex items-baseline justify-end gap-1">
 <span className="text-3xl font-black text-stone-900">AED {job.payRate}</span>
 <span className="text-xs font-bold text-stone-400">/hr</span>
 </div>
 <p className="text-xs font-bold text-emerald-600 mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded">
 Total Est. AED {job.totalPay}
 </p>
 </div>

 <div className="grid grid-cols-3 gap-2">
 <Link to={`/provider/patients/${job.patientId}`} className="contents">
 <button
 className="px-2 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 flex flex-col items-center justify-center gap-1"
 title="View Profile"
 >
 <User className="size-4" />
 </button>
 </Link>
 <button
 onClick={() => handleDeclineClick(job.id)}
 className="col-span-1 px-2 py-3 rounded-xl border border-stone-200 text-red-900 font-bold text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex flex-col items-center justify-center gap-1"
 >
 <X className="size-4" />
 </button>
 <button
 onClick={() => handleAccept(job.id)}
 className="col-span-1 px-2 py-3 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-teal-600 shadow-lg hover:shadow-teal-500/20 transition-all flex flex-col items-center justify-center gap-1"
 >
 <Check className="size-4" />
 </button>
 </div>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Rejection Modal (Modernized) */}
 {showDeclineModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
 <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-xl font-semibold text-stone-900">Decline Request</h3>
 <button
 onClick={() => setShowDeclineModal(false)}
 className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
 >
 <X className="size-5" />
 </button>
 </div>

 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-800 flex gap-3 mb-6">
 <AlertCircle className="size-5 flex-shrink-0 text-amber-600" />
 <p className="font-medium">Declining requests frequently may affect your matchmaking score. Always provide a clear reason.</p>
 </div>

 <div className="mb-6">
 <label htmlFor="reason-for-declining" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Reason for declining</label>
 <textarea id="reason-for-declining"
 value={declineReason}
 onChange={(e) => setDeclineReason(e.target.value)}
 className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white min-h-[120px] text-stone-900 resize-none font-medium placeholder:text-stone-400"
 placeholder="e.g. Schedule conflict, distance too far..."
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => setShowDeclineModal(false)}
 className="px-6 py-3.5 text-stone-600 bg-stone-50 hover:bg-stone-100 rounded-xl transition-colors font-bold text-sm"
 >
 Cancel
 </button>
 <button
 onClick={confirmDecline}
 disabled={actionLoading}
 className="px-6 py-3.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold text-sm shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {actionLoading ? <Loader2 className="size-4 animate-spin" /> : 'Confirm Decline'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
