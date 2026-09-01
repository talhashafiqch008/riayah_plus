
/**
 * Matches Page
 * Display provider matches with filters and pagination
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import ProviderCard from '../../components/ProviderCard';
import MatchFilters, { FilterValues } from '../../components/MatchFilters';
import { matchingAPI } from '../../lib/api/matching';
import { MatchResult } from '../../lib/matching-engine';
import { useAuth } from '../../contexts/AuthContext';




export default function MatchesPage() {
 const navigate = useNavigate();
 const { user } = useAuth();
 const [matches, setMatches] = useState<MatchResult[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [page, setPage] = useState(1);
 const [totalCount, setTotalCount] = useState(0);
 const [hasMore, setHasMore] = useState(false);

  const [filters, setFilters] = useState<FilterValues>({
  maxDistance: 20,
  urgency: 'FLEXIBLE',
  genderPreference: 'NO_PREFERENCE',
  languages: ['English']
  });

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    const getBrowserLocation = () => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setUserLocation(coords);
            localStorage.setItem('user_location', JSON.stringify({ ...coords, timestamp: Date.now() }));
            setLocationError(false);
          },
          (err) => {
            console.warn('Geolocation denied or error:', err);
            setLocationError(true);
            const cached = localStorage.getItem('user_location');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                const age = Date.now() - (parsed.timestamp || 0);
                if (age < 86400000) {
                  setUserLocation({ latitude: parsed.latitude, longitude: parsed.longitude });
                }
              } catch {
                localStorage.removeItem('user_location');
              }
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        setLocationError(true);
      }
    };

    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.timestamp || 0);
        if (age < 3600000) {
          setUserLocation({ latitude: parsed.latitude, longitude: parsed.longitude });
          return;
        }
      } catch {
        localStorage.removeItem('user_location');
      }
    }
    
    getBrowserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadMatches();
    }
  }, [filters, page, userLocation]);

  const loadMatches = async () => {
  setLoading(true);
  setError(null);

  try {
  if (!user) {
  navigate('/careseeker/login');
  return;
  }

  const location = userLocation || { latitude: 25.2854, longitude: 51.5310 };

 // Get care categories from onboarding
 let careCategories: string[] = [];
 try {
 const draft = localStorage.getItem(STORAGE_KEYS.careseekerOnboardingDraft);
 if (draft) {
 const parsed = JSON.parse(draft);
 careCategories = parsed.data?.careCategories || [];
 }
 } catch (e) {
 console.error('Error loading care categories:', e);
 }

 // Build request
 const request = {
 careseeker_id: user.id,
 latitude: location.latitude,
 longitude: location.longitude,
 max_distance_km: filters.maxDistance,
 care_type: careCategories[0]?.toUpperCase() || 'AGED_CARE', // Get from onboarding
 budget_max: filters.budgetMax,
 budget_min: filters.budgetMin,
 gender_preference: filters.genderPreference as 'MALE' | 'FEMALE' | 'NO_PREFERENCE' | undefined,
 language_preferences: filters.languages,
 urgency: filters.urgency,
 page,
 limit: 10
 };

 const response = await matchingAPI.findProviders(request);

 setMatches(response.matches as unknown as MatchResult[]);
 setTotalCount(response.total_count);
 setHasMore(response.has_more);
 } catch (err: unknown) {
 console.error('Load matches error:', err);
 setError(err instanceof Error ? err.message : 'Failed to load matches');
 } finally {
 setLoading(false);
 }
 };

 const handleFilterChange = (newFilters: FilterValues) => {
 setFilters(newFilters);
 setPage(1); // Reset to first page
 };

 const handleViewDetails = (providerId: string) => {
 navigate(`/careseeker/providers/${providerId}`);
 };

 const handleBook = (providerId: string) => {
 navigate(`/careseeker/booking/${providerId}`);
 };

 const handleNextPage = () => {
 if (hasMore) {
 setPage(page + 1);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 };

 const handlePrevPage = () => {
 if (page > 1) {
 setPage(page - 1);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }
 };

 return (
 <div className="min-h-screen bg-stone-50">
 {/* Header */}
 <div className="bg-white border-b ring-1 ring-stone-200/50">
 <div className="max-w-7xl mx-auto px-4 py-6">
 <h1 className="text-3xl font-semibold text-stone-900">Find Your Care Provider</h1>
 <p className="text-stone-600 mt-1">Matched providers based on your needs</p>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 py-8">
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 {/* Filters Sidebar */}
 <div className="lg:col-span-1">
 <div className="sticky top-4">
 <MatchFilters
 onFilterChange={handleFilterChange}
 initialFilters={filters}
 />
 </div>
 </div>

 {/* Matches List */}
 <div className="lg:col-span-3">
 {/* Results Header */}
 {!loading && !error && (
 <div className="mb-6 flex items-center justify-between">
 <div>
 <p className="text-sm text-stone-600">
 Showing {matches.length} of {totalCount} providers
 </p>
 </div>
 <button
 onClick={loadMatches}
 className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
 >
 <Search className="size-4" />
 Refresh
 </button>
 </div>
 )}

 {/* Loading State */}
 {loading && (
 <div className="flex items-center justify-center py-20">
 <div className="text-center">
 <Loader2 className="size-12 text-teal-600 animate-spin mx-auto mb-4" />
 <p className="text-stone-600">Finding the best matches for you…</p>
 </div>
 </div>
 )}

 {/* Error State */}
 {error && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
 <AlertCircle className="size-6 text-red-600 flex-shrink-0 mt-0.5" />
 <div>
 <h3 className="font-semibold text-red-900 mb-1">Error Loading Matches</h3>
 <p className="text-sm text-red-700">{error}</p>
 <button
 onClick={loadMatches}
 className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
 >
 Try Again
 </button>
 </div>
 </div>
 )}

 {/* Empty State */}
 {!loading && !error && matches.length === 0 && (
 <div className="text-center py-20">
 <div className="size-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <Search className="size-10 text-stone-400" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No matches found</h3>
 <p className="text-stone-600 mb-6">
 Try adjusting your filters to see more providers
 </p>
 <button
 onClick={() => handleFilterChange({
 maxDistance: 50,
 urgency: 'FLEXIBLE',
 genderPreference: 'NO_PREFERENCE',
 languages: []
 })}
 className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
 >
 Reset Filters
 </button>
 </div>
 )}

 {/* Matches Grid */}
 {!loading && !error && matches.length > 0 && (
 <>
 <div className="space-y-4">
 {matches.map((match) => (
 <ProviderCard
 key={match.provider_id}
 match={match}
 onViewDetails={handleViewDetails}
 onBook={handleBook}
 />
 ))}
 </div>

 {/* Pagination */}
 <div className="mt-8 flex items-center justify-between border-t ring-1 ring-stone-200/50 pt-6">
 <button
 onClick={handlePrevPage}
 disabled={page === 1}
 className="px-6 py-3 ring-1 ring-stone-200/50 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Previous
 </button>

 <div className="text-sm text-stone-600">
 Page {page} of {Math.ceil(totalCount / 10)}
 </div>

 <button
 onClick={handleNextPage}
 disabled={!hasMore}
 className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Next
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
