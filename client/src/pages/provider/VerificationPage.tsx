

import { useState, useEffect , useRef } from 'react';
import { Upload, FileText, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadVerificationDocument } from '@/lib/api';
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from '@/lib/errors';




export default function VerificationPage() {
 const { user } = useAuth();
 const [documents, setDocuments] = useState<any[]>([]);
 const [uploading, setUploading] = useState(false);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 loadDocuments();
 }, []);

 const loadDocuments = async () => {
 try {

 } catch (error) {
 console.error("Failed to load documents", error);
 } finally {
 setLoading(false);
 }
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // Basic validation
 if (file.size > 5 * 1024 * 1024) {
 toast.error("File size must be less than 5MB");
 return;
 }

 const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
 if (!allowedTypes.includes(file.type)) {
 toast.error("Format not supported. Please use JPG, PNG or PDF.");
 return;
 }

 setUploading(true);
 try {
 await uploadVerificationDocument(file, type);
 toast.success("Document uploaded successfully");
 await loadDocuments();
 } catch (error) {
 console.error(error);
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

 const getStatusIcon = (status: string) => {
 switch (status) {
 case 'verified': return <CheckCircle className="size-5 text-green-500" />;
 case 'pending': return <Clock className="size-5 text-yellow-500" />;
 case 'rejected': return <XCircle className="size-5 text-red-500" />;
 default: return <Clock className="size-5 text-stone-400" />;
 }
 };

 const requiredDocs = [
 { type: 'govt_id', label: 'Government ID', description: 'Passport or Emirates ID' },
 { type: 'professional_license', label: 'Professional License', description: 'DHA / MOH License' },
 { type: 'certificate', label: 'Certifications', description: 'Additional qualifications (Optional)' },
 ];

 return (
 <div className="max-w-4xl mx-auto py-8 px-4">
 <div className="mb-8">
 <h1 className="text-3xl font-semibold text-stone-900">Verification Center</h1>
 <p className="mt-2 text-stone-600">
 To maintain our high standards of care, we require all providers to verify their identity and qualifications.
 </p>

 </div>

 <div className="grid gap-6">
 {requiredDocs.map((docType) => {
 const uploadedDoc = documents.find(d => d.type === docType.type);

 return (
 <div key={docType.type} className="bg-white rounded-xl border p-6 shadow-sm">
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-lg font-semibold text-stone-900">{docType.label}</h3>
 {uploadedDoc && (
 <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${uploadedDoc.status === 'verified' ? 'bg-green-100 text-green-800' : uploadedDoc.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
 {uploadedDoc.status.toUpperCase()}
 </span>
 )}
 </div>
 <p className="text-sm text-stone-500 mt-1">{docType.description}</p>

 {uploadedDoc?.rejectionReason && (
 <p className="mt-2 text-sm text-red-600">
 Rejection reason: {uploadedDoc.rejectionReason}
 </p>
 )}
 </div>

 <div>
 {uploadedDoc && uploadedDoc.status === 'verified' ? (
 <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg">
 <CheckCircle className="mr-2 size-5" />
 <span>Verified</span>
 </div>
 ) : (
 <label className={`flex items-center cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${uploading ? 'bg-stone-100 text-stone-400' : 'bg-teal-600 text-white hover:bg-teal-500'}`}>
 <Upload className="mr-2 size-4" />
 {uploading ? "Uploading..." : (uploadedDoc ? "Upload New Version" : "Upload Document")}
 <input
 type="file"
 className="hidden"
 accept=".jpg,.jpeg,.png,.pdf"
 onChange={(e) => handleFileUpload(e, docType.type)}
 disabled={uploading}
 />
 </label>
 )}
 </div>
 </div>

 {/* File History / Preview */}
 {uploadedDoc && (
 <div className="mt-4 p-3 bg-stone-50 rounded-lg flex items-center justify-between">
 <div className="flex items-center">
 <FileText className="size-5 text-stone-400 mr-3" />
 <div className="text-sm">
 <p className="font-medium text-stone-700">document_upload_{uploadedDoc.created_at?.slice(0, 10)}.pdf</p>
 <p className="text-stone-500 text-xs">Uploaded on {new Date(uploadedDoc.createdAt).toLocaleDateString()}</p>
 </div>
 </div>
 <div className="text-sm text-stone-500">
 {uploadedDoc.status === 'pending' && <span className="flex items-center"><Clock className="size-4 mr-1" /> Pending Review</span>}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start">
 <Clock className="size-5 mr-3 flex-shrink-0" />
 <p>
 Once all required documents are uploaded, our team will review your application.
 This process typically takes 24-48 hours. You will receive a notification once verified.
 </p>
 </div>
 </div>
 );
}
