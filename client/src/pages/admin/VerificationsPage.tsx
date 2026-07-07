
import { useState, useEffect , useRef } from 'react';
import {
 CheckCircle, XCircle, FileText, Loader2, Shield, Calendar
} from "lucide-react";
import { getPendingVerifications, verifyDocument } from '@/lib/api';
import toast from "react-hot-toast";
import { isApiError } from '@/lib/errors';

interface VerificationDocument {
 id: string;
 type: string;
 url?: string;
 createdAt: string;
 user?: {
 firstName?: string;
 lastName?: string;
 email?: string;
 };
}

export default function AdminVerificationsPage() {
 const [isLoading, setIsLoading] = useState(true);
 const [documents, setDocuments] = useState<VerificationDocument[]>([]);

 const loadDocuments = async () => {
 try {
 const docs = await getPendingVerifications();
 const docsList = docs?.data?.documents || docs?.documents || docs || [];
 setDocuments(Array.isArray(docsList) ? docsList : []);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load documents');
 }
 setDocuments([]);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadDocuments();
 }, []);

 const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
 try {
 await verifyDocument(id, status);
 // Remove from list or update status
 setDocuments(documents.filter(d => d.id !== id));
 toast.success(`Document ${status.toLowerCase()} successfully`);
 } catch (error) {
 console.error("Failed to verify document", error);
 if (isApiError(error)) {
 toast.error(error.message || 'Action failed');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Action failed');
 }
 }
 };

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-stone-50">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50">
 <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
 <div className="container mx-auto px-6 h-16 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-1.5 bg-stone-900 rounded-lg">
 <Shield className="size-5 text-white" />
 </div>
 <span className="font-bold text-stone-900">Admin Verification Console</span>
 </div>
 </div>
 </header>

 <main className="container mx-auto px-6 py-8">
 <h1 className="text-2xl font-semibold text-stone-900 mb-6">Pending Verifications</h1>

 {documents.length === 0 ? (
 <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
 <CheckCircle className="size-12 text-teal-500 mx-auto mb-3" />
 <h3 className="text-lg font-medium text-stone-900">All Caught Up!</h3>
 <p className="text-stone-500">There are no pending documents to review.</p>
 </div>
 ) : (
 <div className="grid gap-6">
 {documents.map((doc) => (
 <div key={doc.id} className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-blue-50 rounded-lg">
 <FileText className="size-6 text-blue-600" />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="font-semibold text-stone-900">{doc.type.replace(/_/g, ' ')}</span>
 <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">Pending</span>
 </div>
 <div className="text-sm text-stone-500 mb-2">
 User: {doc.user?.firstName} {doc.user?.lastName} ({doc.user?.email})
 </div>
 <div className="text-xs text-stone-400 flex items-center">
 <Calendar className="size-3 mr-1" />
 Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
 </div>

 {/* Document Preview Link */}
 <a
 href={(doc.url || '').startsWith('http') ? doc.url : `${import.meta.env.VITE_API_URL?.replace('/api', '')}/uploads/${doc.url}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-block mt-2 text-sm text-teal-600 hover:underline font-medium"
 >
 View Document
 </a>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={() => handleVerify(doc.id, 'REJECTED')}
 className="flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 font-medium transition-colors"
 >
 <XCircle className="size-4" />
 <span>Reject</span>
 </button>
 <button
 onClick={() => handleVerify(doc.id, 'VERIFIED')}
 className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors shadow-sm"
 >
 <CheckCircle className="size-4" />
 <span>Approve</span>
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </main>
 </div>
 );
}
