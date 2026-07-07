
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
 Search, Filter, MapPin, Star, Clock, Shield, CheckCircle, X,
 Sparkles, SlidersHorizontal, ChevronDown, ChevronUp, Heart,
 MessageCircle, Calendar, Globe, Users, Award, Languages,
 TrendingUp, Zap, Info, ArrowRight, User, Lock, CreditCard, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { getMatchedProviders } from '@/lib/api';


// AI Matching Algorithm
interface Provider {
 id: string;
 user_id?: string;
 name: string;
 avatar?: string;
 role: string;
 rating: number;
 reviewCount: number;
 hourlyRate: number;
 currency: 'SAR' | 'EGP';
 verified: boolean;
 languages: string[];
 specialties: string[];
 location: string;
 distance: string;
 available: boolean;
 experience: number; // years
 careCategories: string[]; // Matches onboarding categories
 certifications: string[];
 availability: string[];
 responseTime: string;
 completionRate: number;
 bio?: string;
 // API specific fields
 apiMatchScore?: number;
 apiMatchReasons?: string[];
}

interface MatchScore {
 overall: number;
 categoryMatch: number;
 locationMatch: number;
 preferenceMatch: number;
 availabilityMatch: number;
 ratingScore: number;
 explanation: string[];
}

// Mock providers data removed in favor of API

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (
 lat1: number,
 lon1: number,
 lat2: number,
 lon2: number
): number => {
 const R = 6371; // Radius of the Earth in kilometers
 const dLat = (lat2 - lat1) * Math.PI / 180;
 const dLon = (lon2 - lon1) * Math.PI / 180;
 const a =
 Math.sin(dLat / 2) * Math.sin(dLat / 2) +
 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
 Math.sin(dLon / 2) * Math.sin(dLon / 2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 const distance = R * c;
 return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// AI Matching Algorithm
const calculateMatchScore = (
 provider: Provider,
 userPreferences: {
 careCategories: string[];
 location?: string;
 preferredGender?: string;
 preferredLanguages: string[];
 availability?: string[];
 maxRate?: number;
 }
): MatchScore => {
 const scores: MatchScore = {
 overall: 0,
 categoryMatch: 0,
 locationMatch: 0,
 preferenceMatch: 0,
 availabilityMatch: 0,
 ratingScore: 0,
 explanation: [],
 };

 // If API has already calculated the score, use it and return early
 if (provider.apiMatchScore !== undefined && provider.apiMatchReasons) {
 return {
 overall: provider.apiMatchScore,
 categoryMatch: 0, // Not provided by API individually
 locationMatch: 0,
 preferenceMatch: 0,
 availabilityMatch: 0,
 ratingScore: 0,
 explanation: provider.apiMatchReasons
 };
 }

 // Category Match (40% weight)
 const matchingCategories = provider.careCategories.filter(cat =>
 userPreferences.careCategories.includes(cat)
 ).length;
 const totalCategories = userPreferences.careCategories.length;
 scores.categoryMatch = totalCategories > 0
 ? (matchingCategories / totalCategories) * 100
 : 50; // Default if no categories selected

 if (scores.categoryMatch > 80) {
 scores.explanation.push('Perfect match for your care categories');
 } else if (scores.categoryMatch > 50) {
 scores.explanation.push('Good match for some of your care needs');
 }

 // Location Match (15% weight)
 if (userPreferences.location) {
 scores.locationMatch = provider.distance.includes('km')
 ? Math.max(0, 100 - (parseFloat(provider.distance) * 10))
 : 80;
 if (scores.locationMatch > 70) {
 scores.explanation.push('Close to your location');
 }
 } else {
 scores.locationMatch = 70; // Default
 }

 // Language Match (15% weight)
 const matchingLanguages = provider.languages.filter(lang =>
 userPreferences.preferredLanguages.some(pref =>
 lang.toLowerCase().includes(pref.toLowerCase()) ||
 pref.toLowerCase().includes(lang.toLowerCase())
 )
 ).length;
 scores.preferenceMatch = userPreferences.preferredLanguages.length > 0
 ? (matchingLanguages / userPreferences.preferredLanguages.length) * 100
 : 50;

 if (scores.preferenceMatch > 70) {
 scores.explanation.push('Speaks your preferred language(s)');
 }

 // Availability Match (10% weight)
 if (userPreferences.availability && userPreferences.availability.length > 0) {
 const matchingDays = provider.availability.filter(day =>
 userPreferences.availability!.includes(day)
 ).length;
 scores.availabilityMatch = (matchingDays / userPreferences.availability.length) * 100;
 if (scores.availabilityMatch > 70) {
 scores.explanation.push('Available on your preferred days');
 }
 } else {
 scores.availabilityMatch = 60; // Default
 }

 // Rating Score (20% weight)
 scores.ratingScore = (provider.rating / 5) * 100;
 if (scores.ratingScore > 90) {
 scores.explanation.push('Highly rated by other care seekers');
 }

 // Calculate overall score (weighted average)
 scores.overall = Math.round(
 scores.categoryMatch * 0.40 +
 scores.locationMatch * 0.15 +
 scores.preferenceMatch * 0.15 +
 scores.availabilityMatch * 0.10 +
 scores.ratingScore * 0.20
 );

 // Add bonus for verified providers
 if (provider.verified) {
 scores.overall = Math.min(100, scores.overall + 5);
 scores.explanation.push('Verified provider');
 }

 // Add bonus for high completion rate
 if (provider.completionRate > 95) {
 scores.overall = Math.min(100, scores.overall + 3);
 scores.explanation.push('Excellent reliability');
 }

 return scores;
};

export default function ProvidersPage() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const [searchQuery, setSearchQuery] = useState('');
 const [showFilters, setShowFilters] = useState(false);
 const [sortBy, setSortBy] = useState<'match' | 'rating' | 'price-low' | 'price-high'>('match');
 const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
 const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
 const [maxRate, setMaxRate] = useState<number | null>(null);
 const [providers, setProviders] = useState<Provider[]>([]);
 const [hasPaidAccess, setHasPaidAccess] = useState(true);
 const [userPreferences, setUserPreferences] = useState<{
 careCategories: string[];
 location?: string;
 preferredGender?: string;
 preferredLanguages: string[];
 availability?: string[];
 maxRate?: number;
 }>({
 careCategories: [],
 preferredLanguages: [],
 });

 const [userLocation, setUserLocation] = useState<{
 lat: number;
 lng: number;
 address?: string;
 city?: string;
 state?: string;
 postal_code?: string;
 } | null>(null);

 const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    const getBrowserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({
              lat: latitude,
              lng: longitude
            });
            setLocationDenied(false);
            localStorage.setItem('user_geo', JSON.stringify({ lat: latitude, lng: longitude, ts: Date.now() }));
          },
          (err) => {
            console.warn('Geolocation denied:', err);
            setLocationDenied(true);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        setLocationDenied(true);
      }
    };

    const cached = localStorage.getItem('user_geo');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.ts || 0);
        if (age < 3600000) {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      } catch {
        localStorage.removeItem('user_geo');
      }
    }

    getBrowserLocation();
  }, []);

 // Effect 2: Load Preferences & Payment Status
 useEffect(() => {
 // Check payment access status from API


 // Load preferences from onboarding
 try {
 const country = user?.country === 'EGY' ? 'EGY' : 'SAU';
 const draft = localStorage.getItem(STORAGE_KEYS.careseekerOnboardingDraft);
 if (draft) {
 const parsed = JSON.parse(draft);
 const data = parsed.data || {};

 setUserPreferences({
 careCategories: data.careCategories || [],
 preferredLanguages: data.preferredLanguages || ['English', 'Arabic'],
 availability: data.availability || [],
 location: data.location || (country === 'EGY' ? 'Cairo' : 'Riyadh'),
 });
 }
 } catch (e) {
 console.error('Error loading preferences:', e);
 }
 }, [user]);

 // Fetch Providers
  const fetchProviders = useCallback(async (params: Record<string, string | number | boolean | undefined> = {}) => {
  if (!user) return;

  const country = user.country === 'EGY' ? 'EGY' : 'SAU';
  try {
  // Include location in filters if available
  const filters: Record<string, unknown> = { country, ...params };
  if (userLocation) {
  filters.lat = userLocation.lat;
  filters.lng = userLocation.lng;
  }

  const response = await getMatchedProviders(filters);
 // Handle API response structure
 if (response.success && Array.isArray(response.providers)) {
 // Map API providers to frontend Provider interface
 const mappedProviders: Provider[] = response.providers.map((p: {
 id: string | number;
 user_id?: string | number;
 name: string;
 avatar?: string;
 license_type?: string;
 average_rating?: number;
 rating_count?: number;
 hourly_rate: string | number;
 verified?: boolean;
 is_verified?: boolean;
 languages?: string[];
 specialties?: string[];
 service_location?: string;
 city?: string;
 location?: string;
 latitude?: number;
 longitude?: number;
 bio?: string;
 experience?: number;
 years_of_experience?: number;
 availability?: { days?: string[] } | string[];
 response_time?: string;
 completion_rate?: number;
 match_score?: number;
 match_reasons?: string[];
 }) => {
 // Calculate distance if both user and provider locations are available
 let distanceStr = 'N/A';
 if (userLocation && p.latitude && p.longitude) {
 const dist = calculateDistance(
 userLocation.lat,
 userLocation.lng,
 p.latitude,
 p.longitude
 );
 distanceStr = `${dist}km`;
 } else if (p.city || p.location) {
 // If coordinates not available, show city name
 distanceStr = p.city || p.location || (country === 'EGY' ? 'Cairo' : 'Riyadh');
 }

 return {
 id: String(p.id),
 user_id: String(p.user_id || p.id),
 name: p.name,
 // handle optional checks safely
 avatar: p.avatar || undefined,
 role: p.license_type || 'Care Provider',
 rating: p.average_rating || 0,
 reviewCount: p.rating_count || 0,
 hourlyRate: parseFloat(String(p.hourly_rate)),
 currency: country === 'EGY' ? 'EGP' : 'SAR',
 verified: p.verified !== undefined ? p.verified : (p.is_verified || false),
 languages: p.languages || [],
 specialties: p.specialties || [],
 location: p.service_location === 'both' ? (country === 'EGY' ? 'Cairo' : 'Riyadh') : p.service_location,
 distance: distanceStr,
 available: true,
 experience: p.experience || p.years_of_experience || null,
 careCategories: p.specialties || [], // Mapping specialties to categories
 certifications: [p.license_type].filter(Boolean),
 availability: (p.availability && typeof p.availability === 'object' && !Array.isArray(p.availability) ? p.availability.days : p.availability) || [],
 responseTime: p.response_time || null,
 completionRate: p.completion_rate || null,
 bio: p.bio,
 apiMatchScore: p.match_score,
 apiMatchReasons: p.match_reasons
 };
 });
 setProviders(mappedProviders);
 } else if (Array.isArray(response)) {
 // Fallback for mock data structure
 setProviders(response);
 }
 } catch (error) {
 console.error("Failed to fetch matched providers", error);
 toast.error('Failed to load providers. Please try again.');
 }
 }, [user, userLocation]);

 // Initial fetch
 useEffect(() => {
 fetchProviders();
 }, [fetchProviders]);

 // Calculate match scores for all providers
 const providersWithScores = useMemo(() => {
 return providers.map(provider => ({
 provider,
 matchScore: calculateMatchScore(provider, userPreferences),
 }));
 }, [providers, userPreferences]);

 // Filter and sort providers
 const filteredAndSortedProviders = useMemo(() => {
 const filtered = providersWithScores.filter(({ provider }) => {
 // Search filter
 if (searchQuery) {
 const query = searchQuery.toLowerCase();
 const matchesSearch =
 provider.name.toLowerCase().includes(query) ||
 provider.role.toLowerCase().includes(query) ||
 provider.specialties.some(s => s.toLowerCase().includes(query)) ||
 provider.bio?.toLowerCase().includes(query);
 if (!matchesSearch) return false;
 }

 // Category filter
 if (selectedCategories.length > 0) {
 const hasCategory = selectedCategories.some(cat =>
 provider.careCategories.includes(cat)
 );
 if (!hasCategory) return false;
 }

 // Language filter
 if (selectedLanguages.length > 0) {
 const hasLanguage = selectedLanguages.some(lang =>
 provider.languages.some(pLang =>
 pLang.toLowerCase().includes(lang.toLowerCase())
 )
 );
 if (!hasLanguage) return false;
 }

 // Price filter
 if (maxRate && provider.hourlyRate > maxRate) {
 return false;
 }

 return true;
 });

 // Sort
 filtered.sort((a, b) => {
 switch (sortBy) {
 case 'match':
 return b.matchScore.overall - a.matchScore.overall;
 case 'rating':
 return b.provider.rating - a.provider.rating;
 case 'price-low':
 return a.provider.hourlyRate - b.provider.hourlyRate;
 case 'price-high':
 return b.provider.hourlyRate - a.provider.hourlyRate;
 default:
 return 0;
 }
 });

 return filtered;
 }, [providersWithScores, searchQuery, selectedCategories, selectedLanguages, maxRate, sortBy]);

 const handleBookProvider = (providerId: string) => {
 navigate(`/careseeker/booking/${providerId}`);
 };

 const handleMessageProvider = (providerId: string) => {
 navigate(`/careseeker/messages?provider=${providerId}`);
 };

 const handleViewProviderDetails = (providerId: string) => {
 navigate(`/careseeker/providers/${providerId}`);
 };

 const getMatchColor = (score: number) => {
 if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
 if (score >= 75) return 'text-teal-600 bg-teal-50 border-teal-200';
 if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
 return 'text-stone-600 bg-stone-50 ring-1 ring-stone-200/50';
 };

 const getMatchLabel = (score: number) => {
 if (score >= 90) return 'Excellent Match';
 if (score >= 75) return 'Great Match';
 if (score >= 60) return 'Good Match';
 return 'Match';
 };

 const availableCategories = [
 { id: 'aged_care', label: 'Aged Care' },
 { id: 'disability_support', label: 'Disability Support' },
 { id: 'child_family', label: 'Child & Family Support' },
 { id: 'allied_health', label: 'Allied Health' },
 { id: 'home_support', label: 'Home Support' },
 ];

 const availableLanguages = ['Arabic', 'English', 'Hindi', 'Urdu', 'Tagalog', 'French'];

 return (
 <div className="min-h-screen bg-stone-50/50 p-4 lg:p-8">
 {/* Soft Header */}
 <header className="mb-8">
 <div className="max-w-7xl mx-auto">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-semibold text-stone-800 tracking-tight">Find Providers</h1>
 <p className="text-stone-500 mt-1 font-medium">
 AI-powered matching to connect you with the best care
 </p>
 </div>
 <div className="flex items-center gap-3">
 {filteredAndSortedProviders.length > 0 && (
 <button
 onClick={() => {
 setSearchQuery('');
 setSelectedCategories([]);
 setSelectedLanguages([]);
 setMaxRate(null);
 fetchProviders({ no_match: true });
 }}
 className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition-transform duration-300  bg-white text-stone-600 hover:bg-stone-50 ring-1 ring-stone-200/50"
 >
 <X className="size-4" />
 Clear Filters
 </button>
 )}
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-transform duration-300  ${showFilters ? 'bg-teal-600 text-white shadow-teal-200' : 'bg-white text-stone-600 hover:bg-stone-50' }`}
 >
 <SlidersHorizontal className="size-4" />
 Filters
 </button>
 </div>
 </div>
 </div>
 </header>

 <div className="max-w-7xl mx-auto">
 <div className="flex flex-col lg:flex-row gap-8">
 {/* Floating Filters Sidebar */}
 <AnimatePresence>
 {showFilters && (
 <motion.aside
 initial={{ x: -20, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 exit={{ x: -20, opacity: 0 }}
 className="lg:w-80 flex-shrink-0"
 >
 <div className="bg-white rounded-[2rem] shadow-xl shadow-stone-200/60 p-8 sticky top-8 border border-white/50">
 <div className="flex items-center justify-between mb-8">
 <h2 className="text-2xl font-semibold text-stone-800">Filters</h2>
 <button
 onClick={() => setShowFilters(false)}
 className="lg:hidden p-2 text-stone-400 hover:text-stone-600 bg-stone-50 rounded-full"
 >
 <X className="size-5" />
 </button>
 </div>

 {/* Care Categories */}
 <div className="mb-8">
 <span className="block text-sm font-bold text-stone-800 mb-4">
 Care Categories
 </span>
 <div className="space-y-3">
 {availableCategories.map((category) => (
 <label
 key={category.id}
 className="flex items-center gap-3 cursor-pointer group"
 >
 <div className={`size-5 rounded-md border flex items-center justify-center transition-colors ${selectedCategories.includes(category.id) ? 'bg-teal-500 border-teal-500' : 'border-stone-300 group-hover:border-teal-400'}`}>
 {selectedCategories.includes(category.id) && <CheckCircle className="size-3.5 text-white" />}
 </div>
 <input
 type="checkbox"
 className="hidden"
 checked={selectedCategories.includes(category.id)}
 onChange={(e) => {
 if (e.target.checked) setSelectedCategories([...selectedCategories, category.id]);
 else setSelectedCategories(selectedCategories.filter(id => id !== category.id));
 }}
 />
 <span className={`text-sm font-medium transition-colors ${selectedCategories.includes(category.id) ? 'text-teal-700' : 'text-stone-600'}`}>{category.label}</span>
 </label>
 ))}
 </div>
 </div>

 {/* Languages */}
 <div className="mb-8">
 <span className="block text-sm font-bold text-stone-800 mb-4">
 Languages
 </span>
 <div className="flex flex-wrap gap-2">
 {availableLanguages.map((language) => (
 <label
 key={language}
 className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-transform duration-300 ${selectedLanguages.includes(language) ? 'bg-teal-100 text-teal-700' : 'bg-stone-50 text-stone-600 hover:bg-stone-100' }`}
 >
 <input
 type="checkbox"
 className="hidden"
 checked={selectedLanguages.includes(language)}
 onChange={(e) => {
 if (e.target.checked) setSelectedLanguages([...selectedLanguages, language]);
 else setSelectedLanguages(selectedLanguages.filter(lang => lang !== language));
 }}
 />
 {language}
 </label>
 ))}
 </div>
 </div>

 {/* Max Rate */}
 <div className="mb-8">
 <span className="block text-sm font-bold text-stone-800 mb-4">
 Max Hourly Rate
 </span>
 <div className="relative">
 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">{providers[0]?.currency || 'SAR'}</span>
 <input
 type="number"
 value={maxRate || ''}
 onChange={(e) => setMaxRate(e.target.value ? Number(e.target.value) : null)}
 placeholder="No limit"
 className="w-full pl-12 pr-4 py-3 bg-stone-50 border-0 rounded-2xl text-sm font-bold text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 transition-shadow"
 />
 </div>
 </div>

 {/* Clear Filters */}
 {(selectedCategories.length > 0 || selectedLanguages.length > 0 || maxRate) && (
 <button
 onClick={() => {
 setSelectedCategories([]);
 setSelectedLanguages([]);
 setMaxRate(null);
 fetchProviders({ no_match: true });
 }}
 className="w-full py-3 text-sm font-bold text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
 >
 Reset Filters
 </button>
 )}
 </div>
 </motion.aside>
 )}
 </AnimatePresence>

 {/* Main Content */}
 <div className="flex-1 min-w-0">
 {/* Search Bar - Floating Style */}
 <div className="bg-white rounded-full shadow-lg shadow-stone-200/40 p-2 mb-8 flex items-center border border-white/50">
 <div className="flex-1 flex items-center px-4 gap-3">
 <Search className="size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search providers..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent border-0 focus:ring-0 text-stone-700 font-medium placeholder:text-stone-400"
 />
 </div>
 <div className="h-8 w-px bg-stone-100 mx-2"></div>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as 'match' | 'rating' | 'price-low' | 'price-high')}
 className="bg-transparent border-0 focus:ring-0 text-sm font-bold text-stone-600 cursor-pointer pr-10"
 >
 <option value="match">Best Match</option>
 <option value="rating">Top Rated</option>
 <option value="price-low">Lowest Price</option>
 <option value="price-high">Highest Price</option>
 </select>
 </div>

 {/* Location Warning */}
 {locationDenied && (
 <div className="bg-amber-50 rounded-2xl p-4 mb-6 flex gap-3 border border-amber-100">
 <div className="p-2 bg-white rounded-full ">
 <MapPin className="size-5 text-amber-500" />
 </div>
 <div>
 <h3 className="font-semibold text-stone-800 text-sm">Location Disabled</h3>
 <p className="text-xs text-stone-500 mt-0.5">Enable location for better matching.</p>
 </div>
 </div>
 )}

 <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-[2rem] p-6 mb-8 border border-white/50  relative overflow-hidden">
 <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
 <div className="p-4 bg-white/90 backdrop-blur-xl rounded-2xl ">
 <CreditCard className="size-8 text-teal-500" />
 </div>
 <div className="flex-1 text-center sm:text-left">
 <h3 className="text-lg font-semibold text-stone-900">Credits System Active</h3>
 <p className="text-stone-600 text-sm mt-1 mb-4 sm:mb-0">
 Top up your wallet to book providers and manage payments seamlessly.
 </p>
 </div>
 <button
 onClick={() => navigate('/careseeker/wallet')}
 className="px-6 py-3 bg-stone-900 text-white font-bold rounded-full hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-transform duration-300 flex items-center gap-2"
 >
 <CreditCard className="size-4" />
 Top Up Credits
 </button>
 </div>
 </div>

 {/* AI Match Info Banner */}
 {userPreferences.careCategories.length > 0 && (
 <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-4 mb-6">
 <div className="flex items-start gap-3">
 <div className="p-2 bg-teal-100 rounded-lg">
 <Sparkles className="size-5 text-teal-600" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-stone-900 mb-1">AI Matching Active</h3>
 <p className="text-sm text-stone-600">
 Providers are ranked by how well they match your care needs: {userPreferences.careCategories.map(cat => {
 const category = availableCategories.find(c => c.id === cat);
 return category?.label;
 }).filter(Boolean).join(', ')}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Results Stats */}
 <div className="flex items-center justify-between mb-6 px-2">
 <span className="text-stone-400 font-bold text-sm uppercase tracking-wider">
 {filteredAndSortedProviders.length} Providers Found
 </span>
 </div>

 {/* Provider Cards */}
 <div className="space-y-12">
 {filteredAndSortedProviders.map(({ provider, matchScore }) => (
 <motion.div
 key={provider.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 onClick={() => handleViewProviderDetails(provider.id)}
 className="group bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-stone-200/40 border border-white/60 hover:shadow-2xl hover:shadow-stone-200/60 transition-transform duration-300 relative overflow-hidden cursor-pointer"
 >
 {/* Match Badge - Floating */}
 <div className="absolute top-6 right-8 z-10">
 <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border  ${scoreStyles(matchScore.overall)}`}>
 <Zap className="size-4 fill-current" />
 <span className="font-bold text-sm">{matchScore.overall}% Match</span>
 </div>
 </div>

 <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
 {/* Avatar Column */}
 <div className="flex-shrink-0">
 <div className="relative">
 {provider.avatar ? (
 <div className="size-24 rounded-[2rem] bg-stone-100 overflow-hidden shadow-inner">
 {/* Avatar Img would go here */}
 <div className="size-full flex items-center justify-center bg-gradient-to-br from-teal-400 to-blue-500 text-white text-3xl font-bold">
 {provider.avatar}
 </div>
 </div>
 ) : (
 <div className="size-24 rounded-[2rem] bg-stone-50 flex items-center justify-center shadow-inner">
 <User className="size-10 text-stone-300" />
 </div>
 )}
 {provider.verified && (
 <div className="absolute -bottom-2 -right-2 size-8 bg-blue-500 rounded-xl flex items-center justify-center border-4 border-white " title="Verified Provider">
 <Shield className="size-4 text-white fill-current" />
 </div>
 )}
 </div>
 </div>

 {/* Info Column */}
 <div className="flex-1 min-w-0 pt-1">
 <div className="mb-4 pr-32"> {/* Padding right for badge */}
 <h3 className="text-2xl font-semibold text-stone-900 truncate">
 {provider.name}
 </h3>
 <div className="flex items-center gap-2 text-stone-500 font-medium mt-1">
 <span>{provider.role}</span>
 <span className="size-1 bg-stone-300 rounded-full"></span>
 <div className="flex items-center gap-1">
 <Star className="size-4 text-amber-400 fill-current" />
 <span className="text-stone-800 font-bold">{provider.rating}</span>
 <span className="text-xs">({provider.reviewCount})</span>
 </div>
 </div>
 </div>

 {/* Pills Row */}
 <div className="flex flex-wrap gap-2 mb-4">
 {/* Distance Pill */}
 <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 text-stone-600 rounded-full text-xs font-bold">
 <MapPin className="size-3.5" />
 {provider.distance}
 </div>

 {/* Match Tags */}
 {matchScore.explanation.slice(0, 2).map((exp) => (
 <div key={exp} className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold">
 <Sparkles className="size-3.5" />
 {exp}
 </div>
 ))}
 </div>

 {/* Provider Stats/Bio */}
 <div className="text-sm text-stone-600 leading-relaxed mb-6">
 {hasPaidAccess ? (
 <p className="line-clamp-2">{provider.bio || `Experienced ${provider.role} specializing in patient care...`}</p>
 ) : (
 <div className="flex items-center gap-2 text-stone-400 italic">
 <Lock className="size-4" />
 Bio and detailed history locked
 </div>
 )}
 </div>

 {/* Action Bar */}
 <div className="pt-6 border-t ring-1 ring-stone-100/50 flex items-center justify-between gap-4">
 <div className="hidden sm:block">
 <div className="text-xs text-stone-400 font-bold uppercase tracking-wide">Rate</div>
 <div className="text-xl font-bold text-stone-800">
 {provider.currency} {provider.hourlyRate}<span className="text-sm text-stone-400 font-medium">/hr</span>
 </div>
 </div>

 <div className="flex-1 flex justify-end gap-3">
 {hasPaidAccess ? (
 <>
 <button
 onClick={(e) => { e.stopPropagation(); if (provider.user_id) handleMessageProvider(provider.user_id); }}
 className="px-5 py-3 rounded-full ring-1 ring-stone-200/50 text-stone-600 font-bold hover:bg-stone-50 transition-colors"
 >
 Message
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); handleBookProvider(provider.id); }}
 className="px-6 py-3 rounded-full bg-stone-900 text-white font-bold hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-transform duration-300 flex items-center gap-2"
 >
 Book Now
 <ArrowRight className="size-4" />
 </button>
 </>
 ) : (
 <button
 onClick={(e) => { e.stopPropagation(); handleBookProvider(provider.id); }}
 className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 active:scale-[0.98] transition-transform duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
 >
 <Lock className="size-4" />
 Unlock & Book
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 </div>

 {/* Empty State */}
 {filteredAndSortedProviders.length === 0 && (
 <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2.5rem] border border-dashed ring-1 ring-stone-200/50">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mb-4">
 <Search className="size-10 text-stone-300" />
 </div>
 <h3 className="text-lg font-semibold text-stone-800">No matches found</h3>
 <p className="text-stone-500 max-w-xs mx-auto mt-2">Try adjusting your filters to find more available providers.</p>
 <button
 onClick={() => {
 setSearchQuery('');
 setSelectedCategories([]);
 fetchProviders({ no_match: true });
 }}
 className="mt-6 px-6 py-2 rounded-full text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors"
 >
 Clear Filters
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Disclaimer Footer */}
 <div className="max-w-7xl mx-auto p-8 mt-12 border-t ring-1 ring-stone-200/50/50">
 <p className="text-center text-xs text-stone-400 font-medium">
 Raiyah Plus Marketplace • Independent Providers • {user?.country === 'EGY' ? 'Egypt' : 'Qatar'}
 </p>
 </div>


 </div>
 );
}

// Helper for score badge style
const scoreStyles = (score: number) => {
 if (score >= 90) return 'bg-teal-50 text-teal-700 border-teal-100';
 if (score >= 75) return 'bg-blue-50 text-blue-700 border-blue-100';
 return 'bg-stone-50 text-stone-700 ring-1 ring-stone-100/50';
};

