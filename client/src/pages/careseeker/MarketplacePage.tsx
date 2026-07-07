
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, DollarSign, Clock, Store, Loader2, Star, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getMarketplaceOffers } from '@/lib/api/marketplace-offers';
import type { MarketplaceOffer } from '@/lib/api/marketplace-offers';

const SERVICE_TYPES = [
  'All', 'elderly_care', 'childcare', 'nursing', 'physical_therapy',
  'mental_health', 'disability_support', 'post_surgery', 'companionship',
];

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    service_type: '',
    location_city: '',
    min_price: '',
    max_price: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await getMarketplaceOffers({
        service_type: filters.service_type || undefined,
        location_city: filters.location_city || undefined,
        min_price: filters.min_price ? parseFloat(filters.min_price) : undefined,
        max_price: filters.max_price ? parseFloat(filters.max_price) : undefined,
      });
      if (response.success && response.offers) {
        const data = response.offers.data || response.offers;
        setOffers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to load marketplace');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOffers();
  };

  const getPriceLabel = (unit: string) => {
    switch (unit) {
      case 'per_hour': return '/ hour';
      case 'per_day': return '/ day';
      case 'per_session': return '/ session';
      case 'fixed': return '';
      default: return '';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
            <Store className="size-8 text-teal-600" />
            Care Marketplace
          </h1>
          <p className="text-stone-500 mt-2 text-lg">
            Browse and book services from verified care providers.
          </p>
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl"
        >
          <SlidersHorizontal className="size-4 mr-2" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Service Type</Label>
              <select
                value={filters.service_type}
                onChange={(e) => setFilters(prev => ({ ...prev, service_type: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
              >
                <option value="">All Types</option>
                {SERVICE_TYPES.filter(t => t !== 'All').map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={filters.location_city}
                onChange={(e) => setFilters(prev => ({ ...prev, location_city: e.target.value }))}
                placeholder="e.g., Riyadh"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Min Price</Label>
              <Input
                type="number"
                value={filters.min_price}
                onChange={(e) => setFilters(prev => ({ ...prev, min_price: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Max Price</Label>
              <Input
                type="number"
                value={filters.max_price}
                onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
                placeholder="Any"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSearch}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
            >
              <Search className="size-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="size-10 text-stone-300" />
          </div>
          <h3 className="text-xl font-semibold text-stone-900 mb-2">No offers available</h3>
          <p className="text-stone-500 max-w-sm mx-auto">
            Care providers are setting up their services. Check back soon for new offerings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div
              key={offer.id}
              onClick={() => navigate(`/careseeker/marketplace/offers/${offer.id}`)}
              className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.02)] cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center text-lg font-bold">
                    {offer.provider?.user?.firstName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">
                      {offer.provider?.user?.firstName} {offer.provider?.user?.lastName}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-stone-500">
                      <Star className="size-3 text-amber-400 fill-amber-400" />
                      <span>4.8</span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                  {offer.service_type.replace('_', ' ')}
                </span>
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

              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
                View Details
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-stone-700">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700 ${props.className || ''}`}
    />
  );
}
