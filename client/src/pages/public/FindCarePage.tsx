
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createConversation, searchProviders } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { m, LazyMotion, domAnimation } from "framer-motion";
import BookingModal from '@/components/BookingModal';
import { Skeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { Search } from 'lucide-react';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';




interface Provider {
 id: string;
 user_id?: string;
 firstName: string;
 lastName: string;
 role: string;
 profile?: {
 specialization?: string;
 bio?: string;
 };
 distance?: number;
}

export default function FindCarePage() {
 const navigate = useNavigate();
 const [providers, setProviders] = useState<Provider[]>([]);
 const [loading, setLoading] = useState(false);
 const [filters, setFilters] = useState({
 role: '',
 gender: '',
 language: '',
 radiusKm: 50,
 latitude: 0,
 longitude: 0,
 });
 const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');

 // Booking State
 const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
 const [isBookingOpen, setIsBookingOpen] = useState(false);

 const getLocation = () => {
 setLocationStatus('locating');
 if (!navigator.geolocation) {
 setLocationStatus('error');
 return;
 }

 navigator.geolocation.getCurrentPosition(
 (position) => {
 setFilters((prev) => ({
 ...prev,
 latitude: position.coords.latitude,
 longitude: position.coords.longitude,
 }));
 setLocationStatus('success');
 // Auto search on location found
 handleSearch({ ...filters, latitude: position.coords.latitude, longitude: position.coords.longitude });
 },
 () => {
 setLocationStatus('error');
 }
 );
 };

 const handleSearch = async (currentFilters = filters) => {
 setLoading(true);
 try {
 const results = await searchProviders(currentFilters);
 setProviders(results.data?.doctors || results.data || []);
 } catch (error) {
 console.error('Search failed:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleMessage = async (providerId: string) => {
 try {
 const conversation = await createConversation({
 participantIds: [providerId]
 });
 navigate(`/careseeker/messages?provider=${providerId}`);
 } catch (error) {
 console.error("Failed to start conversation:", error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to start conversation');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to start conversation');
 }
 }
 };

 const handleBookClick = (provider: Provider) => {
 setSelectedProvider(provider);
 setIsBookingOpen(true);
 };

 // Initial search (maybe empty or recent)
 // useEffect(() => { handleSearch(); }, []);

 return (
 <div className="min-h-screen bg-neutral-50">
 <Navbar />

 {selectedProvider && (
 <BookingModal
 isOpen={isBookingOpen}
 onClose={() => setIsBookingOpen(false)}
 provider={selectedProvider}
 />
 )}

 <main className="container mx-auto px-4 py-8">
 <div className="mb-10 text-center">
 <h1 className="text-4xl font-semibold text-neutral-900 mb-4">Find the Perfect Care</h1>
 <p className="text-lg text-neutral-600">Connect with qualified professionals near you.</p>
 </div>

 {/* Search & Filters */}
 <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 mb-8">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

 {/* Location */}
 <div className="flex flex-col">
 <span className="text-sm font-medium text-neutral-700 mb-2">Location</span>
 <button
 onClick={getLocation}
 className={`flex items-center justify-center px-4 py-2 rounded-lg border transition-colors ${locationStatus === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50' }`}
 >
 {locationStatus === 'locating' ? 'Locating...' : locationStatus === 'success' ? 'Location Set ✓' : '📍 Use My Location'}
 </button>
 </div>

 {/* Role */}
 <div className="flex flex-col">
 <label htmlFor="looking-for" className="text-sm font-medium text-neutral-700 mb-2">Looking For</label>
 <select id="looking-for"
 className="px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none"
 value={filters.role}
 onChange={(e) => setFilters(prev => ({...prev, role: e.target.value }))}
 >
 <option value="">All Roles</option>
 <option value="DOCTOR">Doctor</option>
 <option value="CAREGIVER">Caregiver / Nurse</option>
 </select>
 </div>

 {/* Gender */}
 <div className="flex flex-col">
 <label htmlFor="preferred-gender" className="text-sm font-medium text-neutral-700 mb-2">Preferred Gender</label>
 <select id="preferred-gender"
 className="px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none"
 value={filters.gender}
 onChange={(e) => setFilters(prev => ({...prev, gender: e.target.value }))}
 >
 <option value="">Any</option>
 <option value="female">Female</option>
 <option value="male">Male</option>
 </select>
 </div>

 {/* Search Button */}
 <div className="flex flex-col justify-end">
 <button
 onClick={() => handleSearch()}
 className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center"
 disabled={loading}
 >
 {loading ? 'Searching...' : 'Search'}
 </button>
 </div>
 </div>
 </div>

 {/* Results */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {loading && (
 Array.from({ length: 6 }).map((_, i) => (
 <div key={`skeleton-${i}`} className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden h-64 p-6">
 <div className="flex items-center gap-4 mb-4">
 <Skeleton className="size-12 rounded-full" />
 <div>
 <Skeleton className="h-4 w-32 mb-2" />
 <Skeleton className="h-3 w-24" />
 </div>
 </div>
 <Skeleton className="h-16 w-full mb-4" />
 <div className="flex gap-3 mt-auto">
 <Skeleton className="flex-1 h-10" />
 <Skeleton className="flex-1 h-10" />
 </div>
 </div>
 ))
 )}

 {!loading && providers.length === 0 && (
 <div className="col-span-full">
 <EmptyState
 icon={Search}
 title="No providers found"
 description="Try adjusting your filters or location to find available care professionals."
 action={{ label: "Clear Filters", onClick: () => setFilters(prev => ({...prev, role: '', gender: '' })) }}
 />
 </div>
 )}

 {providers.map((provider) => (
 <m.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 key={provider.id}
 className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-md transition-shadow"
 >
 <div className="p-6">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="size-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
 {provider.firstName?.[0] || '?'}
 </div>
 <div>
 <h3 className="font-semibold text-lg text-neutral-900">{provider.firstName} {provider.lastName}</h3>
 <p className="text-sm text-neutral-500 block">{provider.role.replace('_', ' ')}</p>
 </div>
 </div>
 {provider.profile?.specialization && (
 <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
 {provider.profile.specialization}
 </span>
 )}
 </div>

 {provider.distance && (
 <div className="mb-4 flex items-center text-sm text-neutral-500">
 <span>📍 {provider.distance.toFixed(1)} km away</span>
 </div>
 )}

 <p className="text-neutral-600 text-sm line-clamp-2 mb-4">
 {provider.profile?.bio || 'No bio available.'}
 </p>

 <div className="border-t border-neutral-100 pt-4 mt-4 flex gap-3">
 <button
 onClick={() => handleBookClick(provider)}
 className="flex-1 bg-teal-600 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-teal-500 transition-colors"
 >
 Book Session
 </button>
 <button
 onClick={() => handleMessage(provider.user_id || provider.id)}
 className="flex-1 border border-stone-200 text-stone-700 font-medium text-sm px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
 >
 Message
 </button>
 </div>
 </div>
 </m.div>
 ))}
 </div>
 </main>
 </div>
 );
}
