
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { useState, useEffect } from 'react';
import { ClipboardList, DollarSign, MapPin, Clock, Tag, Loader2, Check, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getMyCareNeeds, acceptBid } from '@/lib/api/care-needs';


interface CareNeed {
 id: string;
 title: string;
 description: string;
 care_type: string;
 location: string;
 budget_min: number | null;
 budget_max: number | null;
 schedule_type: string;
 status: string;
 bids_count: number;
 bids?: {
 id: string;
 bid_amount: number;
 proposal_message: string;
 status: string;
 provider: {
 user: {
 firstName: string;
 lastName: string;
 };
 };
 }[];
}

export default function MyCareNeedsPage() {
 const [careNeeds, setCareNeeds] = useState<CareNeed[]>([]);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState<string | null>(null);

 useEffect(() => {
 fetchCareNeeds();
 }, []);

 const fetchCareNeeds = async () => {
 try {
 setLoading(true);
 const response = await getMyCareNeeds();
 if (response.success && Array.isArray(response.careNeeds)) {
 setCareNeeds(response.careNeeds);
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load care needs');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleAcceptBid = async (bidId: string) => {
 try {
 setActionLoading(bidId);
 await acceptBid(bidId);
 toast.success('Bid accepted! Booking created.');
 fetchCareNeeds();
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to accept bid');
 }
 } finally {
 setActionLoading(null);
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'open': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
 case 'in_review': return 'bg-amber-50 text-amber-700 border-amber-100';
 case 'assigned': return 'bg-teal-50 text-teal-700 border-teal-100';
 case 'closed': return 'bg-stone-100 text-stone-600 ring-1 ring-stone-200/50';
 default: return 'bg-stone-50 text-stone-700 ring-1 ring-stone-100/50';
 }
 };

 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 <ClipboardList className="size-8 text-teal-600" />
 My Care Needs
 </h1>
 <p className="text-stone-500 mt-2 text-lg">
 Manage your posted care needs and review provider bids.
 </p>
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center py-20">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 ) : careNeeds.length === 0 ? (
 <div className="text-center py-20 bg-white/90 backdrop-blur-xl rounded-3xl ring-1 ring-stone-200/50">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <ClipboardList className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No care needs posted yet</h3>
 <p className="text-stone-500 max-w-sm mx-auto">
 Post your first care need to start receiving bids from providers.
 </p>
 </div>
 ) : (
 <div className="space-y-6">
 {careNeeds.map((need) => (
 <div key={need.id} className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 ring-1 ring-stone-200/50/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
 <div className="flex items-start justify-between mb-4">
 <div>
 <h3 className="font-semibold text-stone-900 text-lg">{need.title}</h3>
 <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(need.status)}`}>
 {need.status}
 </span>
 </div>
 <div className="text-right">
 <p className="text-sm text-stone-500">{need.bids_count} bids</p>
 </div>
 </div>

 <p className="text-stone-600 mb-4 text-sm leading-relaxed">{need.description}</p>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <MapPin className="size-4 text-stone-400" />
 {need.location}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <DollarSign className="size-4 text-stone-400" />
 {need.budget_min && need.budget_max
 ? `SAR ${need.budget_min} - ${need.budget_max}`
 : 'Budget flexible'}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Clock className="size-4 text-stone-400" />
 {need.schedule_type.replace('_', ' ')}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Tag className="size-4 text-stone-400" />
 {need.care_type}
 </div>
 </div>

 {need.bids && need.bids.length > 0 && (
 <div className="mt-4 border-t ring-1 ring-stone-100/50 pt-4">
 <h4 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
 <Users className="size-4" />
 Provider Bids
 </h4>
 <div className="space-y-3">
 {need.bids.map((bid) => (
 <div key={bid.id} className="flex items-center justify-between bg-stone-50 rounded-xl p-4">
 <div>
 <p className="font-medium text-stone-900">
 {bid.provider.user.firstName} {bid.provider.user.lastName}
 </p>
 <p className="text-lg font-bold text-teal-600">SAR {bid.bid_amount}</p>
 {bid.proposal_message && (
 <p className="text-sm text-stone-500 mt-1">{bid.proposal_message}</p>
 )}
 </div>
 {bid.status === 'pending' && need.status === 'open' && (
 <Button
 onClick={() => handleAcceptBid(bid.id)}
 disabled={actionLoading === bid.id}
 className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-9 text-sm"
 >
 {actionLoading === bid.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 mr-1" />}
 Accept
 </Button>
 )}
 {bid.status === 'accepted' && (
 <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
 Accepted
 </span>
 )}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </motion.div>
 );
}
