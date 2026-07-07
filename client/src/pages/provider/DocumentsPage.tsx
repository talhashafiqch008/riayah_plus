
import { useState, useEffect } from 'react';
import {
 FileText,
 Upload,
 Eye,
 Download,
 Trash2,
 CheckCircle,
 Clock,
 AlertCircle,
 Plus,
 Filter,
 Search,
 X,
 File,
 Shield,
 Calendar,
 MoreVertical,
 Loader2, // Added for loading states
 LucideIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments, getDocumentsStatistics, uploadDocument, deleteDocument, downloadDocument } from '@/lib/api';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { Button } from '@/components/ui/button';




// Types (Mirrored from Careseeker page for consistency)
type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'active' | 'verified' | 'missing'; // added verified/missing for provider context
type DocumentType = 'onboarding' | 'profile' | 'verification' | 'booking' | 'medical' | 'contract' | 'general' | 'other' | 'identity' | 'license' | 'certification' | 'background' | 'insurance'; // merged types

interface Document {
 id: string | number;
 user_id?: number;
 document_type?: DocumentType;
 category?: DocumentType; // Handling both naming conventions for compatibility
 file_name: string;
 file_path?: string;
 file_type?: string;
 file_extension?: string;
 file_size?: number;
 file_size_human?: string;
 file_url?: string;
 title?: string | null;
 description?: string | null;
 status: DocumentStatus;
 rejection_reason?: string | null;
 verified_at?: string | null;
 expires_at?: string | null;
 expiresAt?: string | null; // Compat
 uploadedAt?: string | null; // Compat
 created_at?: string;
 updated_at?: string;
 required?: boolean;
 name?: string; // Compat
}

// Configs
const categoryColors: Record<string, string> = {
 onboarding: 'text-blue-600 bg-blue-50 border-blue-100',
 profile: 'text-purple-600 bg-purple-50 border-purple-100',
 verification: 'text-teal-600 bg-teal-50 border-teal-100',
 booking: 'text-amber-600 bg-amber-50 border-amber-100',
 medical: 'text-rose-600 bg-rose-50 border-rose-100',
 contract: 'text-indigo-600 bg-indigo-50 border-indigo-100',
 general: 'text-stone-600 bg-stone-50 border-stone-100',
 other: 'text-stone-600 bg-stone-50 border-stone-100',
 // Provider specific
 identity: 'text-blue-600 bg-blue-50 border-blue-100',
 license: 'text-purple-600 bg-purple-50 border-purple-100',
 certification: 'text-teal-600 bg-teal-50 border-teal-100',
 background: 'text-indigo-600 bg-indigo-50 border-indigo-100',
 insurance: 'text-rose-600 bg-rose-50 border-rose-100',
};

