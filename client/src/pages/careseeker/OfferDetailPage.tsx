
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Store, DollarSign, Clock, MapPin, Calendar, Star, User, Check, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getMarketplaceOffer, bookMarketplaceOffer } from '@/lib/api/marketplace-offers';
import type { MarketplaceOffer } from '@/lib/api/marketplace-offers';

export default function OfferDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const offerId = params.id as string;

  const [offer, setOffer] = useState<MarketplaceOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    if (offerId) {
      fetchOffer();
    }
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const response = await getMarketplaceOffer(offerId);
      if (response.success && response.offer) {
        setOffer(response.offer);
      }
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to load offer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!scheduledAt) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      setBooking(true);
      await bookMarketplaceOffer(offerId, {
        scheduled_at: scheduledAt,
        notes: notes || undefined,
      });
      toast.success('Booking created successfully!');
      navigate('/careseeker/bookings');
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to book');
      }
    } finally {
      setBooking(false);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold text-stone-900 mb-2">Offer not found</h3>
        <p className="text-stone-500">This offer may have been removed or expired.</p>
        <Button
          onClick={() => navigate('/careseeker/marketplace')}
          className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
        >
          Back to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/careseeker/marketplace')}
          className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-500"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">{offer.title}</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-200/60">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center text-xl font-bold">
            {offer.provider?.user?.firstName?.charAt(0) || 'P'}
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 text-lg">
              {offer.provider?.user?.firstName} {offer.provider?.user?.lastName}
            </h3>
            <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
              <div className="flex items-center gap-1">
                <Star className="size-4 text-amber-400 fill-amber-400" />
                <span>4.8 (24 reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="size-4 text-teal-600" />
                <span>Verified Provider</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-200/60">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Service Details</h2>

        <p className="text-stone-600 mb-6">{offer.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
            <DollarSign className="size-5 text-teal-600" />
            <div>
              <p className="text-sm text-stone-500">Price</p>
              <p className="font-semibold text-stone-900">
                {offer.base_price} {offer.price_unit === 'fixed' ? '' : `/${offer.price_unit.replace('per_', '')}`}
                <span className="text-stone-400 text-sm">{getPriceLabel(offer.price_unit)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
            <Clock className="size-5 text-teal-600" />
            <div>
              <p className="text-sm text-stone-500">Duration</p>
              <p className="font-semibold text-stone-900">{offer.duration_minutes} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
            <MapPin className="size-5 text-teal-600" />
            <div>
              <p className="text-sm text-stone-500">Location</p>
              <p className="font-semibold text-stone-900">{offer.location_type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
            <Store className="size-5 text-teal-600" />
            <div>
              <p className="text-sm text-stone-500">Service Type</p>
              <p className="font-semibold text-stone-900">{offer.service_type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {offer.care_categories && offer.care_categories.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-stone-500 mb-2">Care Categories</p>
            <div className="flex flex-wrap gap-2">
              {offer.care_categories.map(category => (
                <span
                  key={category}
                  className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium"
                >
                  {category.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-200/60">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Book This Service</h2>

        {!showBookingForm ? (
          <Button
            onClick={() => setShowBookingForm(true)}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 text-lg font-semibold"
          >
            <Calendar className="size-5 mr-2" />
            Book Now
          </Button>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduled_at">Preferred Date & Time *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements or questions..."
                rows={3}
                className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleBook}
                disabled={booking}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12"
              >
                {booking ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Check className="size-4 mr-2" />
                )}
                {booking ? 'Booking...' : 'Confirm Booking'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBookingForm(false)}
                className="border-stone-200 text-stone-600 rounded-xl h-12"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
