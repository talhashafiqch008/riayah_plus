
import { useState, useEffect } from 'react';
import { Gift, Clock, Calendar, DollarSign, User, Loader2, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getProviderOffers, withdrawProviderOffer } from '@/lib/api/offers';


interface Offer {
 id: string;
 client: {
 id: string;
 firstName: string;
 lastName: string;
 };
 proposed_amount: number;
 proposed_hours: number;
 proposed_date: string;
 proposed_start_time: string;
 proposed_end_time: string;
 service_type: string;
 message: string;
 status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
 created_at: string;
 expires_at: string;
}

export default function ProviderOffersPage() {
 const [offers, setOffers] = useState<Offer[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchOffers();
 }, []);

 const fetchOffers = async () => {
 try {
 setLoading(true);
 const response = await getProviderOffers();
 if (response.success && response.offers) {
 setOffers(response.offers);
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load offers');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleWithdraw = async (offerId: string) => {
 try {
 await withdrawProviderOffer(offerId);
 toast.success('Offer withdrawn successfully');
 setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'withdrawn' } : o));
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to withdraw offer');
 }
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
 case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
 case 'rejected': return 'bg-red-50 text-red-700 border-red-100';
 case 'withdrawn': return 'bg-stone-100 text-stone-600 border-stone-200';
 case 'expired': return 'bg-stone-100 text-stone-600 border-stone-200';
 default: return 'bg-stone-50 text-stone-700 border-stone-100';
 }
 };

 return (
 <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 <Gift className="size-8 text-teal-600" />
 My Offers
 </h1>
 <p className="text-stone-500 mt-2 text-lg">
 Track custom offers you have sent to careseekers.
 </p>
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center py-20">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 ) : offers.length === 0 ? (
 <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <Gift className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No offers yet</h3>
 <p className="text-stone-500 max-w-sm mx-auto">
 Send custom offers to careseekers from their profile or messages page.
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {offers.map((offer) => (
 <div key={offer.id} className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center text-lg font-bold">
 {offer.client.firstName.charAt(0)}{offer.client.lastName.charAt(0)}
 </div>
  <div>
  <h3 className="font-semibold text-stone-900">{offer.client.firstName} {offer.client.lastName}</h3>
  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(offer.status)}`}>
  {offer.status}
  </span>
  {offer.expires_at && offer.status === 'pending' && (
  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-100 ml-1">
  <Clock className="size-3 inline mr-1" />
  Expires {new Date(offer.expires_at).toLocaleDateString()}
  </span>
  )}
  </div>
 </div>
 <div className="text-right">
 <p className="text-2xl font-bold text-stone-900">SAR {offer.proposed_amount}</p>
 <p className="text-sm text-stone-500">{offer.proposed_hours} hours</p>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Calendar className="size-4 text-stone-400" />
 {offer.proposed_date}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Clock className="size-4 text-stone-400" />
 {offer.proposed_start_time} - {offer.proposed_end_time}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <DollarSign className="size-4 text-teal-500" />
 {offer.service_type || 'General'}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <User className="size-4 text-stone-400" />
 {offer.client.firstName}
 </div>
 </div>

 {offer.message && (
 <p className="text-sm text-stone-600 bg-stone-50 rounded-xl p-3 mb-4">
 {offer.message}
 </p>
 )}

 {offer.status === 'pending' && (
 <div className="flex justify-end">
 <Button
 onClick={() => handleWithdraw(offer.id)}
 variant="outline"
 className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl h-10"
 >
 <RotateCcw className="size-4 mr-2" />
 Withdraw Offer
 </Button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
