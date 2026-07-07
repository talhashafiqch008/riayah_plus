
import { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Clock, Tag, Loader2, Plus, Filter, Gift, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getCareNeeds, placeBid } from '@/lib/api/care-needs';
import { useNavigate } from 'react-router-dom';


interface CareNeed {
 id: string;
 title: string;
 description: string;
 care_type: string;
 location: string;
 budget_min: number | null;
 budget_max: number | null;
 schedule_type: string;
 bids_count: number;
  client: {
  id: string;
  firstName: string;
  lastName: string;
  };
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [careNeeds, setCareNeeds] = useState<CareNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<CareNeed | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [bidLoading, setBidLoading] = useState(false);

 useEffect(() => {
 fetchCareNeeds();
 }, []);

 const fetchCareNeeds = async () => {
 try {
 setLoading(true);
 const response = await getCareNeeds();
 if (response.success && response.careNeeds) {
 setCareNeeds(response.careNeeds.data || response.careNeeds);
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load marketplace');
 }
 } finally {
 setLoading(false);
 }
 };

 const openBidModal = (need: CareNeed) => {
 setSelectedNeed(need);
 setBidAmount(need.budget_max ? String(need.budget_max) : '');
 setProposalMessage('');
 setBidModalOpen(true);
 };

  const handlePlaceBid = async () => {
  if (!selectedNeed || !bidAmount) return;

  const amount = Number(bidAmount);
  const minBudget = selectedNeed.budget_min || 0;
  const maxBudget = selectedNeed.budget_max || 0;

  if (minBudget && maxBudget) {
  const minAllowed = minBudget * 0.5;
  const maxAllowed = maxBudget * 2;
  if (amount < minAllowed || amount > maxAllowed) {
  toast.error(`Bid must be between 50% and 200% of the budget range (SAR ${minAllowed} - ${maxAllowed})`);
  return;
  }
  }

  try {
  setBidLoading(true);
  await placeBid(selectedNeed.id, {
  bid_amount: amount,
  proposal_message: proposalMessage,
  });
  toast.success('Bid placed successfully!');
  setBidModalOpen(false);
  setBidAmount('');
  setProposalMessage('');
  fetchCareNeeds();
  } catch (error) {
  if (isApiError(error)) {
  toast.error(error.message || 'Failed to place bid');
  }
  } finally {
  setBidLoading(false);
  }
  };

 return (
  <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
  <div>
  <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
  <Search className="size-8 text-teal-600" />
  Care Marketplace
  </h1>
  <p className="text-stone-500 mt-2 text-lg">
  Browse care needs posted by careseekers and place your bids.
  </p>
  </div>
  <div className="flex items-center gap-3">
  <Button
  onClick={() => navigate('/provider/marketplace/offers')}
  variant="outline"
  className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl"
  >
  <Store className="size-4 mr-2" />
  My Offers
  </Button>
  <Button
  onClick={() => navigate('/provider/marketplace/create-offer')}
  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 h-auto"
  >
  <Gift className="size-4 mr-2" />
  Create Custom Offer
  </Button>
  </div>
  </div>

 {loading ? (
 <div className="flex justify-center py-20">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 ) : careNeeds.length === 0 ? (
 <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <Search className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No care needs yet</h3>
 <p className="text-stone-500 max-w-sm mx-auto">
 Careseekers will post their care needs here. Check back later for new opportunities.
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {careNeeds.map((need) => (
 <div key={need.id} className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
 <div className="flex items-start justify-between mb-4">
 <div>
 <h3 className="font-semibold text-stone-900 text-lg">{need.title}</h3>
 <p className="text-sm text-stone-500 mt-1">{need.client.firstName} {need.client.lastName}</p>
 </div>
 <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
 {need.care_type}
 </span>
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
 : need.budget_max
 ? `Up to SAR ${need.budget_max}`
 : 'Budget flexible'}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Clock className="size-4 text-stone-400" />
 {need.schedule_type.replace('_', ' ')}
 </div>
 <div className="flex items-center gap-2 text-sm text-stone-600">
 <Tag className="size-4 text-stone-400" />
 {need.bids_count} bids
 </div>
 </div>

  <div className="flex justify-end gap-2">
  <Button
  onClick={() => openBidModal(need)}
  className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-10"
  >
  <Plus className="size-4 mr-2" />
  Place Bid
  </Button>
  <Button
  onClick={() => navigate(`/provider/marketplace/create-offer?client_id=${need.client.id}&client_name=${encodeURIComponent(need.client.firstName + ' ' + need.client.lastName)}`)}
  variant="outline"
  className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl h-10"
  >
  <Gift className="size-4 mr-2" />
  Send Offer
  </Button>
  </div>
 </div>
 ))}
 </div>
 )}

 {bidModalOpen && selectedNeed && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
 <h2 className="text-xl text-stone-900 mb-4">Place Bid on &quot;{selectedNeed.title}&quot;</h2>

 <div className="space-y-4">
  <div>
  <label htmlFor="input-src-app-provider-marketplace-page-tsx-175-175" className="block text-sm font-medium text-stone-700 mb-2">
  Bid Amount (SAR)
  {selectedNeed.budget_min && selectedNeed.budget_max && (
  <span className="text-stone-400 font-normal ml-2">
  (Min: SAR {Math.round(selectedNeed.budget_min * 0.5)}, Max: SAR {Math.round(selectedNeed.budget_max * 2)})
  </span>
  )}
  </label>
  <input
  type="number"
  value={bidAmount}
  onChange={(e) => setBidAmount(e.target.value)}
  className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
  bidAmount && selectedNeed.budget_min && selectedNeed.budget_max &&
  (Number(bidAmount) < selectedNeed.budget_min * 0.5 || Number(bidAmount) > selectedNeed.budget_max * 2)
  ? 'border-red-300 focus:ring-red-500 bg-red-50'
  : 'border-stone-300'
  }`}
  placeholder="Enter your bid amount"
  />
  {bidAmount && selectedNeed.budget_min && selectedNeed.budget_max && (
  <p className={`text-xs mt-1 ${
  Number(bidAmount) < selectedNeed.budget_min * 0.5 || Number(bidAmount) > selectedNeed.budget_max * 2
  ? 'text-red-500'
  : 'text-teal-600'
  }`}>
  {Number(bidAmount) < selectedNeed.budget_min * 0.5
  ? `Bid must be at least SAR ${Math.round(selectedNeed.budget_min * 0.5)} (50% of minimum budget)`
  : Number(bidAmount) > selectedNeed.budget_max * 2
  ? `Bid must not exceed SAR ${Math.round(selectedNeed.budget_max * 2)} (200% of maximum budget)`
  : 'Bid amount is within acceptable range'}
  </p>
  )}
  </div>
 <div>
 <label htmlFor="input-src-app-provider-marketplace-page-tsx-185-185" className="block text-sm font-medium text-stone-700 mb-2">Proposal Message (Optional)</label>
 <textarea
 value={proposalMessage}
 onChange={(e) => setProposalMessage(e.target.value)}
 rows={4}
 className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 placeholder="Describe why you're the best fit..."
 />
 </div>
 </div>

 <div className="flex gap-3 mt-6">
 <Button
 onClick={() => setBidModalOpen(false)}
 variant="outline"
 className="flex-1 border-stone-200 text-stone-600 hover:bg-stone-50 font-bold rounded-xl h-11"
 >
 Cancel
 </Button>
 <Button
 onClick={handlePlaceBid}
 disabled={bidLoading || !bidAmount}
 className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-11"
 >
 {bidLoading ? <Loader2 className="size-4 animate-spin" /> : 'Submit Bid'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
