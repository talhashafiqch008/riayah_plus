
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
 containerVariants,
 itemVariants,
 cardVariants,
 listItemVariants,
 whileHover,
 whileTap
} from '@/components/motion/variants';
import {
  FileText,
  Upload,
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
  ClipboardList,
  MessageSquare,
  RefreshCw
 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
 deleteDocument,
 downloadDocument,
 getDocuments,
 getDocumentsStatistics,
 uploadDocument,
 submitDocumentRequest,
 getDocumentRequests
} from '@/lib/api';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';


type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'active' | 'verified';
type DocumentType = 'onboarding' | 'profile' | 'verification' | 'booking' | 'medical' | 'contract' | 'general' | 'other';
type RequestStatus = 'pending' | 'approved' | 'rejected';

interface Document {
 id: string | number;
 user_id: number;
 document_type: DocumentType;
 file_name: string;
 file_path: string;
 file_type: string;
 file_extension: string;
 file_size: number;
 file_size_human: string;
 file_url: string;
 title: string | null;
 description: string | null;
 status: DocumentStatus;
 rejection_reason: string | null;
 verified_at: string | null;
 expires_at: string | null;
 is_expired: boolean;
 is_public: boolean;
 created_at: string;
 updated_at: string;
}

interface DocumentRequest {
 id: string | number;
 user_id: number;
 document_type: DocumentType;
 title: string | null;
 description: string | null;
 status: RequestStatus;
 rejection_reason: string | null;
 file_name: string | null;
 file_path: string | null;
 file_url: string | null;
 document_id: string | number | null;
 created_at: string;
 updated_at: string;
}

interface DocumentsResponse {
 success: boolean;
 message: string;
 data: {
 documents: Document[];
 };
}

interface DocumentRequestsResponse {
 success: boolean;
 message: string;
 data: {
 requests: DocumentRequest[];
 };
}

interface StatsResponse {
 success: boolean;
 message: string;
 data: {
 total: number;
 by_type: Record<string, number>;
 by_status: Record<string, number>;
 total_size: number;
 expired_count: number;
 };
}

const categoryColors: Record<DocumentType, string> = {
 onboarding: 'text-blue-600 bg-blue-50 border-blue-100',
 profile: 'text-purple-600 bg-purple-50 border-purple-100',
 verification: 'text-teal-600 bg-teal-50 border-teal-100',
 booking: 'text-amber-600 bg-amber-50 border-amber-100',
 medical: 'text-rose-600 bg-rose-50 border-rose-100',
 contract: 'text-indigo-600 bg-indigo-50 border-indigo-100',
 general: 'text-stone-600 bg-stone-50 ring-1 ring-stone-100/50',
 other: 'text-stone-600 bg-stone-50 ring-1 ring-stone-100/50',
};

