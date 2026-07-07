
import { useState, useEffect } from 'react';
import { getAdminAllUsers } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Search, Star, ShieldCheck, MapPin, Activity, Award, UserCheck, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface ProviderStatus {
 label: string;
 color: string;
 bgColor: string;
 icon: React.ReactNode;
}

function getProviderStatus(provider: any): ProviderStatus {
 const info = provider.provider_info;
 if (!info) {
 return {
 label: 'Unknown',
 color: 'text-stone-600',
 bgColor: 'bg-stone-100',
 icon: <AlertTriangle size={14} />
 };
 }

 if (info.is_verified && info.is_active && info.onboarding_status === 'completed') {
 return {
 label: 'Active & Verified',
 color: 'text-emerald-700',
 bgColor: 'bg-emerald-100',
 icon: <ShieldCheck size={14} />
 };
 }

 if (info.is_verified && !info.is_active) {
 return {
 label: 'Verified (Inactive)',
 color: 'text-amber-700',
 bgColor: 'bg-amber-100',
 icon: <Clock size={14} />
 };
 }

 if (!info.is_verified && info.onboarding_status === 'pending') {
 return {
 label: 'Pending Approval',
 color: 'text-orange-700',
 bgColor: 'bg-orange-100',
 icon: <Clock size={14} />
 };
 }

 if (!info.is_verified && info.onboarding_status === 'in_progress') {
 return {
 label: 'Onboarding',
 color: 'text-blue-700',
 bgColor: 'bg-blue-100',
 icon: <Activity size={14} />
 };
 }

 if (info.onboarding_status === 'rejected') {
 return {
 label: 'Rejected',
 color: 'text-red-700',
 bgColor: 'bg-red-100',
 icon: <XCircle size={14} />
 };
 }

 if (info.onboarding_status === 'completed' && !info.is_verified) {
 return {
 label: 'Awaiting Verification',
 color: 'text-purple-700',
 bgColor: 'bg-purple-100',
 icon: <Clock size={14} />
 };
 }

 return {
 label: 'Unknown',
 color: 'text-stone-600',
 bgColor: 'bg-stone-100',
 icon: <AlertTriangle size={14} />
 };
}

