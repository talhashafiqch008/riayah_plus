
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, DollarSign, MapPin, Clock, Loader2, Tag, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getProviderBids } from '@/lib/api/care-needs';


interface Bid {
 id: string;
 bid_amount: number;
 proposal_message: string | null;
 status: string;
 created_at: string;
 careNeed: {
 id: string;
 title: string;
 care_type: string;
 location: string;
 schedule_type: string;
 client: {
 firstName: string;
 lastName: string;
 };
 };
}

export default function ProviderBidsPage() {
 const navigate = useNavigate();
 const [bids, setBids] = useState<Bid[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchBids();
 }, []);

 const fetchBids = async () => {
 try {
 setLoading(true);
 const response = await getProviderBids();
 if (response.success && response.bids) {
 setBids(response.bids);
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load bids');
 }
 } finally {
 setLoading(false);
 }
 };

 const getStatusStyle = (status: string) => {
 switch (status) {
 case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
 case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
 case 'rejected': return 'bg-red-50 text-red-700 border-red-100';
 default: return 'bg-stone-50 text-stone-700 border-stone-100';
 }
 };

 return (
 <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 <ClipboardList className="size-8 text-teal-600" />
 My Bids
 </h1>
 <p className="text-stone-500 mt-2 text-lg">
 Track all bids you have placed on care needs.
 </p>
 </div>

 {loading ? (
 <div className="flex justify-center py-20">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 ) : bids.length === 0 ? (
 <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
 <ClipboardList className="size-12 text-stone-300 mx-auto mb-4" />
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No bids yet</h3>
 <p className="text-stone-500 max-w-md mx-auto mb-6">
 You have not placed any bids on care needs. Visit the marketplace to find opportunities.
 </p>
 <Button
 onClick={() => navigate('/provider/marketplace')}
 className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-11"
 >
 Browse Marketplace
 <ArrowRight className="size-4 ml-2" />
 </Button>
 </div>
 ) : (
 <div className="space-y-4">
 {bids.map((bid) => (
 <div key={bid.id} className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
 <div className="flex items-start justify-between mb-4">
 <div>
 <h3 className="font-semibold text-stone-900 text-lg">{bid.careNeed?.title || 'Care Need'}</h3>
 <div className="flex items-center gap-3 mt-2">
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(bid.status)}`}>
 {bid.status}
 </span>
 <span className="text-sm text-stone-500">
 Bid: SAR {bid.bid_amount}
 </span>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <MapPin className="size-4 text-stone-400" />
 {bid.careNeed?.location || 'N/A'}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Clock className="size-4 text-stone-400" />
 {bid.careNeed?.schedule_type?.replace('_', ' ') || 'N/A'}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Tag className="size-4 text-stone-400" />
 {bid.careNeed?.care_type || 'N/A'}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <User className="size-4 text-stone-400" />
 {bid.careNeed?.client?.firstName || ''} {bid.careNeed?.client?.lastName || ''}
 </div>
 </div>

 {bid.proposal_message && (
 <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600">
 {bid.proposal_message}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
