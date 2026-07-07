
;
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
 User, Phone, MessageCircle, MapPin, Calendar, Clock,
 Shield, Activity, FileText, ChevronLeft, Star,
 HeartPulse, Pill, History, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProviderClientDetails } from '@/lib/api';




// --- Types (Updated to match API response) ---
interface Booking {
 id: number;
 scheduledAt: string;
 startTime: string;
 endTime: string;
 serviceType: string;
 consultationMethod: string | null;
 status: string;
 totalAmount: number;
 currency: string;
 notes: string | null;
 providerNotes: string | null;
}

interface Client {
 id: number;
 firstName: string;
 lastName: string;
 fullName: string;
 email: string;
 phone: string;
 country: string;
 avatar: string | null;
 clientProfile: {
 careRecipientType: string;
 careCategories: string[];
 careNeeds: string[];
 careLocation: string;
 address: string;
 city: string;
 state: string;
 postalCode: string;
 preferredLanguage: string;
 preferredTimeSlots?: string[];
 practitionerGender?: string;
 scheduleType?: string;
 preferredDays?: string[];
 latitude?: number | null;
 longitude?: number | null;
 } | null;
 stats: {
 totalBookings: number;
 completedBookings: number;
 upcomingBookings: number;
 totalSpent: number;
 totalHours: number;
 lastBookingDate: string;
 firstBookingDate: string;
 };
 bookings: Booking[];
 hasPriorBooking?: boolean;
}

