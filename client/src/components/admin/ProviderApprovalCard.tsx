/**
 * Provider Approval Card Component
 * Displays provider details for admin approval
 */


import { User, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

interface Provider {
 id: string;
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 verificationStatus: string;
 createdAt: string;
 documents?: Array<{ id?: string; type?: string }>;
}

interface ProviderApprovalCardProps {
 provider: Provider;
 onApprove: (id: string) => void;
 onReject: (id: string) => void;
}

export function ProviderApprovalCard({ provider, onApprove, onReject }: ProviderApprovalCardProps) {
 const [loading, setLoading] = useState(false);
 const [showRejectModal, setShowRejectModal] = useState(false);
 const [rejectReason, setRejectReason] = useState('');

 const handleApprove = async () => {
 setLoading(true);
 try {
 await client.post(`/admin/providers/${provider.id}/approve`, { notes: 'Approved by admin' });
 toast.success('Provider approved successfully');
 onApprove(provider.id);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to approve provider');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to approve provider');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleReject = async () => {
 if (!rejectReason.trim()) {
 toast.error('Please provide a reason for rejection');
 return;
 }

 setLoading(true);
 try {
 await client.post(`/admin/providers/${provider.id}/reject`, { reason: rejectReason });
 toast.success('Provider rejected');
 onReject(provider.id);
 setShowRejectModal(false);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to reject provider');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to reject provider');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <>
 <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-start gap-4">
 <div className="size-16 bg-teal-100 rounded-full flex items-center justify-center">
 <User className="size-8 text-teal-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">
 {provider.firstName} {provider.lastName}
 </h3>
 <p className="text-sm text-stone-600">{provider.email}</p>
 <p className="text-sm text-stone-600">{provider.phone}</p>
 </div>
 </div>
 <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
 Pending Review
 </span>
 </div>

 <div className="mb-4">
 <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
 <FileText className="size-4" />
 Documents
 </h4>
 <div className="space-y-2">
 {provider.documents && provider.documents.length > 0 ? (
 provider.documents.map((doc, index) => (
 <div key={doc.id || doc.type || `doc-${index}`} className="flex items-center gap-2 text-sm text-stone-600">
 <CheckCircle className="size-4 text-green-600" />
 <span>{doc.type || `Document ${index + 1}`}</span>
 </div>
 ))
 ) : (
 <div className="flex items-center gap-2 text-sm text-stone-500">
 <AlertCircle className="size-4" />
 <span>No documents uploaded</span>
 </div>
 )}
 </div>
 </div>

 <div className="flex gap-3">
 <Button
 onClick={handleApprove}
 disabled={loading}
 className="flex-1 bg-green-600 hover:bg-green-700"
 >
 <CheckCircle className="size-4 mr-2" />
 Approve
 </Button>
 <Button
 onClick={() => setShowRejectModal(true)}
 disabled={loading}
 variant="outline"
 className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
 >
 <XCircle className="size-4 mr-2" />
 Reject
 </Button>
 </div>
 </div>

 {/* Reject Modal */}
 {showRejectModal && (
 <div className="fixed inset-0 bg-stone-950 bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Reject Provider</h3>
 <p className="text-sm text-stone-600 mb-4">
 Please provide a reason for rejecting this provider application.
 </p>
 <textarea
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder="Enter rejection reason..."
 rows={4}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
 />
 <div className="flex gap-3">
 <Button
 onClick={() => setShowRejectModal(false)}
 variant="outline"
 className="flex-1"
 disabled={loading}
 >
 Cancel
 </Button>
 <Button
 onClick={handleReject}
 className="flex-1 bg-red-600 hover:bg-red-700"
 disabled={loading}
 >
 {loading ? 'Rejecting...' : 'Confirm Rejection'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </>
 );
}
