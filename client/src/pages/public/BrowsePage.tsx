
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
 Search, MapPin, Star,
 CheckCircle2, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
;
import { WhatsAppWidget } from '@/components/WhatsAppWidget';
import { getDoctors } from '@/lib/api';




// --- Configuration & Data ---
const CATEGORIES = [
 { id: 'all', label: 'All Services' },
 { id: 'aged_care', label: 'Elderly Care' },
 { id: 'child_family', label: 'Child Care' },
 { id: 'nursing', label: 'Nursing' },
 { id: 'disability_support', label: 'Special Needs' },
 { id: 'mental_health', label: 'Mental Health' },
];

const getCurrency = (country: string): 'QAR' | 'EGP' => country === 'EGY' ? 'EGP' : 'QAR';

// --- Interfaces ---
interface Doctor {
 id: number;
 public_profile_id?: string;
 user_id: number;
 name: string;
 avatar: string | null;
 specialties: string[];
 languages: string[];
 gender: 'male' | 'female';
 hourly_rate: string;
 city: string | null;
 bio: string;
 average_rating: number;
 rating_count: number;
}

// --- Helpers ---
const formatRole = (specialties: string[]) => {
 if (!specialties || !specialties.length) return 'Healthcare Provider';
 return specialties[0].split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const NoiseOverlay = () => (
 <div className="pointer-events-none fixed inset-0 z-50 size-full opacity-[0.05] mix-blend-overlay">
 <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
 <filter id="noise">
 <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
 </filter>
 <rect width="100%" height="100%" filter="url(#noise)" />
 </svg>
 </div>
);

// --- Components ---
const Header = () => {
 return (
 <m.header
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 1, delay: 0.2 }}
 className="fixed top-0 left-0 right-0 z-40 px-6 py-6 md:px-12 bg-[#F2F0E9] border-b border-[#1A1A1A]/10 text-[#1A1A1A]"
 >
 <div className="flex justify-between items-center max-w-[1600px] mx-auto">
 <Link to="/" className="font-sans font-bold tracking-tight text-xl">Riayah Plus</Link>
 <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
 <Link to="/#reality" className="hover:opacity-60 transition-opacity">Reality</Link>
 <Link to="/#belief" className="hover:opacity-60 transition-opacity">Belief</Link>
 <Link to="/#how-it-works" className="hover:opacity-60 transition-opacity">System</Link>
 </div>
 <Link to="/" className="text-sm font-mono hover:opacity-60 transition-opacity">
 [ LOG IN ]
 </Link>
 </div>
 </m.header>
 );
};

const fadeUp = {
 hidden: { opacity: 0, y: 40 },
 visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
};

interface MappedProvider {
 id: string;
 name: string;
 role: string;
 avatar: string;
 rating: string;
 reviews: number;
 rate: string;
 location: string;
 verified: boolean;
 available: boolean;
 category: string;
 languages: string[];
}

function BrutalistCard({ provider, currency, onBook, onViewProfile }: { provider: MappedProvider, currency: string, onBook: () => void, onViewProfile: () => void }) {
 return (
 <m.div
 layout
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="group relative bg-[#F2F0E9] border border-[#1A1A1A]/20 hover:border-[#1A1A1A] transition-colors duration-300 flex flex-col"
 >
 <div className="p-8 flex-1 flex flex-col">
 <div className="flex justify-between items-start mb-8">
 {/* Avatar Container */}
 <div className="relative">
 <div className="size-16 h-16 bg-[#1A1A1A]/5 border border-[#1A1A1A]/10 flex items-center justify-center text-2xl overflow-hidden aspect-square">
 {provider.avatar && provider.avatar.startsWith('http') ? (
 <img src={provider.avatar} alt={provider.name} width={64} height={64} className="size-full object-cover grayscale opacity-90 group-hover:grayscale-0 transition-all duration-500" loading="lazy" />
 ) : (
 <span>{provider.avatar}</span>
 )}
 </div>
 {provider.verified && (
 <div className="absolute -bottom-2 -right-2 bg-[#CC5833] text-[#F2F0E9] p-0.5 shadow-sm">
 <CheckCircle2 className="size-4 h-4" />
 </div>
 )}
 </div>

 {/* Rating Badge */}
 <div className="text-right">
 <div className="font-mono text-sm text-[#1A1A1A] flex items-center justify-end gap-1 mb-1">
 {provider.rating} <Star className="size-3.5 h-3.5 fill-[#1A1A1A]" />
 </div>
 <div className="text-xs font-mono text-[#1A1A1A]/50 uppercase tracking-widest">
 [{provider.reviews} reviews]
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="mb-8">
 <h3 className="text-2xl font-semibold font-sans text-[#1A1A1A] mb-2">{provider.name}</h3>
 <p className="text-sm font-serif italic text-[#CC5833] mb-6">{provider.role}</p>

 <div className="space-y-3 font-mono text-xs text-[#1A1A1A]/70">
 <div className="flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-2">
 <MapPin className="size-3 h-3 opacity-50" /> {provider.location}
 </div>
 <div className="flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-2 truncate">
 <span className="opacity-50">LANGS:</span> {provider.languages.join(', ')}
 </div>
 </div>
 </div>

 {/* Footer Action */}
 <div className="mt-auto pt-6 flex items-end justify-between">
 <div>
 <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Rate / Hr</p>
 <div className="text-xl font-bold text-[#1A1A1A] font-sans">
 <span className="text-sm font-mono mr-1 opacity-60">{currency}</span>
 {provider.rate}
 </div>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={onViewProfile}
 className="p-3 border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 transition-colors"
 title="View Profile"
 >
 <ArrowRight size={16} className="text-[#1A1A1A]" />
 </button>

 <button
 onClick={onBook}
 className="bg-[#2E4036] text-[#F2F0E9] px-6 py-3 font-sans font-semibold tracking-wide text-sm hover:bg-[#1f2b24] transition-colors"
 >
 Book Form
 </button>
 </div>
 </div>
 </div>
 </m.div>
 );
}

