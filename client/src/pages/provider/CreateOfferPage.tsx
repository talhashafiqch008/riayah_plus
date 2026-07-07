
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowLeft, Loader2, DollarSign, Clock, MapPin, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { createMarketplaceOffer } from '@/lib/api/marketplace-offers';

const SERVICE_TYPES = [
  'elderly_care', 'childcare', 'nursing', 'physical_therapy',
  'mental_health', 'disability_support', 'post_surgery', 'companionship',
];

const PRICE_UNITS = [
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_session', label: 'Per Session' },
  { value: 'fixed', label: 'Fixed Price' },
];

const LOCATION_TYPES = [
  { value: 'client_home', label: 'Client Home' },
  { value: 'provider_facility', label: 'My Facility' },
  { value: 'online', label: 'Online / Video' },
  { value: 'any', label: 'Any / Flexible' },
];

const CARE_CATEGORIES = [
  'mobility_assistance', 'medication_management', 'meal_preparation',
  'personal_hygiene', 'transportation', 'exercise_support', 'memory_care',
  'wound_care', 'respiratory_care', 'dementia_care', 'autism_support',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CreateMarketplaceOfferPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_type: '',
    care_categories: [] as string[],
    base_price: '',
    price_unit: 'per_hour',
    duration_minutes: '60',
    location_type: 'any',
    location_city: '',
    requires_booking: true,
    expires_at: '',
    available_schedule: {} as Record<string, string[]>,
  });

  const toggleCareCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      care_categories: prev.care_categories.includes(category)
        ? prev.care_categories.filter(c => c !== category)
        : [...prev.care_categories, category],
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => {
      const current = prev.available_schedule[day] || [];
      const updated = current.length > 0 ? {} : { [day]: ['09:00-17:00'] };
      return {
        ...prev,
        available_schedule: { ...prev.available_schedule, ...updated },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.service_type || !formData.base_price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await createMarketplaceOffer({
        title: formData.title,
        description: formData.description,
        service_type: formData.service_type,
        care_categories: formData.care_categories,
        base_price: parseFloat(formData.base_price),
        price_unit: formData.price_unit as 'per_hour' | 'per_day' | 'per_session' | 'fixed',
        duration_minutes: parseInt(formData.duration_minutes),
        location_type: formData.location_type as 'client_home' | 'provider_facility' | 'online' | 'any',
        location_city: formData.location_city || undefined,
        requires_booking: formData.requires_booking,
        expires_at: formData.expires_at || undefined,
        available_schedule: formData.available_schedule,
      });
      toast.success('Offer created successfully!');
      navigate('/provider/marketplace/offers');
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to create offer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/provider/marketplace/offers')}
          className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-500"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
            <Store className="size-8 text-teal-600" />
            Create Marketplace Offer
          </h1>
          <p className="text-stone-500 mt-2 text-lg">
            Publish your service to the marketplace for careseekers to discover.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900">Basic Information</h2>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Elderly Care - Full Day Support"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your service, experience, and what careseekers can expect..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="service_type">Service Type *</Label>
            <select
              id="service_type"
              value={formData.service_type}
              onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
            >
              <option value="">Select service type</option>
              {SERVICE_TYPES.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <DollarSign className="size-5 text-teal-600" />
            Pricing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_price">Base Price *</Label>
              <Input
                id="base_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="price_unit">Price Unit *</Label>
              <select
                id="price_unit"
                value={formData.price_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, price_unit: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-700"
              >
                {PRICE_UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
            <Input
              id="duration_minutes"
              type="number"
              min="15"
              step="15"
              value={formData.duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <MapPin className="size-5 text-teal-600" />
            Location
          </h2>

          <div>
            <Label htmlFor="location_type">Location Type *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
              {LOCATION_TYPES.map(loc => (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, location_type: loc.value }))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    formData.location_type === loc.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-stone-100 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="location_city">City</Label>
            <Input
              id="location_city"
              value={formData.location_city}
              onChange={(e) => setFormData(prev => ({ ...prev, location_city: e.target.value }))}
              placeholder="e.g., Riyadh"
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900">Care Categories</h2>
          <div className="flex flex-wrap gap-2">
            {CARE_CATEGORIES.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCareCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  formData.care_categories.includes(category)
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-stone-100 text-stone-600 hover:border-stone-300'
                }`}
              >
                {category.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Calendar className="size-5 text-teal-600" />
            Weekly Availability
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all flex items-center gap-2 ${
                  formData.available_schedule[day]
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-stone-100 text-stone-600 hover:border-stone-300'
                }`}
              >
                {formData.available_schedule[day] && <Check className="size-3" />}
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900">Offer Expiry (Optional)</h2>
          <div>
            <Label htmlFor="expires_at">Expires At</Label>
            <Input
              id="expires_at"
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8"
          >
            {submitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Store className="size-4 mr-2" />
            )}
            {submitting ? 'Publishing...' : 'Publish to Marketplace'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/provider/marketplace/offers')}
            className="border-stone-200 text-stone-600 rounded-xl"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