const statusConfig: Record<DocumentStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }> = {
  pending: { label: 'In Review', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  approved: { label: 'Verified', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  verified: { label: 'Verified', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { label: 'Rejected', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  active: { label: 'Active', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
};

const requestStatusConfig: Record<RequestStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }> = {
 pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
 approved: { label: 'Approved', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
 rejected: { label: 'Rejected', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export default function DocumentsPage() {
 const { user } = useAuth();
 const isCareseeker = user?.role === 'careseeker' || user?.role === 'family' || user?.role === 'client';
 const isProvider = !isCareseeker;

 const [documents, setDocuments] = useState<Document[]>([]);
 const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([]);
 const [stats, setStats] = useState<StatsResponse['data'] | null>(null);
 const [filter, setFilter] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [loading, setLoading] = useState(true);
 const [requestsLoading, setRequestsLoading] = useState(false);
 const [showUploadModal, setShowUploadModal] = useState(false);
 const [showRequestModal, setShowRequestModal] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [requesting, setRequesting] = useState(false);
 const [fileName, setFileName] = useState<string>('');
 const [requestFileName, setRequestFileName] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [documentToRenew, setDocumentToRenew] = useState<Document | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [renewFileName, setRenewFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestFileInputRef = useRef<HTMLInputElement>(null);
  const renewFileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 fetchDocuments();
 fetchStats();
 if (isCareseeker) {
 fetchDocumentRequests();
 }
 }, [isCareseeker]);

 const fetchDocuments = async () => {
 try {
 setLoading(true);
 const filters = isCareseeker ? { status: 'approved' } : undefined;
 const response: DocumentsResponse = await getDocuments(filters);
 const docs = response.data.documents || [];
 setDocuments(isCareseeker ? docs.filter(d => d.status === 'approved') : docs);
 } catch (error) {
 console.error('Failed to fetch documents:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load documents');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load documents');
 }
 } finally {
 setLoading(false);
 }
 };

 const fetchDocumentRequests = async () => {
 try {
 setRequestsLoading(true);
 const response: DocumentRequestsResponse = await getDocumentRequests();
 setDocumentRequests(response.data.requests || []);
 } catch (error) {
 console.error('Failed to fetch document requests:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load document requests');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load document requests');
 }
 } finally {
 setRequestsLoading(false);
 }
 };

 const fetchStats = async () => {
 try {
 const response: StatsResponse = await getDocumentsStatistics();
 setStats(response.data);
 } catch (error) {
 console.error('Failed to fetch stats:', error);
 }
 };

 const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();

 const formData = new FormData();
 const form = e.currentTarget;

 const fileInput = fileInputRef.current;
 if (fileInput?.files?.[0]) {
 formData.append('file', fileInput.files[0]);
 }

 const documentType = (form.elements.namedItem('document_type') as HTMLSelectElement)?.value;
 const title = (form.elements.namedItem('title') as HTMLInputElement)?.value;

 if (documentType) {
 formData.append('document_type', documentType);
 }
 if (title) {
 formData.append('title', title);
 }

 try {
 setUploading(true);
 await uploadDocument(formData);
 toast.success('Document uploaded successfully');
 setShowUploadModal(false);
 setFileName('');
 if (fileInput) fileInput.value = '';
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

 const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();

 const form = e.currentTarget;
 const fileInput = requestFileInputRef.current;
 const file = fileInput?.files?.[0];

 if (!file) {
 toast.error('Please select a file to upload');
 return;
 }

 const documentType = (form.elements.namedItem('document_type') as HTMLSelectElement)?.value;
 const title = (form.elements.namedItem('title') as HTMLInputElement)?.value;
 const description = (form.elements.namedItem('description') as HTMLTextAreaElement)?.value;

 if (!documentType) {
 toast.error('Please select a document type');
 return;
 }

 try {
 setRequesting(true);
 await submitDocumentRequest(file, documentType, title || undefined, description || undefined);
 toast.success('Document request submitted successfully. You will be notified once it is reviewed.');
 setShowRequestModal(false);
 setRequestFileName('');
 if (fileInput) fileInput.value = '';
 fetchDocumentRequests();
 fetchDocuments();
 fetchStats();
 } catch (error: unknown) {
 console.error('Request submission failed:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to submit document request');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to submit document request');
 }
 } finally {
 setRequesting(false);
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
 const toastId = toast.loading('Downloading document…');
 await downloadDocument(doc.id, doc.file_name);
 toast.dismiss(toastId);
 toast.success('Download started');
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to download document');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to download document');
 }
 }
 };

 const filteredDocuments = documents.filter(doc => {
 if (filter !== 'all' && doc.document_type !== filter) return false;
 if (searchQuery && !doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
 !doc.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
 return true;
 });

  const displayStats = {
  total: stats?.total || documents.length,
  approved: stats?.by_status?.approved || documents.filter(d => d.status === 'approved').length,
  pending: isCareseeker
  ? documentRequests.filter(r => r.status === 'pending').length
  : (stats?.by_status?.pending || documents.filter(d => d.status === 'pending').length),
  expired: stats?.expired_count || documents.filter(d => d.status === 'expired').length,
  };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 setFileName(e.target.files[0].name);
 }
 };

  const handleRequestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRequestFileName(e.target.files[0].name);
    }
  };

  const handleRenewClick = (doc: Document) => {
    setDocumentToRenew(doc);
    setShowRenewModal(true);
  };

  const handleRenewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRenewFileName(e.target.files[0].name);
    }
  };

  const handleRenew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!documentToRenew) return;

    const formData = new FormData();
    const form = e.currentTarget;

    const fileInput = renewFileInputRef.current;
    if (fileInput?.files?.[0]) {
      formData.append('file', fileInput.files[0]);
    }

    const documentType = (form.elements.namedItem('document_type') as HTMLSelectElement)?.value;
    const title = (form.elements.namedItem('title') as HTMLInputElement)?.value;

    if (documentType) {
      formData.append('document_type', documentType);
    }
    if (title) {
      formData.append('title', title);
    }

    try {
      setRenewing(true);
      await uploadDocument(formData);
      toast.success('Document renewed successfully');
      setShowRenewModal(false);
      setRenewFileName('');
      if (fileInput) fileInput.value = '';
      fetchDocuments();
      fetchStats();
    } catch (error: unknown) {
      console.error('Renew failed:', error);
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to renew document');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to renew document');
      }
    } finally {
      setRenewing(false);
    }
  };

  return (
 <motion.div
 initial="hidden"
 animate="visible"
 variants={containerVariants}
 className="space-y-8 pb-10"
 >
 <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">Documents</h1>
 <p className="text-stone-500 mt-2 text-lg">
 {isCareseeker
 ? 'Request document uploads for admin approval and view your approved documents.'
 : 'Manage your verified documents and records securely.'}
 </p>
 </div>
 {isProvider ? (
 <button
 onClick={() => setShowUploadModal(true)}
 className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-transform duration-300 font-medium transform hover:-translate-y-0.5 active:scale-[0.98]"
 >
 <Upload className="size-5 group-hover:scale-110 transition-transform" />
 Upload New Document
 </button>
 ) : (
 <button
 onClick={() => setShowRequestModal(true)}
 className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-transform duration-300 font-medium transform hover:-translate-y-0.5 active:scale-[0.98]"
 >
 <ClipboardList className="size-5 group-hover:scale-110 transition-transform" />
 Request Upload
 </button>
  )}
  </motion.div>

  <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 ring-1 ring-stone-100/50  transition-transform duration-300 relative overflow-hidden group">
 <div className="absolute right-0 top-0 size-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="relative">
 <div className="size-12 bg-blue-100/50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
 <FileText className="size-6" />
 </div>
 <p className="text-stone-500 font-medium text-sm">Total Documents</p>
 <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.total}</h3>
 </div>
 </div>

 <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 ring-1 ring-stone-100/50  transition-transform duration-300 relative overflow-hidden group">
 <div className="absolute right-0 top-0 size-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
 <div className="relative">
 <div className="size-12 bg-emerald-100/50 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
 <Shield className="size-6" />
 </div>
 <p className="text-stone-500 font-medium text-sm">Verified & Approved</p>
 <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.approved}</h3>
 </div>
 </div>

  <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 ring-1 ring-stone-100/50  transition-transform duration-300 relative overflow-hidden group">
  <div className="absolute right-0 top-0 size-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
  <div className="relative">
  <div className="size-12 bg-amber-100/50 rounded-xl flex items-center justify-center mb-4 text-amber-600">
  <Clock className="size-6" />
  </div>
  <p className="text-stone-500 font-medium text-sm">
  {isCareseeker ? 'Pending Requests' : 'Pending Review'}
  </p>
  <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.pending}</h3>
  </div>
   </div>

  <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 ring-1 ring-stone-100/50  transition-transform duration-300 relative overflow-hidden group">
  <div className="absolute right-0 top-0 size-32 bg-orange-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
  <div className="relative">
  <div className="size-12 bg-orange-100/50 rounded-xl flex items-center justify-center mb-4 text-orange-600">
  <AlertCircle className="size-6" />
  </div>
  <p className="text-stone-500 font-medium text-sm">Expired</p>
  <h3 className="text-3xl font-semibold text-stone-900 mt-1">{displayStats.expired}</h3>
  </div>
  </div>
   </motion.div>

  {isCareseeker && (
  <div className="space-y-4">
 <div className="flex items-center gap-3">
 <ClipboardList className="size-6 text-teal-600" />
 <h2 className="text-xl font-semibold text-stone-900">Your Document Requests</h2>
 </div>

 {requestsLoading ? (
 <div className="flex flex-col items-center justify-center py-12">
 <div className="size-12 border-4 ring-1 ring-stone-200/50 border-t-teal-500 rounded-full animate-spin"></div>
 <p className="mt-3 text-stone-500 font-medium">Loading your requests…</p>
 </div>
 ) : documentRequests.length === 0 ? (
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-dashed ring-1 ring-stone-200/50 p-8 text-center">
 <p className="text-stone-500">
 You have not submitted any document requests yet. Click "Request Upload" to get started.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
 {documentRequests.map((req) => {
 const status = requestStatusConfig[req.status];
 const categoryStyle = categoryColors[req.document_type] || categoryColors.other;

 return (
 <div key={`req-${req.id}`} className="group bg-white/90 backdrop-blur-xl rounded-2xl p-5 ring-1 ring-stone-200/50  hover:shadow-xl hover:border-teal-100 hover:shadow-teal-900/5 transition-transform duration-300 flex flex-col">
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
 <h4 className="font-semibold text-stone-900 line-clamp-1 mb-1" title={req.title || req.file_name || 'Untitled Request'}>
 {req.title || req.file_name || 'Untitled Request'}
 </h4>
 <p className="text-sm text-stone-500 line-clamp-1 break-all">
 {req.file_name || req.document_type}
 </p>
 {req.description && (
 <p className="text-sm text-stone-400 line-clamp-2 mt-2">
 {req.description}
 </p>
 )}
 </div>

 {req.status === 'rejected' && req.rejection_reason && (
 <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
 <div className="flex items-start gap-2">
 <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
 <div>
 <p className="text-xs font-semibold text-red-700 mb-0.5">Rejection Reason</p>
 <p className="text-xs text-red-600">{req.rejection_reason}</p>
 </div>
 </div>
 </div>
 )}

 {req.status === 'approved' && req.document_id && (
 <div className="mb-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
 <div className="flex items-center gap-2 text-emerald-700">
 <CheckCircle className="size-4" />
 <span className="text-xs font-semibold">Document approved and available below</span>
 </div>
 </div>
 )}

 <div className="flex items-center justify-between pt-4 border-t ring-1 ring-stone-100/50">
 <div className="text-xs text-stone-500 font-medium">
 {new Date(req.created_at).toLocaleDateString()}
 </div>
 {req.status === 'approved' && req.file_url && (
 <a
 href={req.file_url}
 target="_blank"
 rel="noopener noreferrer"
 className="p-2 text-teal-700 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
 title="View Document"
 >
 <Download className="size-4" />
 </a>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center bg-white p-2 rounded-2xl ring-1 ring-stone-200/50 ">
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
 <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 flex gap-2 px-2">
 {['all', 'verification', 'medical', 'general'].map((type) => (
 <button
 key={type}
 onClick={() => setFilter(type)}
 className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-transform duration-300 whitespace-nowrap ${filter === type ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20' : 'bg-stone-50 text-stone-600 hover:bg-stone-100' }`}
 >
 {type.charAt(0).toUpperCase() + type.slice(1)}
 </button>
 ))}
 </div>
 </div>

 <div className="min-h-[400px]">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="size-16 border-4 ring-1 ring-stone-200/50 border-t-teal-500 rounded-full animate-spin"></div>
 <p className="mt-4 text-stone-500 font-medium">Loading your documents…</p>
 </div>
 ) : filteredDocuments.length === 0 ? (
 <div role="button" tabIndex={0} className="bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-dashed ring-1 ring-stone-200/50 p-12 text-center hover:border-teal-500/50 hover:bg-teal-50/50 transition-transform duration-300 group cursor-pointer"
 onClick={() => isProvider ? setShowUploadModal(true) : setShowRequestModal(true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}>
 <div className="size-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
 {isProvider ? (
 <Upload className="size-10 text-teal-600" />
 ) : (
 <ClipboardList className="size-10 text-teal-600" />
 )}
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No documents found</h3>
 <p className="text-stone-500 max-w-sm mx-auto mb-6">
 {isProvider
 ? 'Start by uploading your verification documents, medical records, or consent forms.'
 : 'Your approved documents will appear here once admin reviews your requests.'}
 </p>
 <button className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700">
 <Plus className="size-5" />
 {isProvider ? 'Upload your first document' : 'Request your first upload'}
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
 {filteredDocuments.map((doc) => {
 const status = statusConfig[doc.status];
 const categoryStyle = categoryColors[doc.document_type] || categoryColors.other;

 return (
 <div key={doc.id} className="group bg-white/90 backdrop-blur-xl rounded-2xl p-5 ring-1 ring-stone-200/50  hover:shadow-xl hover:border-teal-100 hover:shadow-teal-900/5 transition-transform duration-300 flex flex-col">
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
 <h4 className="font-semibold text-stone-900 line-clamp-1 mb-1" title={doc.title || doc.file_name}>
 {doc.title || doc.file_name}
 </h4>
 <p className="text-sm text-stone-500 line-clamp-1 break-all">
 {doc.file_name}
 </p>
 </div>

  <div className="flex items-center justify-between pt-4 border-t ring-1 ring-stone-100/50">
  <div className="text-xs text-teal-700 font-medium">
  {doc.file_size_human} • {new Date(doc.created_at).toLocaleDateString()}
  </div>
  <div className="flex gap-1">
  {doc.status === 'expired' && (
  <button
  onClick={() => handleRenewClick(doc)}
  className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
  title="Renew Document"
  >
  <RefreshCw className="size-4" />
  </button>
  )}
  <button
  onClick={() => handleDownload(doc)}
  className="p-2 text-stone-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
  title="Download"
  >
  <Download className="size-4" />
  </button>
  {isProvider && (
  <button
  onClick={() => handleDeleteClick(doc.id)}
  className="p-2 text-stone-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
  title="Delete"
  >
  <Trash2 className="size-4" />
  </button>
  )}
  </div>
  </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {isProvider && showUploadModal && (
 <>
 <div role="button" tabIndex={0}
 className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] transition-opacity"
 onClick={() => setShowUploadModal(false)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 />
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-sm sm:max-w-lg shadow-2xl transform transition-transform duration-300 scale-100">
 <div className="p-6 border-b ring-1 ring-stone-100/50 flex items-center justify-between">
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
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-672-675" className="block text-sm font-semibold text-stone-700 mb-2">
 Document Type
 </label>
 <div className="relative">
 <select
 name="document_type"
 required
 className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none text-stone-700 font-medium"
 >
 <option value="">Select a category…</option>
 <option value="verification">Verification (ID, Passport)</option>
 <option value="medical">Medical Record</option>
 <option value="booking">Booking Related</option>
 <option value="contract">Contract</option>
 <option value="general">General</option>
 <option value="other">Other</option>
 </select>
 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
 <MoreVertical className="size-4 rotate-90" />
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-696-698" className="block text-sm font-semibold text-stone-700 mb-2">
 Title <span className="text-stone-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 name="title"
 placeholder="e.g. National ID Front"
 className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-stone-700 font-medium placeholder:text-stone-400"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-708-711" className="block text-sm font-semibold text-stone-700 mb-2">
 File
 </label>
 <div className="relative group">
 <input
 ref={fileInputRef}
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
 className="flex-1 px-5 py-3 ring-1 ring-stone-200/50 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
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

 {isCareseeker && showRequestModal && (
 <>
 <div role="button" tabIndex={0}
 className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] transition-opacity"
 onClick={() => setShowRequestModal(false)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 />
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-sm sm:max-w-lg shadow-2xl transform transition-transform duration-300 scale-100">
 <div className="p-6 border-b ring-1 ring-stone-100/50 flex items-center justify-between">
 <h3 className="text-xl font-semibold text-stone-900">Request Document Upload</h3>
 <button
 onClick={() => setShowRequestModal(false)}
 className="text-stone-400 hover:text-stone-600 transition-colors"
 >
 <X className="size-6" />
 </button>
 </div>

 <form onSubmit={handleRequestSubmit} className="p-6 space-y-5">
 <div>
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-797-800" className="block text-sm font-semibold text-stone-700 mb-2">
 Document Type <span className="text-red-500">*</span>
 </label>
 <div className="relative">
 <select
 name="document_type"
 required
 className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none text-stone-700 font-medium"
 >
 <option value="">Select a category…</option>
 <option value="onboarding">Onboarding</option>
 <option value="profile">Profile</option>
 <option value="verification">Verification (ID, Passport)</option>
 <option value="booking">Booking Related</option>
 <option value="medical">Medical Record</option>
 <option value="contract">Contract</option>
 <option value="general">General</option>
 <option value="other">Other</option>
 </select>
 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
 <MoreVertical className="size-4 rotate-90" />
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-823-825" className="block text-sm font-semibold text-stone-700 mb-2">
 Title <span className="text-stone-400 font-normal">(Optional)</span>
 </label>
 <input
 type="text"
 name="title"
 placeholder="e.g. National ID Front"
 className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-stone-700 font-medium placeholder:text-stone-400"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-835-837" className="block text-sm font-semibold text-stone-700 mb-2">
 Description <span className="text-stone-400 font-normal">(Optional)</span>
 </label>
 <textarea
 name="description"
 rows={3}
 placeholder="Provide any additional details about this document…"
 className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-stone-700 font-medium placeholder:text-stone-400 resize-none"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-careseeker-documents-page-tsx-847-850" className="block text-sm font-semibold text-stone-700 mb-2">
 File <span className="text-red-500">*</span>
 </label>
 <div className="relative group">
 <input
 ref={requestFileInputRef}
 type="file"
 name="file"
 id="request-file-upload"
 required
 onChange={handleRequestFileChange}
 accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
 className="absolute inset-0 size-full opacity-0 cursor-pointer z-10"
 />
 <div className="w-full px-4 py-8 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 group-hover:bg-stone-100 transition-colors flex flex-col items-center justify-center text-center">
 {requestFileName ? (
 <>
 <div className="size-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-2">
 <File className="size-6" />
 </div>
 <p className="text-sm font-semibold text-stone-900 line-clamp-1 px-4">{requestFileName}</p>
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
 onClick={() => setShowRequestModal(false)}
 className="flex-1 px-5 py-3 ring-1 ring-stone-200/50 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={requesting}
 className="flex-1 px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
 >
 {requesting ? (
 <>
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Submitting…
 </>
 ) : (
 <>Submit Request</>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 </>
 )}

  {showDeleteModal && (
  <>
  <div role="button" tabIndex={0}
  className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] transition-opacity"
  onClick={() => setShowDeleteModal(false)}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
  />
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
  <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-sm shadow-2xl transform transition-transform duration-300 scale-100">
  <div className="p-6 text-center">
  <div className="size-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
  <Trash2 className="size-8 text-red-600" />
  </div>
  <h3 className="text-xl font-semibold text-stone-900 mb-2">Delete Document?</h3>
  <p className="text-stone-500 text-sm mb-6">
  Are you sure you want to delete this document? This action cannot be undone.
  </p>

  <div className="flex gap-3">
  <button
  onClick={() => setShowDeleteModal(false)}
  className="flex-1 px-4 py-2.5 ring-1 ring-stone-200/50 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
  >
  Cancel
  </button>
  <button
  onClick={confirmDelete}
  disabled={deleting}
  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
  >
  {deleting ? (
  <>
  <div className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  Deleting…
  </>
  ) : (
  'Delete'
  )}
  </button>
  </div>
  </div>
  </div>
  </div>
  </>
  )}

  {showRenewModal && (
  <>
  <div role="button" tabIndex={0}
  className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] transition-opacity"
  onClick={() => setShowRenewModal(false)}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
  />
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
  <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-sm sm:max-w-lg shadow-2xl transform transition-transform duration-300 scale-100">
  <div className="p-6 border-b ring-1 ring-stone-100/50 flex items-center justify-between">
  <h3 className="text-xl font-semibold text-stone-900">Renew Document</h3>
  <button
  onClick={() => setShowRenewModal(false)}
  className="text-stone-400 hover:text-stone-600 transition-colors"
  >
  <X className="size-6" />
  </button>
  </div>

  <form onSubmit={handleRenew} className="p-6 space-y-5">
  <div>
  <label className="block text-sm font-semibold text-stone-700 mb-2">
  Document Type
  </label>
  <div className="relative">
  <select
  name="document_type"
  required
  className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none text-stone-700 font-medium"
  >
  <option value="">Select a category…</option>
  <option value="verification">Verification (ID, Passport)</option>
  <option value="medical">Medical Record</option>
  <option value="booking">Booking Related</option>
  <option value="contract">Contract</option>
  <option value="general">General</option>
  <option value="other">Other</option>
  </select>
  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
  <MoreVertical className="size-4 rotate-90" />
  </div>
  </div>
  </div>

  <div>
  <label className="block text-sm font-semibold text-stone-700 mb-2">
  Title <span className="text-stone-400 font-normal">(Optional)</span>
  </label>
  <input
  type="text"
  name="title"
  placeholder="e.g. National ID Front"
  className="w-full px-4 py-3 bg-stone-50 ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-stone-700 font-medium placeholder:text-stone-400"
  />
  </div>

  <div>
  <label className="block text-sm font-semibold text-stone-700 mb-2">
  File
  </label>
  <div className="relative group">
  <input
  ref={renewFileInputRef}
  type="file"
  name="file"
  id="renew-file-upload"
  required
  onChange={handleRenewFileChange}
  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
  className="absolute inset-0 size-full opacity-0 cursor-pointer z-10"
  />
  <div className="w-full px-4 py-8 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 group-hover:bg-stone-100 transition-colors flex flex-col items-center justify-center text-center">
  {renewFileName ? (
  <>
  <div className="size-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-2">
  <File className="size-6" />
  </div>
  <p className="text-sm font-semibold text-stone-900 line-clamp-1 px-4">{renewFileName}</p>
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
  onClick={() => setShowRenewModal(false)}
  className="flex-1 px-5 py-3 ring-1 ring-stone-200/50 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
  >
  Cancel
  </button>
  <button
  type="submit"
  disabled={renewing}
  className="flex-1 px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
  >
  {renewing ? (
  <>
  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  Renewing…
  </>
  ) : (
  <>Renew Document</>
  )}
  </button>
  </div>
  </form>
   </div>
   </div>
   </>
   )}

  <motion.div variants={itemVariants} className="text-center text-xs text-stone-400 mt-12 pb-4">
 <p>
 Your documents are encrypted and stored securely. Only authorized personnel can view your verification documents.
 </p>
 </motion.div>
 </motion.div>
 );
}
