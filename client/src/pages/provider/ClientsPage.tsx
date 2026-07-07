
;
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 Users, Search, Phone, MessageCircle, Calendar, MapPin,
 Clock, Activity, Filter, X, Mail, ArrowRight,
 MoreHorizontal, ChevronRight, Star, Zap, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProviderClients } from '@/lib/api';




// --- Types ---
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
 } | null;
 bookingStats: {
 totalBookings: number;
 totalAmount: number;
 totalHours: number;
 currency: string;
 firstBookingDate: string;
 lastBookingDate: string;
 };
 upcomingStats?: {
 totalBookings: number;
 totalAmount: number;
 };
 upcomingSchedule?: {
 id: number;
 scheduledAt: string;
 startTime: string;
 endTime: string;
 serviceType: string;
 consultationMethod: string;
 status: string;
 }[];
 recentBookings: {
 id: number;
 scheduledAt: string;
 serviceType: string;
 consultationMethod: string | null;
 totalAmount: number;
 durationHours: number;
 }[];
}

export default function ClientsPage() {
 const navigate = useNavigate();
 const [clients, setClients] = useState<Client[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedClient, setSelectedClient] = useState<Client | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

 useEffect(() => {
 const fetchClients = async () => {
 try {
 const response = await getProviderClients();
 if (response.success && Array.isArray(response.clients)) {
 setClients(response.clients);
 } else if (Array.isArray(response)) {
 setClients(response);
 }
 } catch (err: unknown) {
 console.error("Failed to load clients", err);
 } finally {
 setLoading(false);
 }
 };
 fetchClients();
 }, []);

 const filtered = useMemo(() => clients.filter(c =>
 c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.email.toLowerCase().includes(searchQuery.toLowerCase())
 ), [clients, searchQuery]);

 const getLastVisit = (client: Client) => {
 if (!client.bookingStats.lastBookingDate) return 'New';
 return new Date(client.bookingStats.lastBookingDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
 };

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
 <div className="size-12 border-4 border-stone-900 border-t-stone-200 rounded-full animate-spin mb-4"></div>
 <p className="text-stone-400 font-medium animate-pulse">Loading Patients…</p>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-[#F8FAFC] text-teal-900 font-sans selection:bg-teal-100 selection:text-teal-900">

 {/* --- Modern Header Navigation --- */}
 <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 supports-[backdrop-filter]:bg-white/60">
 <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="size-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
 <Users className="size-5" />
 </div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Patients <span className="text-stone-400 font-medium ml-2 text-lg">{clients.length}</span></h1>
 </div>

 <div className="flex items-center gap-4">
 {/* Search Pill */}
 <div className="hidden md:flex items-center bg-stone-100/50 hover:bg-stone-100 transition-colors rounded-full px-4 h-11 w-80 border border-stone-200 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 group">
 <Search className="size-4 text-stone-400 group-focus-within:text-teal-600 transition-colors" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search patients..."
 className="bg-transparent border-none outline-none text-sm ml-3 w-full font-medium placeholder:text-stone-400"
 />
 </div>


 </div>
 </div>
 </div>

 <div className="max-w-[1600px] mx-auto px-6 py-8">

 {/* --- Quick Stats Grid --- */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
 <div className="bg-white rounded-[2rem] p-6 border border-stone-100 shadow-sm relative overflow-hidden group hover:border-teal-100 transition-colors">
 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
 <Activity className="size-24 -mr-4 -mt-4 text-teal-600 rotate-12" />
 </div>
 <p className="text-stone-500 font-medium mb-1">Total Visits</p>
 <h3 className="text-4xl font-semibold text-stone-900 tracking-tight">
 {clients.reduce((acc, c) => acc + c.bookingStats.totalBookings, 0)}
 </h3>
 <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
 <Zap className="size-3 fill-current" /> +12% this month
 </div>
 </div>

 <div className="bg-white rounded-[2rem] p-6 border border-stone-100 shadow-sm relative overflow-hidden group hover:border-teal-100 transition-colors">
 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
 <Star className="size-24 -mr-4 -mt-4 text-amber-500 rotate-12" />
 </div>
 <p className="text-stone-500 font-medium mb-1">Active Patients</p>
 <h3 className="text-4xl font-semibold text-stone-900 tracking-tight">
 {clients.length}
 </h3>
 <div className="mt-4 flex items-center gap-2 text-xs font-bold text-stone-500 bg-stone-100 w-fit px-2 py-1 rounded-lg">
 Currently monitoring
 </div>
 </div>

 <div className="bg-gradient-to-br from-stone-900 to-teal-900 rounded-[2rem] p-6 text-white shadow-2xl shadow-teal-900/20 relative overflow-hidden">
 <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20"></div>
 <div className="relative z-10 flex flex-col h-full justify-between">
 <div>
 <h3 className="text-lg font-semibold mb-1">Upcoming Schedule</h3>
 <p className="text-teal-200 text-sm">
 You have {clients.reduce((acc, c) => acc + (c.upcomingStats?.totalBookings || 0), 0)} visits planned
 </p>
 </div>
 <Button onClick={() => navigate('/provider/schedule')} variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white mt-4 backdrop-blur-sm border-0">
 View Schedules
 </Button>
 </div>
 </div>
 </div>

 {/* --- Main Grid --- */}
 {filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-stone-400">
 <Search className="size-16 mb-4 opacity-20" />
 <p className="text-lg font-medium">No results found for "{searchQuery}"</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
 {filtered.map((client) => (
 <div role="button" tabIndex={0}
 key={client.id}
 onClick={() => setSelectedClient(client)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedClient(client); } }}
 className="group bg-white rounded-[24px] p-5 border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
 >
 <div className="flex items-start justify-between mb-6">
 <div className="relative">
 <div className="size-16 rounded-[18px] bg-stone-100 overflow-hidden ring-4 ring-white shadow-lg">
 {client.avatar ? (
 <img width={100} height={100} src={client.avatar} alt="Avatar" className="size-full object-cover" loading="lazy" />
 ) : (
 <div className="size-full flex items-center justify-center bg-teal-50 text-teal-600 text-xl font-bold">
 {client.firstName[0]}
 </div>
 )}
 </div>
 {/* Online Badge */}
 <div className="absolute -bottom-1 -right-1 size-5 bg-white rounded-full flex items-center justify-center">
 <div className="size-3 bg-emerald-500 rounded-full ring-2 ring-white"></div>
 </div>
 </div>
 <Button variant="ghost" className="size-8 rounded-full p-0 text-stone-300 hover:text-stone-600 hover:bg-stone-50">
 <MoreHorizontal className="size-5" />
 </Button>
 </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-stone-900 group-hover:text-teal-600 transition-colors">{client.fullName}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 text-xs font-mono tracking-tight">
                    PID-{client.id}
                  </span>
                </div>
                <p className="text-stone-500 text-sm font-medium">{client.clientProfile?.careCategories?.[0]?.replace(/_/g, ' ') || 'General Care'}</p>
              </div>

 <div className="flex flex-wrap items-center gap-2 mb-6">
 <span className="px-3 py-1 rounded-lg bg-stone-50 border border-stone-100 text-xs font-bold text-stone-600 uppercase tracking-wide">
 {client.bookingStats.totalBookings} Visits
 </span>
 <span className="px-3 py-1 rounded-lg bg-stone-50 border border-stone-100 text-xs font-bold text-stone-600 uppercase tracking-wide">
 {client.bookingStats.totalHours}h Care
 </span>
 {client.upcomingStats && client.upcomingStats.totalBookings > 0 && (
 <span className="px-3 py-1 rounded-lg bg-teal-50 border border-teal-100 text-xs font-bold text-teal-600 uppercase tracking-wide flex items-center gap-1">
 {client.upcomingStats.totalBookings} Plan ({client.bookingStats.currency} {client.upcomingStats.totalAmount})
 </span>
 )}
 </div>

 <div className="pt-4 border-t border-stone-50 flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-medium">
 {client.upcomingSchedule && client.upcomingSchedule.length > 0 ? (
 <>
 <Calendar className="size-3.5 text-teal-500" />
 <span className="text-teal-600 font-bold">
 Next: {new Date(client.upcomingSchedule[0].scheduledAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
 </span>
 </>
 ) : (
 <>
 <Clock className="size-3.5 text-stone-400" />
 <span className="text-stone-400">
 {getLastVisit(client)}
 </span>
 </>
 )}
 </div>
 <div className="size-8 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
 <ArrowRight className="size-4" />
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* --- Premium Detail Drawer --- */}
 {selectedClient && (
 <>
 <div role="button" tabIndex={0}
 className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
 onClick={() => setSelectedClient(null)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedClient(null); } }}
 ></div>

 <div className="fixed top-4 bottom-4 right-4 w-full md:w-[500px] bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col animate-slideInRight">

 {/* Drawer Header */}
 <div className="relative h-64 bg-stone-900 p-8 flex flex-col justify-between overflow-hidden shrink-0">
 {/* Decorative Gradients */}
 <div className="absolute top-0 right-0 size-64 bg-teal-500/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
 <div className="absolute bottom-0 left-0 size-64 bg-emerald-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

 <div className="relative z-10 flex justify-end">
 <button
 onClick={() => setSelectedClient(null)}
 className="size-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors"
 >
 <X className="size-5" />
 </button>
 </div>

 <div className="relative z-10 flex gap-6 items-end">
 <div className="size-24 rounded-[24px] bg-white p-1 shadow-2xl">
 {selectedClient.avatar ? (
 <img width={100} height={100} src={selectedClient.avatar} alt="Profile" className="size-full object-cover rounded-[20px]" loading="lazy" />
 ) : (
 <div className="size-full bg-stone-100 rounded-[20px] flex items-center justify-center text-3xl font-bold text-stone-400">
 {selectedClient.firstName[0]}
 </div>
 )}
 </div>
 <div className="pb-1">
 <h2 className="text-2xl font-semibold text-white mb-1">{selectedClient.fullName}</h2>
 <div className="flex items-center gap-2 text-teal-200 text-sm font-medium">
 <MapPin className="size-3.5" />
 {selectedClient.clientProfile?.city || 'Unknown Location'}
 </div>
 </div>
 </div>
 </div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto bg-stone-50/50 p-8">
 {/* Action Bar */}
 <div className="mb-8">
 <Button
 onClick={() => navigate(`/provider/messages?client=${selectedClient.id}`)}
 className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200 shadow-sm h-11 rounded-xl font-medium flex items-center justify-center gap-2"
 >
 <MessageCircle className="size-4 text-stone-600" /> Message
 </Button>
 </div>

 <div className="space-y-6">
 {/* Stats Cards */}
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Total Spent</p>
 <p className="text-lg font-bold text-stone-900">{selectedClient.bookingStats.currency} {selectedClient.bookingStats.totalAmount}</p>
 </div>
 <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Hours Care</p>
 <p className="text-lg font-bold text-stone-900">{selectedClient.bookingStats.totalHours} hrs</p>
 </div>
 {selectedClient.upcomingStats && (
 <div className="col-span-2 bg-teal-50 p-4 rounded-2xl border border-teal-100 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-1">Planned Care</p>
 <p className="text-lg font-bold text-teal-900">{selectedClient.upcomingStats.totalBookings} Visits</p>
 </div>
 <div className="text-right">
 <p className="text-lg font-bold text-teal-600">{selectedClient.bookingStats.currency} {selectedClient.upcomingStats.totalAmount}</p>
 </div>
 </div>
 )}
 </div>

 {selectedClient.upcomingSchedule && selectedClient.upcomingSchedule.length > 0 && (
 <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-100">
 <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-6 flex items-center gap-2">
 <Calendar className="size-4 text-teal-500" /> Upcoming Visits
 </h3>
 <div className="space-y-3">
 {selectedClient.upcomingSchedule.map((visit) => (
 <div key={visit.id} className="flex items-center justify-between p-3 rounded-xl bg-teal-50/50 border border-teal-100">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-lg bg-white flex flex-col items-center justify-center text-teal-600 shadow-sm border border-teal-50">
 <span className="text-[10px] font-bold uppercase">{new Date(visit.scheduledAt).toLocaleString('default', { month: 'short' })}</span>
 <span className="text-lg font-bold leading-none">{new Date(visit.scheduledAt).getDate()}</span>
 </div>
 <div>
 <p className="text-sm font-bold text-stone-900 capitalize">{visit.serviceType}</p>
 <p className="text-xs text-stone-500 font-medium">{visit.startTime.slice(0, 5)} - {visit.endTime.slice(0, 5)}</p>
 </div>
 </div>
 <div className="text-right">
 <span className="text-[10px] font-bold text-teal-600 bg-white px-2 py-1 rounded-md border border-teal-100 shadow-sm">
 {visit.status}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Info Section */}
 <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-100">
 <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-6 flex items-center gap-2">
 <Shield className="size-4 text-teal-500" /> Care Details
 </h3>

 <div className="space-y-6">
 <div>
 <p className="text-xs font-bold text-stone-400 mb-3">CATEGORIES</p>
 <div className="flex flex-wrap gap-2">
 {selectedClient.clientProfile?.careCategories?.map((cat) => (
 <span key={cat} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold capitalize">
 {cat.replace(/_/g, ' ')}
 </span>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs font-bold text-stone-400 mb-1">PHONE</p>
 <p className="text-sm font-semibold text-stone-900">{selectedClient.phone}</p>
 </div>
 <div>
 <p className="text-xs font-bold text-stone-400 mb-1">LANGUAGE</p>
 <p className="text-sm font-semibold text-stone-900 capitalize">{selectedClient.clientProfile?.preferredLanguage?.toLowerCase() || 'English'}</p>
 </div>
 </div>

 <div>
 <p className="text-xs font-bold text-stone-400 mb-1">EMAIL</p>
 <p className="text-sm font-semibold text-stone-900 truncate">{selectedClient.email}</p>
 </div>
 </div>
 </div>

 {selectedClient.recentBookings.length > 0 && (
 <div className="bg-white rounded-[24px] p-6 shadow-sm border border-stone-100">
 <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-6 flex items-center gap-2">
 <Clock className="size-4 text-emerald-500" /> Recent Activity
 </h3>
 <div className="space-y-3">
 {selectedClient.recentBookings.map((booking) => (
 <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100/50">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-lg bg-white flex items-center justify-center text-stone-400 shadow-sm">
 <Calendar className="size-4" />
 </div>
 <div>
 <p className="text-sm font-bold text-stone-900 capitalize">{booking.serviceType.replace(/_/g, ' ')}</p>
 <p className="text-[10px] text-stone-500 font-medium">{new Date(booking.scheduledAt).toLocaleDateString()}</p>
 </div>
 </div>
 <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-md">
 Done
 </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 );
}