export default function PatientProfilePage() {
 const params = useParams();
 const navigate = useNavigate();
 const [client, setClient] = useState<Client | null>(null);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'medical'>('overview');

 useEffect(() => {
 const fetchClient = async () => {
 try {
 const response = await getProviderClientDetails(params.id as string);

 // The API returns { success: true, client: {...} }
 if (response.success && response.client) {
 setClient(response.client);
 } else if (response.client) {
 setClient(response.client);
 }
 } catch (err: unknown) {
 console.error("Failed to load client profile", err);
 // If 403, it means no booking history with this client
 if (err instanceof Error && 'response' in err && (err as { response?: { status?: number } }).response?.status === 403) {
 }
 } finally {
 setLoading(false);
 }
 };

 if (params.id) {
 fetchClient();
 }
 }, [params.id]);

 // Compute upcoming bookings from the bookings array
 const upcomingBookings = client?.bookings?.filter(b =>
 ['confirmed', 'pending_payment'].includes(b.status)
 ) || [];

 const completedBookings = client?.bookings?.filter(b =>
 b.status === 'completed'
 ) || [];

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
 <div className="size-12 border-4 border-stone-900 border-t-stone-200 rounded-full animate-spin mb-4"></div>
 <p className="text-stone-400 font-medium animate-pulse">Loading Profile…</p>
 </div>
 );
 }

 if (!client) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 text-stone-500">
 <User className="size-16 opacity-20 mb-4" />
 <h2 className="text-xl font-semibold text-stone-900">Patient Not Found</h2>
 <Button onClick={() => navigate(-1)} variant="ghost" className="mt-4">Go Back</Button>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#F8FAFC]">
 {/* --- Header / Cover --- */}
 <div className="relative h-64 bg-stone-900 overflow-hidden">
 <div className="absolute inset-0 bg-gradient-to-r from-stone-900 to-teal-900 opacity-90"></div>
 {/* Decorative Blobs */}
 <div className="absolute top-0 right-0 size-[500px] bg-teal-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
 <div className="absolute bottom-0 left-0 size-[400px] bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

 <div className="relative z-10 max-w-7xl mx-auto p-6 h-full flex flex-col justify-between">
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-white/60 hover:text-white transition-colors w-fit"
 >
 <ChevronLeft className="size-5" /> Back to Patients
 </button>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-20">
 {/* --- Profile Card --- */}
 <div className="bg-white rounded-[2rem] shadow-xl shadow-stone-200/50 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start mb-8">
 <div className="size-32 md:w-40 md:h-40 rounded-[2rem] bg-stone-100 p-2 shadow-lg -mt-16 md:-mt-20 bg-white ring-4 ring-stone-50 relative shrink-0">
 {client.avatar ? (
 <img width={100} height={100} src={client.avatar} alt="Profile" className="size-full object-cover rounded-[1.5rem]" loading="lazy" />
 ) : (
 <div className="size-full bg-teal-50 rounded-[1.5rem] flex items-center justify-center text-5xl font-bold text-teal-500">
 {client.firstName[0]}
 </div>
 )}
 <div className="absolute bottom-2 right-2 size-6 bg-emerald-500 rounded-full border-4 border-white"></div>
 </div>

 <div className="flex-1 w-full">
 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">{client.fullName}</h1>
 <div className="flex flex-wrap items-center gap-4 text-stone-500 text-sm font-medium">
 <div className="flex items-center gap-1.5">
 <MapPin className="size-4 text-stone-400" />
 {client.clientProfile?.city || 'Unknown City'}, {client.country}
 </div>
 <div className="size-1 bg-stone-300 rounded-full"></div>
 <div className="flex items-center gap-1.5 capitalize">
 <User className="size-4 text-stone-400" />
 {client.clientProfile?.careRecipientType || 'Allied Health'}
 </div>
 <div className="size-1 bg-stone-300 rounded-full"></div>
 <div className="flex items-center gap-1.5">
 <Star className="size-4 text-amber-400 fill-current" />
 Verified Patient
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 mt-4 md:mt-0">
 <Link to={`/provider/messages?user=${client.id}`}>
 <Button className="rounded-xl h-11 bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20">
 <MessageCircle className="size-4 mr-2" /> Message
 </Button>
 </Link>
 </div>
 </div>

 {/* Quick Stats Row */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
 <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Total Visits</p>
 <p className="text-2xl font-bold text-stone-900">{client.stats.totalBookings}</p>
 </div>
 <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Hours Care</p>
 <p className="text-2xl font-bold text-stone-900">{client.stats.totalHours} <span className="text-sm text-stone-400 font-medium">hrs</span></p>
 </div>
 <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
 <p className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">Upcoming</p>
 <p className="text-2xl font-bold text-teal-900">{client.stats.upcomingBookings} <span className="text-sm text-teal-400/80 font-medium">visits</span></p>
 </div>
 <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
 <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Spent</p>
 <p className="text-2xl font-bold text-emerald-900">SAR {client.stats.totalSpent}</p>
 </div>
 </div>
 </div>
 </div>

 {/* --- Content Tabs --- */}
 <div className="flex items-center gap-8 border-b border-stone-200 mb-8 px-2">
 {['overview', 'history', 'medical'].map((tab) => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab as 'overview' | 'history' | 'medical')}
 className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-stone-400 hover:text-stone-600' }`}
 >
 {tab.replace('_', ' ')}
 {activeTab === tab && (
 <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-t-full"></div>
 )}
 </button>
 ))}
 </div>

 {/* --- Tab Content --- */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

 {/* Left Column (Main Info) */}
 <div className="lg:col-span-2 space-y-6">

 {/* About Card */}
 <div className="bg-white rounded-[24px] p-8 shadow-sm border border-stone-100">
 <h3 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <User className="size-5 text-teal-500" /> Personal Information
 </h3>

 {client.hasPriorBooking ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Full Name</p>
 <p className="font-medium text-stone-900 border-b border-stone-100 pb-2">{client.fullName}</p>
 </div>
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Email Address</p>
 <p className="font-medium text-stone-900 border-b border-stone-100 pb-2">{client.email}</p>
 </div>
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Phone Number</p>
 <p className="font-medium text-stone-900 border-b border-stone-100 pb-2">{client.phone}</p>
 </div>
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Language</p>
 <p className="font-medium text-stone-900 border-b border-stone-100 pb-2 capitalize">{client.clientProfile?.preferredLanguage?.toLowerCase() || 'English'}</p>
 </div>
 <div className="md:col-span-2">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Address</p>
 <p className="font-medium text-stone-900 border-b border-stone-100 pb-2">
 {client.clientProfile?.address}, {client.clientProfile?.city}, {client.clientProfile?.state} {client.clientProfile?.postalCode}
 </p>
 </div>
 </div>
 ) : (
 <div className="rounded-xl bg-stone-50 border border-stone-100 p-8 text-center">
 <div className="size-12 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-500">
 <Shield className="size-6" />
 </div>
 <h4 className="font-semibold text-stone-900 mb-1">Information Protected</h4>
 <p className="text-stone-500 text-sm max-w-xs mx-auto">
 Contact details and address are only available for clients with a confirmed booking history.
 </p>
 </div>
 )}
 </div>

 {/* Upcoming Schedule */}
 {
 upcomingBookings.length > 0 && (
 <div className="bg-white rounded-[24px] p-8 shadow-sm border border-stone-100 relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-teal-50 rounded-bl-full opacity-50"></div>
 <h3 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2 relative z-10">
 <Calendar className="size-5 text-teal-500" /> Upcoming Visits
 </h3>
 <div className="space-y-4 relative z-10">
 {upcomingBookings.map((visit) => (
 <div key={visit.id} className="flex items-center p-4 rounded-2xl bg-white border border-stone-100 hover:border-teal-100 hover:shadow-md transition-all group">
 <div className="size-16 rounded-2xl bg-teal-50 text-teal-600 flex flex-col items-center justify-center shrink-0 border-2 border-white shadow-sm">
 <span className="text-xs font-bold uppercase">{new Date(visit.scheduledAt).toLocaleString('default', { month: 'short' })}</span>
 <span className="text-2xl font-bold leading-none">{new Date(visit.scheduledAt).getDate()}</span>
 </div>
 <div className="ml-5 flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h4 className="font-semibold text-stone-900 group-hover:text-teal-600 transition-colors capitalize">{visit.serviceType}</h4>
 <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${visit.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : visit.status === 'pending_payment' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-stone-100 text-stone-600 border border-stone-200' }`}>
 {visit.status.replace('_', ' ')}
 </span>
 </div>
 <div className="flex items-center gap-4 mt-1 text-sm text-stone-500 font-medium">
 <span className="flex items-center gap-1.5"><Clock className="size-4" /> {visit.startTime.slice(0, 5)} - {visit.endTime.slice(0, 5)}</span>
 <span className="flex items-center gap-1.5 capitalize"><Video className="size-4" /> {visit.consultationMethod || 'In-person'}</span>
 </div>
 </div>
 <Button variant="ghost" className="text-teal-600 hover:bg-teal-50 hover:text-teal-700">
 Details
 </Button>
 </div>
 ))}
 </div>
 </div>
 )
 }

 </div>

 {/* Right Column (Care Profile) */}
 <div className="space-y-6">
 <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-100">
 <h3 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Shield className="size-5 text-emerald-500" /> Care Requirements
 </h3>

 <div className="space-y-6">
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Categories</p>
 <div className="flex flex-wrap gap-2">
 {client.clientProfile?.careCategories?.map((cat) => (
 <span key={cat} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold capitalize border border-emerald-100">
 {cat.replace(/_/g, ' ')}
 </span>
 ))}
 </div>
 </div>
 <div className="border-t border-stone-100 pt-6">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Needs</p>
 <div className="flex flex-wrap gap-2">
 {client.clientProfile?.careNeeds?.map((need) => (
 <span key={need} className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold capitalize">
 {need.replace(/_/g, ' ')}
 </span>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-[24px] p-6 text-white shadow-lg shadow-teal-600/20 relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-white opacity-10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
 <h3 className="font-semibold text-lg mb-2 relative z-10">Preferences</h3>
 <ul className="space-y-3 relative z-10">
 <li className="flex items-center justify-between text-sm border-b border-teal-500/30 pb-2 last:border-0 last:pb-0">
 <span className="opacity-80">Gender Preference</span>
 <span className="font-semibold capitalize">{client.clientProfile?.practitionerGender?.replace(/_/g, ' ') || 'Any'}</span>
 </li>
 <li className="flex items-center justify-between text-sm border-b border-teal-500/30 pb-2 last:border-0 last:pb-0">
 <span className="opacity-80">Schedule Type</span>
 <span className="font-semibold capitalize">{client.clientProfile?.scheduleType || 'Flexible'}</span>
 </li>
 </ul>
 </div>
 </div>

 </div>
 </div>
 </div>
 );
}

// Helper icon component for use in the file if needed, simplified
const Video = ({ className }: { className?: string }) => (
 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
 <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
 </svg>
)
