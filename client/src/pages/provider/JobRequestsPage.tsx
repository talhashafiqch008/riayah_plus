
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

 const [showDeclineModal, setShowDeclineModal] = useState(false);
 const [showCounterModal, setShowCounterModal] = useState(false);
 const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
 const [declineReason, setDeclineReason] = useState('');
 const [actionLoading, setActionLoading] = useState(false);
 const [counterData, setCounterData] = useState({
 proposed_amount: '',
 proposed_hours: '',
 proposed_date: '',
 proposed_start_time: '',
 proposed_end_time: '',
 reason: '',
 });

 useEffect(() => {
 fetchRequests();
 }, []);

 const fetchRequests = async () => {
 try {
 setLoading(true);
 const response: { requests?: unknown[] } = await getProviderBookingRequests();

 const requestsData = Array.isArray(response) ? response : (response?.requests || []);

 const mappedRequests: JobRequest[] = (requestsData as Array<Record<string, unknown>>).map((item) => {
 const client = item.client as Record<string, unknown> | undefined;
 return {
 id: String(item.id),
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
 description: String(item.notes || `New ${item.booking_type} booking request for ${item.service_type}.`),
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

 const handleDeclineClick = (id: string) => {
 setSelectedRequestId(id);
 setShowDeclineModal(true);
 setDeclineReason('');
 };

 const handleCounterClick = (id: string) => {
 setSelectedRequestId(id);
 setShowCounterModal(true);
 setCounterData({
 proposed_amount: '',
 proposed_hours: '',
 proposed_date: '',
 proposed_start_time: '',
 proposed_end_time: '',
 reason: '',
 });
 };

 const confirmCounterOffer = async () => {
 if (!selectedRequestId) return;
 if (!counterData.proposed_amount || !counterData.proposed_hours || !counterData.proposed_date) {
 toast.error('Please fill in all required fields');
 return;
 }

 try {
 setActionLoading(true);
 await respondToBookingRequest(selectedRequestId, 'counter_offer', {
 proposed_amount: parseFloat(counterData.proposed_amount),
 proposed_hours: parseInt(counterData.proposed_hours),
 proposed_date: counterData.proposed_date,
 proposed_start_time: counterData.proposed_start_time,
 proposed_end_time: counterData.proposed_end_time,
 reason: counterData.reason,
 });
 toast.success('Counter offer sent successfully');
 setRequests(prev => prev.filter(r => r.id !== selectedRequestId));
 setShowCounterModal(false);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to send counter offer');
 } else {
 toast.error('Failed to send counter offer');
 }
 } finally {
 setActionLoading(false);
 }
 };

 const confirmDecline = async () => {
 if (!selectedRequestId) return;
 if (!declineReason.trim()) {
 toast.error('Please provide a reason for declining');
 return;
 }

 try {
 setActionLoading(true);

 await respondToBookingRequest(selectedRequestId, 'reject');
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
 <Briefcase className="size-8 text-teal-600" />
 Job Requests
 </h1>
 <p className="text-stone-500 mt-2 text-lg max-w-2xl">
 Review and respond to incoming care requests from families and individuals.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <div className="hidden md:flex items-center bg-white border border-stone-200 rounded-full p-1 shadow-sm">
 {(['all', 'best_match', 'highest_pay', 'closest'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize ${filter === f ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50' }`}
 >
 {f.replace('_', ' ')}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Stats Overview */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <BCard>
 <StatPill
 label="Available Requests"
 value={stats.available}
 subtext="Pending your response"
 icon={Target}
 iconColor="text-teal-600"
 bgColor="bg-teal-50"
 />
 </BCard>
 <BCard>
 <StatPill
 label="Avg. Pay Rate"
 value={`SAR ${stats.avgPay}`}
 subtext="Per hour across all requests"
 icon={TrendingUp}
 iconColor="text-blue-600"
 bgColor="bg-blue-50"
 />
 </BCard>
 <BCard>
 <StatPill
 label="Best Match"
 value={`${stats.bestMatch}%`}
 subtext="Highest compatibility score"
 icon={Zap}
 iconColor="text-amber-600"
 bgColor="bg-amber-50"
 />
 </BCard>
 </div>

 {/* Care Type Filters */}
 <div className="flex items-center gap-3 overflow-x-auto pb-2">
 <Filter className="size-5 text-stone-400 flex-shrink-0" />
 <button
 onClick={() => setCareTypeFilter('all')}
 className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${careTypeFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
 >
 All Types
 </button>
 {careTypes.map(type => (
 <button
 key={type}
 onClick={() => setCareTypeFilter(type)}
 className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${careTypeFilter === type ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
 >
 {type}
 </button>
 ))}
 </div>

 {/* Requests Grid */}
 {loading ? (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 ) : sortedRequests.length === 0 ? (
 <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <Briefcase className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No requests yet</h3>
 <p className="text-stone-500 max-w-sm mx-auto">
 When families send you booking requests, they will appear here for your review.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
 {sortedRequests.map((request) => (
 <BCard key={request.id} className="hover:shadow-lg transition-shadow group">
 <div className="flex flex-col h-full">
 {/* Top Row: Avatar + Name + Match Score */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="size-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center text-lg font-bold">
 {request.patientInitials}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">Patient {request.patientId}</h3>
 <div className="flex items-center gap-2 mt-1">
 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getLevelColor(request.careLevel)}`}>
 {request.careLevel}
 </span>
 {request.isRecurring && (
 <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
 Recurring
 </span>
 )}
 </div>
 </div>
 </div>
 <div className="flex flex-col items-end gap-1">
 <div className="flex items-center gap-1 text-amber-600">
 <Star className="size-4 fill-current" />
 <span className="text-sm font-bold">{request.matchScore}%</span>
 </div>
 <span className="text-xs text-stone-400">{request.postedAt}</span>
 </div>
 </div>

 {/* Details Grid */}
 <div className="grid grid-cols-2 gap-3 mb-4">
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Calendar className="size-4 text-stone-400" />
 {request.date}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Clock className="size-4 text-stone-400" />
 {request.time}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <MapPin className="size-4 text-stone-400" />
 {request.location}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <DollarSign className="size-4 text-teal-500" />
 <span className="font-semibold">SAR {request.totalPay}</span>
 <span className="text-stone-400">({request.duration})</span>
 </div>
 </div>

 {/* Description */}
 <p className="text-sm text-stone-600 mb-4 line-clamp-2">
 {request.description}
 </p>

 {/* Requirements */}
 <div className="flex flex-wrap gap-2 mb-4">
 {request.requirements.map((req, n) => (
 <span key={`item-${n}`} className="px-2.5 py-1 rounded-lg bg-stone-50 text-stone-600 text-xs font-medium border border-stone-100">
 {req}
 </span>
 ))}
 </div>

 {/* Actions */}
 <div className="mt-auto flex items-center gap-3 pt-4 border-t border-stone-100">
 <Button
 onClick={() => handleAccept(request.id)}
 className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-11"
 >
 <Check className="size-4 mr-2" />
 Accept
 </Button>
 <Button
 onClick={() => handleCounterClick(request.id)}
 variant="outline"
 className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl h-11"
 >
 Counter
 </Button>
 <Button
 onClick={() => handleDeclineClick(request.id)}
 variant="outline"
 className="flex-1 border-stone-200 text-stone-600 hover:bg-stone-50 font-bold rounded-xl h-11"
 >
 <X className="size-4 mr-2" />
 Decline
 </Button>
 <Link to={`/provider/messages?client=${request.patientId}`}>
 <Button
 variant="outline"
 className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl size-11 p-0"
 >
 <MessageCircle className="size-4" />
 </Button>
 </Link>
 </div>
 </div>
 </BCard>
 ))}
 </div>
 )}

 {showDeclineModal && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">Decline Request</h2>
 <p className="text-stone-500 mb-6">
 Please provide a reason for declining this request. This helps us improve matching.
 </p>
 <textarea
 value={declineReason}
 onChange={(e) => setDeclineReason(e.target.value)}
 placeholder="Reason for declining..."
 className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-sm min-h-[120px] mb-6 focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <div className="flex gap-3">
 <Button
 onClick={() => setShowDeclineModal(false)}
 variant="outline"
 className="flex-1 border-stone-200 text-stone-600 h-12 rounded-xl font-bold"
 >
 Cancel
 </Button>
 <Button
 onClick={confirmDecline}
 disabled={!declineReason.trim() || actionLoading}
 className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl font-bold disabled:opacity-50"
 >
 {actionLoading ? <Loader2 className="size-4 animate-spin" /> : 'Confirm Decline'}
 </Button>
 </div>
 </div>
 </div>
 )}

 {showCounterModal && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">Send Counter Offer</h2>
 <p className="text-stone-500 mb-6">
 Propose new terms for this booking. The careseeker can accept or reject your offer.
 </p>
 <div className="space-y-4 mb-6">
 <div>
 <label htmlFor="input-src-app-provider-job-requests-page-tsx-481-481" className="text-sm font-bold text-stone-700 mb-1 block">Proposed Amount (SAR)</label>
 <input
 type="number"
 value={counterData.proposed_amount}
 onChange={(e) => setCounterData(prev => ({ ...prev, proposed_amount: e.target.value }))}
 placeholder="e.g. 150"
 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-provider-job-requests-page-tsx-491-491" className="text-sm font-bold text-stone-700 mb-1 block">Hours</label>
 <input
 type="number"
 value={counterData.proposed_hours}
 onChange={(e) => setCounterData(prev => ({ ...prev, proposed_hours: e.target.value }))}
 placeholder="e.g. 2"
 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-provider-job-requests-page-tsx-501-501" className="text-sm font-bold text-stone-700 mb-1 block">Date</label>
 <input
 type="date"
 value={counterData.proposed_date}
 onChange={(e) => setCounterData(prev => ({ ...prev, proposed_date: e.target.value }))}
 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor="input-src-app-provider-job-requests-page-tsx-511-511" className="text-sm font-bold text-stone-700 mb-1 block">Start Time</label>
 <input
 type="time"
 value={counterData.proposed_start_time}
 onChange={(e) => setCounterData(prev => ({ ...prev, proposed_start_time: e.target.value }))}
 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-provider-job-requests-page-tsx-520-520" className="text-sm font-bold text-stone-700 mb-1 block">End Time</label>
 <input
 type="time"
 value={counterData.proposed_end_time}
 onChange={(e) => setCounterData(prev => ({ ...prev, proposed_end_time: e.target.value }))}
 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 </div>
 <div>
 <label htmlFor="input-src-app-provider-job-requests-page-tsx-530-530" className="text-sm font-bold text-stone-700 mb-1 block">Message (Optional)</label>
 <textarea
 value={counterData.reason}
 onChange={(e) => setCounterData(prev => ({ ...prev, reason: e.target.value }))}
 placeholder="Explain your proposed changes..."
 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 </div>
 <div className="flex gap-3">
 <Button
 onClick={() => setShowCounterModal(false)}
 variant="outline"
 className="flex-1 border-stone-200 text-stone-600 h-12 rounded-xl font-bold"
 >
 Cancel
 </Button>
 <Button
 onClick={confirmCounterOffer}
 disabled={!counterData.proposed_amount || !counterData.proposed_hours || !counterData.proposed_date || actionLoading}
 className="flex-1 bg-amber-600 hover:bg-amber-700 text-white h-12 rounded-xl font-bold disabled:opacity-50"
 >
 {actionLoading ? <Loader2 className="size-4 animate-spin" /> : 'Send Counter Offer'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
