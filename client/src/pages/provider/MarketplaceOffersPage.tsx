
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, Loader2, Eye, Pause, Play, Trash2, MapPin, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getProviderMarketplaceOffers, deleteMarketplaceOffer, updateMarketplaceOffer } from '@/lib/api/marketplace-offers';
import type { MarketplaceOffer } from '@/lib/api/marketplace-offers';

export default function ProviderMarketplaceOffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await getProviderMarketplaceOffers();
      if (response.success && response.offers) {
        const data = response.offers.data || response.offers;
        setOffers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to load offers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (offer: MarketplaceOffer) => {
    try {
      setActionLoading(offer.id);
      const newStatus = offer.status === 'active' ? 'paused' : 'active';
      await updateMarketplaceOffer(offer.id, { status: newStatus, is_active: newStatus === 'active' });
      toast.success(`Offer ${newStatus === 'active' ? 'activated' : 'paused'}`);
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: newStatus, is_active: newStatus === 'active' } : o));
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to update offer');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (offer: MarketplaceOffer) => {
    if (!confirm('Are you sure you want to remove this offer?')) return;
    try {
      setActionLoading(offer.id);
      await deleteMarketplaceOffer(offer.id);
      toast.success('Offer removed');
      setOffers(prev => prev.filter(o => o.id !== offer.id));
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to remove offer');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'paused': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'expired': return 'bg-stone-100 text-stone-600 border-stone-200';
      default: return 'bg-stone-50 text-stone-700 border-stone-100';
    }
  };

  const getPriceLabel = (unit: string) => {
    switch (unit) {
      case 'per_hour': return '/ hour';
      case 'per_day': return '/ day';
      case 'per_session': return '/ session';
      case 'fixed': return ' fixed';
      default: return '';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
            <Store className="size-8 text-teal-600" />
            My Marketplace Offers
          </h1>
          <p className="text-stone-500 mt-2 text-lg">
            Manage your services visible to all careseekers in the marketplace.
          </p>
        </div>
        <Button
          onClick={() => navigate('/provider/marketplace/offers/create')}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
        >
          <Plus className="size-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="size-10 text-stone-300" />
          </div>
          <h3 className="text-xl font-semibold text-stone-900 mb-2">No offers yet</h3>
          <p className="text-stone-500 max-w-sm mx-auto mb-6">
            Create your first marketplace offer to reach careseekers looking for your services.
          </p>
          <Button
            onClick={() => navigate('/provider/marketplace/offers/create')}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
          >
            <Plus className="size-4 mr-2" />
            Create First Offer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(offer.status)}`}>
                  {offer.status}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(offer)}
                    disabled={actionLoading === offer.id}
                    className="size-8 p-0"
                  >
                    {offer.status === 'active' ? (
                      <Pause className="size-4 text-amber-600" />
                    ) : (
                      <Play className="size-4 text-emerald-600" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(offer)}
                    disabled={actionLoading === offer.id}
                    className="size-8 p-0"
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <h3 className="font-semibold text-stone-900 text-lg mb-2">{offer.title}</h3>
              <p className="text-stone-600 text-sm mb-4 line-clamp-2">{offer.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <DollarSign className="size-4 text-teal-600" />
                  <span className="font-bold text-stone-900">{offer.base_price} {offer.price_unit === 'fixed' ? '' : `/${offer.price_unit.replace('per_', '')}`}</span>
                  <span className="text-stone-400">{getPriceLabel(offer.price_unit)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Clock className="size-4 text-stone-400" />
                  {offer.duration_minutes} minutes
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <MapPin className="size-4 text-stone-400" />
                  {offer.location_type.replace('_', ' ')}
                  {offer.location_city && ` - ${offer.location_city}`}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Eye className="size-3" />
                Service type: {offer.service_type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