export default function AdminProvidersPage() {
 const [providers, setProviders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
 return () => clearTimeout(timer);
 }, [searchTerm]);

 useEffect(() => {
 loadProviders();
 }, []);

 const loadProviders = async () => {
 setLoading(true);
 try {
 const response = await getAdminAllUsers({ role: 'provider' });
 const data = response.data || response;
 setProviders(Array.isArray(data) ? data : []);
 } catch (error) {
 console.error('Failed to load providers:', error);
 } finally {
 setLoading(false);
 }
 };

 const filteredProviders = providers.filter(provider => {
 const matchesSearch = !debouncedSearch ||
 provider.first_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 provider.last_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 provider.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 provider.phone?.includes(debouncedSearch);

 const status = getProviderStatus(provider);
 const matchesStatus = statusFilter === 'all' ||
 (statusFilter === 'active' && status.label === 'Active & Verified') ||
 (statusFilter === 'pending' && (status.label === 'Pending Approval' || status.label === 'Awaiting Verification')) ||
 (statusFilter === 'onboarding' && status.label === 'Onboarding') ||
 (statusFilter === 'inactive' && status.label === 'Verified (Inactive)') ||
 (statusFilter === 'rejected' && status.label === 'Rejected');

 return matchesSearch && matchesStatus;
 });

 const statusCounts = {
 active: providers.filter(p => getProviderStatus(p).label === 'Active & Verified').length,
 pending: providers.filter(p => ['Pending Approval', 'Awaiting Verification'].includes(getProviderStatus(p).label)).length,
 onboarding: providers.filter(p => getProviderStatus(p).label === 'Onboarding').length,
 inactive: providers.filter(p => getProviderStatus(p).label === 'Verified (Inactive)').length,
 rejected: providers.filter(p => getProviderStatus(p).label === 'Rejected').length,
 };

 return (
 <div className="min-h-screen bg-stone-50 font-sans">
 <div className="max-w-7xl mx-auto space-y-8">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">Provider Network</h1>
 <p className="text-stone-500 mt-1 font-medium">Manage healthcare providers, verification status, and performance metrics.</p>
 </div>

 <div className="flex items-center gap-3 flex-wrap">
 <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
 <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
 <UserCheck size={16} />
 </div>
 <div>
 <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Active</p>
 <p className="text-lg font-black text-emerald-900 leading-none">{statusCounts.active}</p>
 </div>
 </div>
 <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 px-4 py-2 rounded-2xl">
 <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
 <Clock size={16} />
 </div>
 <div>
 <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Pending</p>
 <p className="text-lg font-black text-orange-900 leading-none">{statusCounts.pending}</p>
 </div>
 </div>
 <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl">
 <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
 <Activity size={16} />
 </div>
 <div>
 <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Onboarding</p>
 <p className="text-lg font-black text-blue-900 leading-none">{statusCounts.onboarding}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-[2rem] border border-stone-200/60 shadow-xl shadow-stone-200/40 overflow-hidden flex flex-col min-h-[600px]">
 <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-xl">
 <div className="relative w-full max-w-md group">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <Search className="size-5 text-stone-400 group-focus-within:text-teal-500 transition-colors" />
 </div>
 <input
 type="text"
 placeholder="Search providers…"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="block w-full pl-11 pr-4 py-3.5 bg-stone-50 border-transparent text-stone-900 placeholder-stone-400 focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/10 rounded-2xl transition-all font-medium text-sm outline-none"
 />
 </div>

 <div className="flex items-center gap-3">
 <div className="relative">
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="appearance-none bg-stone-50 border border-transparent text-stone-700 font-bold text-sm rounded-2xl pl-4 pr-10 py-3.5 outline-none focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/10 cursor-pointer transition-all hover:bg-stone-100"
 >
 <option value="all">All Status</option>
 <option value="active">Active & Verified</option>
 <option value="pending">Pending Approval</option>
 <option value="onboarding">Onboarding</option>
 <option value="inactive">Inactive</option>
 <option value="rejected">Rejected</option>
 </select>
 <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-400">
 <svg className="size-4 fill-current" viewBox="0 0 20 20">
 <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
 </svg>
 </div>
 </div>
 <span className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2">
 {filteredProviders.length} Providers
 </span>
 </div>
 </div>

 {loading ? (
 <div className="flex-1 flex flex-col items-center justify-center p-20">
 <div className="size-10 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin mb-4" />
 <p className="text-stone-400 font-medium animate-pulse">Loading provider network&hellip;</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
 {filteredProviders.map((provider) => {
 const status = getProviderStatus(provider);
 return (
 <div key={provider.id} className="bg-white rounded-[2rem] border border-stone-100 shadow-lg shadow-stone-200/50 p-6 hover:-translate-y-1 transition-transform duration-300 group relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-stone-50 rounded-bl-[4rem] -z-0 transition-colors group-hover:bg-teal-50/50" />

 <div className="relative z-10">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-4">
 <div className="size-14 bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-white">
 {provider.first_name?.[0]}{provider.last_name?.[0]}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900 text-lg leading-tight">
 {provider.full_name || `${provider.first_name} ${provider.last_name}`}
 </h3>
 <p className="text-sm font-bold text-stone-400 uppercase tracking-wide">
 {provider.provider_info?.provider_type || 'Specialist'}
 </p>
 </div>
 </div>
 </div>

 <div className="mb-4">
 <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.bgColor} ${status.color}`}>
 {status.icon}
 {status.label}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-3 mb-6">
 <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
 <div className="flex items-center gap-1.5 mb-1">
 <Star className="size-3.5 text-amber-400 fill-amber-400" />
 <span className="text-xs font-black text-stone-700">{provider.provider_info?.average_rating || '0.0'}</span>
 </div>
 <span className="text-[10px] font-bold text-stone-400 uppercase">Rating</span>
 </div>
 <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
 <div className="flex items-center gap-1.5 mb-1">
 <Activity className="size-3.5 text-teal-500" />
 <span className="text-xs font-black text-stone-700">{provider.provider_info?.rating_count || 0}</span>
 </div>
 <span className="text-[10px] font-bold text-stone-400 uppercase">Reviews</span>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <Award className="size-4 text-stone-400" />
 <span className="font-medium truncate">
 {(() => {
 if (Array.isArray(provider.provider_info?.specialties)) {
 return provider.provider_info.specialties.join(', ');
 }
 try {
 const parsed = JSON.parse(provider.provider_info?.specialties || '[]');
 return Array.isArray(parsed) ? parsed.join(', ') : 'No specialties';
 } catch {
 return 'No specialties';
 }
 })()}
 </span>
 </div>
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <MapPin className="size-4 text-stone-400" />
 <span className="font-medium">{provider.country || 'Location N/A'}</span>
 </div>
 </div>

 <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
 <div className="flex flex-col">
 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Rate</span>
 <span className="text-sm font-black text-stone-900">
 {provider.provider_info?.hourly_rate ? `SAR ${provider.provider_info.hourly_rate}/hr` : 'N/A'}
 </span>
 </div>
 <Link to={`/admin/providers/${provider.provider_info?.public_profile_id || provider.id}`}>
 <button className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-teal-600 transition-colors">
 View Profile
 </button>
 </Link>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {filteredProviders.length === 0 && !loading && (
 <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
 <Search className="size-12 text-stone-300 mb-4" />
 <h3 className="text-lg font-semibold text-stone-900">No Providers Found</h3>
 <p className="text-stone-500">Try adjusting your filters or search terms.</p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