const statusConfig: Record<string, { label: string; icon: LucideIcon; color: string; bg: string; border: string }> = {
 pending: { label: 'In Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
 approved: { label: 'Verified', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
 verified: { label: 'Verified', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
 rejected: { label: 'Rejected', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
 expired: { label: 'Expired', icon: AlertCircle, color: 'text-stone-500', bg: 'bg-stone-100', border: 'border-stone-200' },
 active: { label: 'Active', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
 missing: { label: 'Missing', icon: Upload, color: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200' },
};

// Fallback Mock Data for Provider (since API might not be fully ready)
const mockProviderDocuments: Document[] = [
 {
 id: '1',
 name: 'Emirates ID',
 file_name: 'emirates_id_front.jpg',
 category: 'identity',
 status: 'verified',
 uploadedAt: '2024-11-15',
 expiresAt: '2027-11-15',
 file_size_human: '2.4 MB',
 required: true,
 },
 {
 id: '2',
 name: 'Nursing License',
 file_name: 'nursing_license_2025.pdf',
 category: 'license',
 status: 'verified',
 uploadedAt: '2024-11-20',
 expiresAt: '2025-03-30',
 file_size_human: '1.1 MB',
 required: true,
 },
 {
 id: '5',
 name: 'Professional Liability Insurance',
 file_name: 'insurance_policy.pdf',
 category: 'insurance',
 status: 'pending',
 uploadedAt: '2024-12-18',
 file_size_human: '4.5 MB',
 required: true,
 },
 {
 id: '6',
 name: 'Dementia Care Certificate',
 file_name: 'dementia_cert.pdf',
 category: 'certification',
 status: 'missing',
 file_size_human: '-',
 required: false,
 },
];

export default function DocumentsPage() {
 const { user } = useAuth(); // Using Auth Context if available
 const [documents, setDocuments] = useState<Document[]>([]);
 const [stats, setStats] = useState<any>(null);
 const [filter, setFilter] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [loading, setLoading] = useState(true);
 const [showUploadModal, setShowUploadModal] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [fileName, setFileName] = useState<string>('');
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [documentToDelete, setDocumentToDelete] = useState<string | number | null>(null);
 const [deleting, setDeleting] = useState(false);

 // Fetch real documents
 const fetchDocuments = async () => {
 try {
 setLoading(true);
 const response = await getDocuments();
 setDocuments(response.data?.documents || []);
 } catch (error) {
 console.error('Failed to fetch documents:', error);
 // toast.error('Failed to load documents');
 } finally {
 setLoading(false);
 }
 };

 const fetchStats = async () => {
 try {
 const response = await getDocumentsStatistics();
 setStats(response.data);
 } catch (error) {
 console.error('Failed to fetch stats:', error);
 }
 };

 useEffect(() => {
 fetchDocuments();
 fetchStats();
 }, []);

 const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 const formData = new FormData(e.currentTarget);

 try {
 setUploading(true);
 await uploadDocument(formData);
 toast.success('Document uploaded successfully');
 setShowUploadModal(false);
 setFileName('');
 fetchDocuments();
 fetchStats();
 } catch (error: unknown) {
 console.error('Upload failed:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to upload document');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to upload document');
 }
 } finally {
 setUploading(false);
 }
 };

 const handleDeleteClick = (id: string | number) => {
 setDocumentToDelete(id);
 setShowDeleteModal(true);
 };

 const confirmDelete = async () => {
 if (!documentToDelete) return;
 try {
 setDeleting(true);
 await deleteDocument(documentToDelete);
 toast.success('Document deleted successfully');
 fetchDocuments();
 fetchStats();
 setShowDeleteModal(false);
 setDocumentToDelete(null);
 } catch (error) {
 console.error('Delete failed:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to delete document');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to delete document');
 }
 } finally {
 setDeleting(false);
 }
 };

 const handleDownload = async (doc: Document) => {
 try {
 const toastId = toast.loading('Downloading…');
 await downloadDocument(doc.id, doc.file_name);
 toast.dismiss(toastId);
 toast.success('Download started');
 } catch (error) {
 toast.error('Failed to download');
 }
 };

 // Compute Stats
 const displayStats = {
 total: stats?.total || documents.length,
 verified: stats?.verified || stats?.by_status?.approved || stats?.by_status?.verified || documents.filter(d => ['verified', 'approved', 'active'].includes(d.status)).length,
 pending: stats?.pending || stats?.by_status?.pending || documents.filter(d => d.status === 'pending').length,
 };

 const filteredDocuments = documents.filter(doc => {
 const type = doc.document_type || doc.category;
 const name = doc.title || doc.name || doc.file_name;

 if (filter !== 'all' && type !== filter) return false;
 if (searchQuery && !name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
 return true;
 });

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 setFileName(e.target.files[0].name);
 }
 };

 return (
 <div className="space-y-8 pb-10 max-w-7xl mx-auto p-4 md:p-8">
 {/* Header Section */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">Documents</h1>
 <p className="text-stone-500 mt-2 text-lg">Manage your verified documents, licenses, and records securely.</p>
 </div>
 <button
 onClick={() => setShowUploadModal(true)}
 className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 font-medium transform hover:-translate-y-0.5"
 >
 <Upload className="size-5 group-hover:scale-110 transition-transform" />
 Upload New Document
 </button>
 </div>

 {/* Stats Cards (Copied from Careseeker) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
 <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
 <div className="absolute right-0 top-0 size-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="relative">
 <div className="size-12 bg-blue-100/50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
 <FileText className="size-6" />
 </div>
 <p className="text-stone-500 font-medium text-sm">Total Documents</p>
 <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.total}</h3>
 </div>
 </div>

 <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
 <div className="absolute right-0 top-0 size-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="relative">
 <div className="size-12 bg-emerald-100/50 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
 <Shield className="size-6" />
 </div>
 <p className="text-stone-500 font-medium text-sm">Verified & Approved</p>
 <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.verified}</h3>
 </div>
 </div>

 <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
 <div className="absolute right-0 top-0 size-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="relative">
 <div className="size-12 bg-amber-100/50 rounded-xl flex items-center justify-center mb-4 text-amber-600">
 <Clock className="size-6" />
 </div>
 <p className="text-stone-500 font-medium text-sm">Pending Review</p>
 <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.pending}</h3>
 </div>
 </div>
 </div>

 {/* Filter & Search Bar */}
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
 <div className="relative flex-1 w-full">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search by file name or title…"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-stone-700 placeholder:text-stone-400 font-medium"
 />
 </div>
 <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 flex gap-2 px-2 scrollbar-hide">
 {['all', 'identity', 'license', 'certification', 'insurance'].map((type) => (
 <button
 key={type}
 onClick={() => setFilter(type)}
 className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${filter === type ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' : 'bg-stone-50 text-stone-600 hover:bg-stone-100' }`}
 >
 {type.charAt(0).toUpperCase() + type.slice(1)}
 </button>
 ))}
 </div>
 </div>

 {/* Content Area */}
 <div className="min-h-[400px]">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <Loader2 className="size-16 text-teal-600 animate-spin" />
 <p className="mt-4 text-stone-500 font-medium">Loading your documents…</p>
 </div>
 ) : filteredDocuments.length === 0 ? (
 <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-12 text-center hover:border-teal-500/50 hover:bg-teal-50/50 transition-all duration-300 group cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={() => setShowUploadModal(true)}>
 <div className="size-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
 <Upload className="size-10 text-teal-600" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No documents found</h3>
 <p className="text-stone-500 max-w-sm mx-auto mb-6">
 Start by uploading your licenses, certifications, or identity documents.
 </p>
 <button className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700">
 <Plus className="size-5" />
 Upload your first document
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
 {filteredDocuments.map((doc) => {
 const status = statusConfig[doc.status] || statusConfig.pending;
 const catKey = doc.document_type || doc.category || 'other';
 const categoryStyle = categoryColors[catKey] || categoryColors.other;
 const displayDate = doc.created_at || doc.uploadedAt;
 const displayExpire = doc.expires_at || doc.expiresAt;
 const displayName = doc.title || doc.name || doc.file_name;

 return (
 <div key={doc.id} className="group bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-xl hover:border-teal-100 hover:shadow-teal-900/5 transition-all duration-300 flex flex-col">
 <div className="flex items-start justify-between mb-4">
 <div className={`size-12 rounded-xl flex items-center justify-center ${categoryStyle}`}>
 <FileText className="size-6" />
 </div>
 <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
 <status.icon className="size-3.5" />
 {status.label}
 </div>
 </div>

 <div className="mb-4 flex-1">
 <h4 className="font-semibold text-stone-900 line-clamp-1 mb-1" title={displayName}>
 {displayName}
 </h4>
 <p className="text-sm text-stone-500 line-clamp-1 break-all">
 {doc.file_name}
 </p>
 </div>

 <div className="flex items-center justify-between pt-4 border-t border-stone-100">
 <div className="text-xs text-stone-400 font-medium">
 {displayDate ? new Date(displayDate).toLocaleDateString() : 'N/A'}
 {displayExpire && (
 <span className={new Date(displayExpire) < new Date() ? 'text-red-500 ml-2' : 'ml-2'}>
 • Exp: {new Date(displayExpire).toLocaleDateString()}
 </span>
 )}
 </div>
 <div className="flex gap-1">
 <button
 onClick={() => handleDownload(doc)}
 className="p-2 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
 title="Download"
 >
 <Download className="size-4" />
 </button>
 <button
 onClick={() => handleDeleteClick(doc.id)}
 className="p-2 text-red-700 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
 title="Delete"
 >
 <Trash2 className="size-4" />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Upload Modal - Copied and adapted */}
 {showUploadModal && (
 <>
 <div role="button" tabIndex={0}
 className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] transition-opacity"
 onClick={() => setShowUploadModal(false)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 />
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl transform transition-all scale-100">
 <div className="p-6 border-b border-stone-100 flex items-center justify-between">
 <h3 className="text-xl font-semibold text-stone-900">Upload Document</h3>
 <button
 onClick={() => setShowUploadModal(false)}
 className="text-stone-400 hover:text-stone-600 transition-colors"
 >
 <X className="size-6" />
 </button>
 </div>

 <form onSubmit={handleUpload} className="p-6 space-y-5">
 <div>
 <label htmlFor="input-src-app-provider-documents-page-tsx-454-457" className="block text-sm font-semibold text-stone-700 mb-2">
 Document Type
 </label>
 <div className="relative">
 <select
 name="document_type"
 required
 className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none text-stone-700 font-medium"
 >
 <option value="">Select a category…</option>
 <option value="identity">Identity (ID/Passport)</option>
 <option value="license">Professional License</option>
 <option value="certification">Certification</option>
 <option value="insurance">Insurance Policy</option>
 <option value="background">Background Check</option>
 <option value="other">Other</option>
 </select>
 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
 <MoreVertical className="size-4 rotate-90" />
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="input-src-app-provider-documents-page-tsx-478-480" className="block text-sm font-semibold text-stone-700 mb-2">
 Title <span className="text-stone-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 name="title"
 placeholder="e.g. Nursing License 2025"
 className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-stone-700 font-medium placeholder:text-stone-400"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-provider-documents-page-tsx-490-493" className="block text-sm font-semibold text-stone-700 mb-2">
 File
 </label>
 <div className="relative group">
 <input
 type="file"
 name="file"
 id="file-upload"
 required
 onChange={handleFileChange}
 accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
 className="absolute inset-0 size-full opacity-0 cursor-pointer z-10"
 />
 <div className="w-full px-4 py-8 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 group-hover:bg-stone-100 transition-colors flex flex-col items-center justify-center text-center">
 {fileName ? (
 <>
 <div className="size-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-2">
 <File className="size-6" />
 </div>
 <p className="text-sm font-semibold text-stone-900 line-clamp-1 px-4">{fileName}</p>
 <p className="text-xs text-teal-600 mt-1">Click to change file</p>
 </>
 ) : (
 <>
 <div className="size-10 bg-stone-200 text-stone-500 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
 <Upload className="size-6" />
 </div>
 <p className="text-sm font-medium text-stone-600">
 <span className="text-teal-600 font-bold">Click to upload</span> or drag and drop
 </p>
 <p className="text-xs text-stone-400 mt-1">
 PDF, IMG, DOC up to 10MB
 </p>
 </>
 )}
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setShowUploadModal(false)}
 className="flex-1 px-5 py-3 border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={uploading}
 className="flex-1 px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
 >
 {uploading ? (
 <>
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Uploading…
 </>
 ) : (
 <>Upload Document</>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 </>
 )}

 {/* Delete Confirmation Modal */}
 {showDeleteModal && (
 <>
 <div role="button" tabIndex={0}
 className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] transition-opacity"
 onClick={() => setShowDeleteModal(false)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 />
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform transition-all scale-100 overflow-hidden">
 <div className="p-6 text-center">
 <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
 <Trash2 className="size-8 text-red-500" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">Delete Document?</h3>
 <p className="text-stone-500 text-sm mb-6">
 Are you sure you want to delete this document? This action cannot be undone.
 </p>
 <div className="flex gap-3">
 <button
 onClick={() => setShowDeleteModal(false)}
 className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={confirmDelete}
 disabled={deleting}
 className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
 >
 {deleting ? 'Deleting…' : 'Delete'}
 </button>
 </div>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 );
}