export default function BrowsePage() {
 const navigate = useNavigate();
 const { user } = useAuth();
 const country = (user?.country as string) || 'QAT';
 const currency = getCurrency(country);

 const [selectedCategory, setSelectedCategory] = useState('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [providers, setProviders] = useState<MappedProvider[]>([]);
 const [loading, setLoading] = useState(false);

 // Pagination state
 const [page, setPage] = useState(1);
 const [lastPage, setLastPage] = useState(1);

 const fetchProviders = async (reset: boolean = false) => {
 setLoading(true);
 try {
 const pageToFetch = reset ? 1 : page;
 const params: Record<string, string | number> = {
 page: pageToFetch,
 per_page: 6,
 };

 if (searchQuery) params.search = searchQuery;
 if (selectedCategory !== 'all') params.specialty = selectedCategory;

 const data = await getDoctors(params);

 if (data.success) {
 const providersArray = Array.isArray(data.data?.data) ? data.data.data : (Array.isArray(data.data) ? data.data : []);
 const mappedProviders = providersArray.map((doc: Doctor) => ({
 id: doc.public_profile_id || doc.id?.toString() || String(Math.random()),
 name: doc.name || 'Provider',
 role: formatRole(doc.specialties || []),
 avatar: doc.avatar || (doc.gender === 'male' ? '👨' : '👩'),
 rating: doc.average_rating ? Number(doc.average_rating).toFixed(1) : '5.0',
 reviews: doc.rating_count || 0,
 rate: doc.hourly_rate ? Math.round(parseFloat(doc.hourly_rate)).toString() : 'N/A',
 location: doc.city || (country === 'EGY' ? 'Cairo' : 'Doha'),
 verified: true,
 available: true,
 category: (doc.specialties && doc.specialties.length > 0) ? doc.specialties[0] : 'general',
 languages: doc.languages || ['English'],
 }));

 if (reset) {
 setProviders(mappedProviders);
 setPage(2);
 } else {
 setProviders(prev => [...prev, ...mappedProviders]);
 setPage(prev => prev + 1);
 }

 setLastPage(data.data.last_page);
 }
 } catch (error) {
 console.error('Failed to fetch providers:', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchProviders(true);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedCategory, country]);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setPage(1); // Reset page to 1 for new search
 fetchProviders(true);
 };

 const handleLoadMore = () => {
 if (page <= lastPage && !loading) {
 fetchProviders(false);
 }
 };

 return (
 <main className="min-h-screen bg-[#F2F0E9] font-sans selection:bg-[#CC5833] selection:text-[#F2F0E9]">
 <NoiseOverlay />
 <Header />

 {/* Hero Section */}
 <div className="relative pt-32 md:pt-40 pb-16 px-6 md:px-12 border-b border-[#1A1A1A]/10">
 <div className="max-w-[1600px] mx-auto grid lg:grid-cols-12 gap-12 lg:gap-24 items-end">
 <div className="lg:col-span-8 pb-4">
 <m.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
 <m.div variants={fadeUp} className="flex items-center gap-3 mb-8">
 <div className="h-[1px] w-8 bg-[#1A1A1A]" />
 <span className="font-mono text-xs tracking-widest uppercase text-[#2E4036]">Provider Directory</span>
 </m.div>

 <m.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.95] tracking-tighter font-sans font-semibold mb-8 text-[#1A1A1A]">
 Find structured care.<br/>
 <span className="font-serif italic font-normal text-[#CC5833]">Tailored to your needs.</span>
 </m.h1>

 {/* Search Form */}
 <m.form variants={fadeUp} onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 max-w-2xl mt-12">
 <div className="flex-1 relative border border-[#1A1A1A] bg-[#F2F0E9] overflow-hidden group focus-within:border-[#CC5833] transition-colors">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <Search className="size-4 h-4 text-[#1A1A1A]/50 group-focus-within:text-[#CC5833] transition-colors" />
 </div>
 <input
 type="text"
 placeholder="Search by specialty or standard name…"
 className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-5 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 font-mono text-sm"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 <button type="submit" className="bg-[#1A1A1A] text-[#F2F0E9] px-10 py-5 font-sans font-semibold tracking-wide text-sm hover:bg-[#CC5833] transition-colors whitespace-nowrap">
 Search Database
 </button>
 </m.form>
 </m.div>
 </div>

 {/* Stats or decoration */}
 <div className="lg:col-span-4 lg:mb-4 hidden lg:flex justify-end font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A]/40">
 <div className="text-right border-r border-[#1A1A1A]/20 pr-6 mr-6">
 Verified<br/>Professionals
 </div>
 <div className="text-right">
 Strict<br/>Compliance
 </div>
 </div>
 </div>
 </div>

 {/* Content Area */}
 <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-16 grid lg:grid-cols-12 gap-12">
 
 {/* Filters Sidebar */}
 <aside className="lg:col-span-3">
 <div className="sticky top-32">
 <div className="font-mono text-xs uppercase tracking-widest text-[#1A1A1A]/50 mb-8 pb-4 border-b border-[#1A1A1A]/10">
 FILTERS / PARAMETERS
 </div>
 
 <div className="flex flex-col gap-y-2">
 {CATEGORIES.map((cat) => {
 const isActive = selectedCategory === cat.id;
 return (
 <button
 key={cat.id}
 onClick={() => setSelectedCategory(cat.id)}
 className={`text-left px-4 py-3 border-l-4 transition-all font-sans text-sm font-medium ${ isActive ? 'border-[#CC5833] bg-[#1A1A1A]/5 text-[#1A1A1A] font-bold' : 'border-transparent text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5' }`}
 >
 {cat.label}
 </button>
 );
 })}
 </div>
 </div>
 </aside>

 {/* Results Main */}
 <main className="lg:col-span-9">
 <div className="font-mono text-xs uppercase tracking-widest text-[#1A1A1A]/50 mb-8 pb-4 border-b border-[#1A1A1A]/10 flex justify-between items-center">
 <span>SEARCH RESULTS</span>
 {providers.length > 0 && <span>[{providers.length}] RECORDS FOUND</span>}
 </div>

 <div className="grid md:grid-cols-2 gap-6">
 <AnimatePresence mode="popLayout">
 {providers.map((provider) => (
 <BrutalistCard
 key={provider.id}
 provider={provider}
 currency={currency}
 onBook={() => user ? navigate(`/careseeker/book/${provider.id}`) : navigate('/careseeker/onboarding')}
 onViewProfile={() => navigate(`/doctor/${provider.id}`)}
 />
 ))}
 </AnimatePresence>
 </div>

 {providers.length === 0 && !loading && (
 <div className="p-16 border border-[#1A1A1A]/10 bg-[#1A1A1A]/5 text-center mt-6">
 <div className="font-mono text-[#CC5833] text-4xl mb-4">404</div>
 <h3 className="text-xl font-semibold font-sans text-[#1A1A1A] mb-2">No providers matched the criteria</h3>
 <p className="text-[#1A1A1A]/60 font-serif italic max-w-md mx-auto">Try adjusting your filters or expanding your search standard to locate appropriate files.</p>
 </div>
 )}

 {loading && (
 <div className="py-12 flex justify-center">
 <div className="font-mono text-xs text-[#1A1A1A]/40 uppercase tracking-widest animate-pulse">
 [ PROCESSING… ]
 </div>
 </div>
 )}

 {/* Load More Button */}
 {page <= lastPage && !loading && providers.length > 0 && (
 <div className="mt-16 text-center">
 <button
 onClick={handleLoadMore}
 className="inline-block border border-[#1A1A1A] px-10 py-5 text-[#1A1A1A] font-sans font-semibold tracking-wide text-sm hover:bg-[#1A1A1A] hover:text-[#F2F0E9] transition-colors"
 >
 LOAD MORE RECORDS
 </button>
 </div>
 )}
 </main>

 </div>

 <footer className="py-12 bg-[#1A1A1A] text-[#F2F0E9] border-t border-[#F2F0E9]/10 px-6 md:px-12 font-mono text-xs uppercase tracking-widest mt-24">
 <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
 <div>© 2026 Riayah Plus</div>
 <div className="flex gap-8">
 <Link to="/privacy" className="hover:text-[#CC5833] transition-colors">Privacy Policy</Link>
 <Link to="/terms" className="hover:text-[#CC5833] transition-colors">Terms of Service</Link>
 </div>
 </div>
 </footer>
 
 <WhatsAppWidget 
 selectedCategory={CATEGORIES.find(c => c.id === selectedCategory)?.label || "General Inquiry"}
 />
 </main>
 );
}
