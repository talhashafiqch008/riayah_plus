
;
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminProviderDetails, rejectDoctor, verifyDoctor } from '@/lib/api';
import toast from "react-hot-toast";
import {
 User, Mail, Phone, MapPin, Calendar, Shield, FileText,
 Star, Clock, Activity, CheckCircle, XCircle, ChevronLeft,
 Stethoscope, Award, GraduationCap, Building2, Globe, AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { isApiError } from '@/lib/errors';

interface ProviderDocument {
 id: string;
 title?: string;
 file_name: string;
 description?: string;
 file_type?: string;
 file_extension?: string;
 file_size_human?: string;
 file_url: string;
}

interface Provider {
 id: string;
 public_profile_id?: string;
 first_name?: string;
 last_name?: string;
 full_name?: string;
 email: string;
 phone?: string;
 profile_photo?: string;
 profile_image?: string;
 city?: string;
 country?: string;
 bio?: string;
 provider_type?: string;
 provider_role?: string;
 specialties?: string[] | string;
 documents?: ProviderDocument[];
 average_rating?: number | string;
 rating_count?: number;
 hourly_rate?: number | string;
 is_verified?: boolean | number;
 is_active?: boolean;
 rejection_reason?: string;
 created_at?: string;
}

export default function ProviderDetailsPage() {
 const params = useParams();
 const navigate = useNavigate();
 const [provider, setProvider] = useState<Provider | null>(null);
 const [loading, setLoading] = useState(true);
 const [selectedDocument, setSelectedDocument] = useState<ProviderDocument | null>(null);
 const [actionLoading, setActionLoading] = useState(false);
 const [showRejectModal, setShowRejectModal] = useState(false);
 const [rejectionReason, setRejectionReason] = useState('');

 useEffect(() => {
 if (params.id) {
 loadProviderDetails(params.id as string);
 }
 }, [params.id]);

 const loadProviderDetails = async (id: string) => {
 try {
 const response = await getAdminProviderDetails(id);
 // Handle { success: true, data: { ... } } structure
 const providerData = response.data || response;
 setProvider(providerData);
 } catch (error) {
 console.error('Failed to load provider details:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load provider details');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load provider details');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleApprove = async () => {
 if (!provider) return;

 setActionLoading(true);
 try {
 // Use public_profile_id as requested, falling back to id if not present
 const idToUse = provider.public_profile_id || provider.id;
 await verifyDoctor(idToUse);
 toast.success('Provider approved successfully');

 // Reload details to update UI
 await loadProviderDetails(params.id as string);
 } catch (error) {
 console.error('Failed to approve provider:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to approve provider');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to approve provider');
 }
 } finally {
 setActionLoading(false);
 }
 };

 const handleRejectClick = () => {
 setShowRejectModal(true);
 };

 const confirmReject = async () => {
 if (!provider) return;
 if (!rejectionReason.trim()) {
 toast.error('Please enter a rejection reason');
 return;
 }

 setActionLoading(true);
 try {
 // Use public_profile_id as requested, falling back to id if not present
 const idToUse = provider.public_profile_id || provider.id;
 await rejectDoctor(idToUse, rejectionReason);
 toast.success('Provider rejected successfully');
 setShowRejectModal(false);
 setRejectionReason('');

 // Reload details to update UI
 await loadProviderDetails(params.id as string);
 } catch (error) {
 console.error('Failed to reject provider:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to reject provider');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to reject provider');
 }
 } finally {
 setActionLoading(false);
 }
 };

 if (loading) return <div className="p-10 text-center text-stone-500">Loading provider profile…</div>;
 if (!provider) return <div className="p-10 text-center text-red-500">Provider not found</div>;

 // In the new API response, the provider object itself contains everything (flat structure)
 // We can fallback to provider_info if needed for backwards compatibility, but primary keys are on root
 const info = provider;

 return (
 <div className="min-h-screen bg-stone-50 font-sans pb-20">
 {/* Header / Back */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-6 font-bold"
 >
 <ChevronLeft size={20} />
 Back to Providers
 </button>

 {/* Profile Header Card */}
 <div className="bg-white rounded-[2.5rem] shadow-xl shadow-stone-200/50 overflow-hidden relative border border-stone-100">
 <div className="h-48 bg-gradient-to-r from-stone-900 to-stone-800 relative">
 <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10"></div>
 <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
 </div>

 <div className="px-8 pb-8 relative">
 <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20">
 <div className="relative">
 <div className="size-40 bg-white rounded-[2rem] p-2 shadow-2xl">
 <div className="size-full bg-stone-100 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-stone-400 overflow-hidden">
 {provider.profile_photo || provider.profile_image ? (
 <img src={provider.profile_photo || provider.profile_image || '/default-avatar.png'} alt="Profile" width={160} height={160} className="size-full object-cover" />
 ) : (
 <span>{provider.first_name?.[0]}{provider.last_name?.[0]}</span>
 )}
 </div>
 </div>
 <div className={`absolute bottom-2 right-2 p-2 rounded-xl border-4 border-white ${info.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`}>
 {info.is_verified ? <Shield className="size-5 text-white" /> : <Clock className="size-5 text-white" />}
 </div>
 </div>

 <div className="flex-1 mb-2">
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
 {provider.full_name || `${provider.first_name} ${provider.last_name}`}
 </h1>
 <div className="flex flex-wrap items-center gap-4 mt-2 text-stone-500 font-medium">
 <div className="flex items-center gap-1.5">
 <Mail size={16} />
 <span>{provider.email}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Phone size={16} />
 <span>{provider.phone || 'No phone'}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Globe size={16} />
 <span>{provider.city || provider.country || 'N/A'}</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 mb-2">
 <button className="px-6 py-3 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 shadow-lg shadow-stone-900/20 transition-all">
 Edit Profile
 </button>
 <button className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
 <Activity size={20} />
 </button>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
 <div className="bg-stone-50 p-5 rounded-[1.5rem] border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Rating</p>
 <div className="flex items-center gap-2">
 <Star className="size-5 text-amber-400 fill-amber-400" />
 <span className="text-2xl font-black text-stone-900">{info.average_rating || '0.0'}</span>
 </div>
 </div>
 <div className="bg-stone-50 p-5 rounded-[1.5rem] border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Reviews</p>
 <div className="flex items-center gap-2">
 <FileText className="size-5 text-teal-500" />
 <span className="text-2xl font-black text-stone-900">{info.rating_count || 0}</span>
 </div>
 </div>
 <div className="bg-stone-50 p-5 rounded-[1.5rem] border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Hourly Rate</p>
 <div className="flex items-center gap-2">
 <span className="text-2xl font-black text-stone-900">${info.hourly_rate || '0'}</span>
 <span className="text-sm font-bold text-stone-400">/hr</span>
 </div>
 </div>
 <div className="bg-stone-50 p-5 rounded-[1.5rem] border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Status</p>
 <div className="flex items-center gap-2">
 {info.is_verified === 2 ? (
 <>
 <div className="size-3 bg-red-600 rounded-full"></div>
 <span className="text-lg font-black text-stone-900">Rejected</span>
 </>
 ) : info.is_active ? (
 <>
 <div className="size-3 bg-emerald-500 rounded-full animate-pulse"></div>
 <span className="text-lg font-black text-stone-900">Active</span>
 </>
 ) : (
 <>
 <div className="size-3 bg-red-500 rounded-full"></div>
 <span className="text-lg font-black text-stone-900">Inactive</span>
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
 {/* Professional Info */}
 <div className="lg:col-span-2 space-y-8">
 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
 <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-3 mb-6">
 <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
 <Stethoscope size={24} />
 </div>
 Professional Details
 </h2>
 <div className="space-y-6">
 <div>
 <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Bio</span>
 <p className="mt-2 text-stone-600 leading-relaxed font-medium">
 {info.bio || 'No biography provided.'}
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Provider Type</span>
 <div className="mt-2 p-3 bg-stone-50 rounded-xl font-bold text-stone-700 flex items-center gap-2 border border-stone-100">
 <User size={18} />
 {info.provider_type || 'N/A'}
 </div>
 </div>
 <div>
 <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Role</span>
 <div className="mt-2 p-3 bg-stone-50 rounded-xl font-bold text-stone-700 flex items-center gap-2 border border-stone-100">
 <Award size={18} />
 {info.provider_role || 'N/A'}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Specialties */}
 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
 <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-3 mb-6">
 <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
 <Award size={24} />
 </div>
 Specialties & Skills
 </h2>
 <div className="flex flex-wrap gap-3">
 {Array.isArray(info.specialties) ? info.specialties.map((s: string) => (
 <span key={s} className="px-4 py-2 bg-stone-50 text-stone-700 font-bold rounded-xl border border-stone-100">
 {s}
 </span>
 )) : (
 // Handle array as string from backend
 (JSON.parse(info.specialties || '[]') as string[]).map((s) => (
 <span key={s} className="px-4 py-2 bg-stone-50 text-stone-700 font-bold rounded-xl border border-stone-100">
 {s}
 </span>
 ))
 )}
 {(!info.specialties || info.specialties.length === 0) && (
 <span className="text-stone-400 italic">No specialties listed.</span>
 )}
 </div>
 </div>

 {/* Uploaded Documents */}
 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-200">
 <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-3 mb-6">
 <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
 <FileText size={24} />
 </div>
 Uploaded Documents
 </h2>
 {info.documents && info.documents.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {info.documents.map((doc: ProviderDocument) => (
 <div
 key={doc.id}
 className="group p-4 rounded-2xl border border-stone-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-white"
 onClick={() => setSelectedDocument(doc)}
 role="button"
 tabIndex={0}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDocument(doc); } }}
 >
 <div className="flex items-start gap-4">
 <div className={`p-3 rounded-xl transition-colors ${doc.file_type?.includes('pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
 {doc.file_type?.includes('image') ? <User className="size-6" /> : <FileText className="size-6" />}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-bold text-stone-900 line-clamp-1 text-sm">{doc.title || doc.file_name}</p>
 <p className="text-xs text-stone-500 mt-1 line-clamp-1">{doc.description}</p>
 <div className="flex items-center gap-2 mt-2">
 <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] uppercase font-bold rounded-md">
 {doc.file_extension}
 </span>
 <span className="text-[10px] text-stone-400 uppercase font-bold">
 • {doc.file_size_human}
 </span>
 </div>
 </div>
 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
 <Shield size={16} />
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
 <p className="text-stone-400 font-medium">No documents uploaded yet.</p>
 </div>
 )}
 </div>
 </div>

 {/* Document Preview Modal */}
 {selectedDocument && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setSelectedDocument(null); } }} onClick={() => setSelectedDocument(null)}>
 <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-10">
 <div>
 <h3 className="font-semibold text-lg text-stone-900">{selectedDocument.title}</h3>
 <p className="text-xs text-stone-500">{selectedDocument.file_name}</p>
 </div>
 <div className="flex items-center gap-2">
 <a
 href={selectedDocument.file_url}
 download
 target="_blank"
 className="p-2 hover:bg-stone-100 rounded-xl text-stone-500 transition-colors"
 title="Download"
 >
 <FileText size={20} />
 </a>
 <button
 onClick={() => setSelectedDocument(null)}
 className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-red-700 transition-colors"
 >
 <XCircle size={24} />
 </button>
 </div>
 </div>
 <div className="flex-1 overflow-auto bg-stone-100 flex items-center justify-center p-4 relative">
 {selectedDocument.file_type?.includes('image') ? (
 <img
 src={selectedDocument.file_url || '/default-document.png'}
 alt="Document preview"
 width={800}
 height={600}
 className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
 loading="lazy"
 />
 ) : selectedDocument.file_type?.includes('pdf') ? (
 <iframe
 src={selectedDocument.file_url}
 className="size-full rounded-xl shadow-lg bg-white"
 title="Document Preview"
 />
 ) : (
 <div className="text-center">
 <div className="size-20 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
 <FileText size={40} />
 </div>
 <p className="text-stone-500 font-medium mb-4">Preview not available for this file type.</p>
 <a
 href={selectedDocument.file_url}
 target="_blank"
 rel="noopener noreferrer"
 className="px-6 py-2 bg-stone-900 text-white rounded-xl font-bold text-sm inline-block"
 >
 Download File
 </a>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Rejection Reason Modal */}
 {showRejectModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
 <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
 <div className="flex flex-col items-center text-center mb-6">
 <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
 <AlertTriangle size={32} />
 </div>
 <h3 className="text-xl font-semibold text-stone-900">Reject Provider</h3>
 <p className="text-stone-500 mt-2 text-sm">
 Please specify the reason for rejecting this provider. This message will be sent to them.
 </p>
 </div>

 <textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder="Enter rejection reason..."
 className="w-full h-32 p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none mb-6"
 />

 <div className="flex gap-3">
 <button
 onClick={() => setShowRejectModal(false)}
 disabled={actionLoading}
 className="flex-1 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={confirmReject}
 disabled={actionLoading || !rejectionReason.trim()}
 className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
 >
 {actionLoading ? (
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
 ) : 'Confirm Rejection'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Sidebar Info */}
 <div className="space-y-8">
 {/* Verification */}
 <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-200">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Verification</h2>
 {info.is_verified === 2 ? (
 <div className="p-4 rounded-2xl flex items-center gap-3 bg-red-50 text-red-800">
 <XCircle size={24} />
 <div>
 <p className="font-bold">Account Rejected</p>
 <p className="text-xs opacity-80">
 {info.rejection_reason || 'See details below'}
 </p>
 </div>
 </div>
 ) : info.is_verified ? (
 <div className="p-4 rounded-2xl flex items-center gap-3 bg-emerald-50 text-emerald-800">
 <CheckCircle size={24} />
 <div>
 <p className="font-bold">Verified Account</p>
 <p className="text-xs opacity-80">All documents approved</p>
 </div>
 </div>
 ) : (
 <div className="p-4 rounded-2xl flex items-center gap-3 bg-amber-50 text-amber-800">
 <Clock size={24} />
 <div>
 <p className="font-bold">Pending Verification</p>
 <p className="text-xs opacity-80">Review required</p>
 </div>
 </div>
 )}

 {!info.is_verified && info.is_verified !== 2 && (
 <div className="flex gap-2">
 <button
 onClick={handleApprove}
 disabled={actionLoading}
 className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {actionLoading ? (
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
 ) : 'Approve'}
 </button>
 <button onClick={handleRejectClick} disabled={actionLoading} className="flex-1 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-50 transition-colors">
 Reject
 </button>
 </div>
 )}
 </div>
 </div>

 {/* System Info */}
 <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-200">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">System Data</h2>
 <ul className="space-y-4">
 <li className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
 <span className="text-xs font-bold text-stone-400 uppercase">Joined</span>
 <span className="font-bold text-stone-700">{provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'N/A'}</span>
 </li>
 <li className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
 <span className="text-xs font-bold text-stone-400 uppercase">Last Login</span>
 <span className="font-bold text-stone-700">-</span>
 </li>
 <li className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
 <span className="text-xs font-bold text-stone-400 uppercase">KYC Level</span>
 <span className="font-bold text-stone-700">Level 2</span>
 </li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 );
}
