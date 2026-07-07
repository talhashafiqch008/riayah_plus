
import { useState, useEffect, useCallback, useMemo , useRef } from 'react';
import {
 FileText, CheckCircle, XCircle, Search,
 Loader2, Calendar, User, Eye, Clock, AlertTriangle,
 CircleCheck, CircleX, Inbox
} from "lucide-react";
import {
 getPendingDocumentRequests,
 getAdminDocumentRequests,
 approveDocumentRequest,
 rejectDocumentRequest,
} from "@/lib/api";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { isApiError } from "@/lib/errors";

type DocumentStatus = "pending" | "approved" | "rejected" | "all";

interface DocumentRequestUser {
 id?: number;
 firstName?: string;
 lastName?: string;
 email?: string;
 name?: string;
}

interface DocumentRequest {
 id: string | number;
 user_id?: number;
 user?: DocumentRequestUser;
 file_name?: string;
 title?: string;
 document_type?: string;
 type?: string;
 description?: string;
 status: "pending" | "approved" | "rejected";
 created_at?: string;
 updated_at?: string;
 uploaded_at?: string;
 approved_at?: string;
 rejected_at?: string;
 admin_notes?: string;
 rejection_reason?: string;
 url?: string;
 file_url?: string;
}

function normalizeDocumentRequests(data: unknown): DocumentRequest[] {
 if (Array.isArray(data)) {
 return data as DocumentRequest[];
 }
 if (typeof data === "object" && data !== null) {
 const response = data as Record<string, unknown>;
 if (Array.isArray(response.data)) {
 return response.data as DocumentRequest[];
 }
 if (Array.isArray(response.document_requests)) {
 return response.document_requests as DocumentRequest[];
 }
 if (Array.isArray(response.requests)) {
 return response.requests as DocumentRequest[];
 }
 }
 return [];
}

function getRequestFileName(req: DocumentRequest): string {
 return req.file_name || req.title || "Unnamed file";
}

function getRequestType(req: DocumentRequest): string {
 const raw = req.document_type || req.type || "document";
 return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRequestDate(req: DocumentRequest): string {
 return req.created_at || req.updated_at || req.uploaded_at || "";
}

function getUserName(req: DocumentRequest): string {
 if (req.user) {
 const { firstName, lastName, name } = req.user;
 if (firstName && lastName) return `${firstName} ${lastName}`;
 if (firstName) return firstName;
 if (name) return name;
 }
 return `User #${req.user_id ?? req.id}`;
}

function getUserEmail(req: DocumentRequest): string {
 return req.user?.email || "";
}

function isToday(dateStr: string | undefined): boolean {
 if (!dateStr) return false;
 const d = new Date(dateStr);
 const now = new Date();
 return (
 d.getFullYear() === now.getFullYear() &&
 d.getMonth() === now.getMonth() &&
 d.getDate() === now.getDate()
 );
}

function formatDateTime(dateStr: string | undefined): string {
 if (!dateStr) return "—";
 try {
 return new Date(dateStr).toLocaleString(undefined, {
 year: "numeric",
 month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 });
 } catch {
 return dateStr;
 }
}

export default function AdminDocumentRequestsPage() {
 const [requests, setRequests] = useState<DocumentRequest[]>([]);
 const [pagination, setPagination] = useState({
 currentPage: 1,
 totalPages: 1,
 totalItems: 0,
 perPage: 20,
 });
 const [filteredStatus, setFilteredStatus] = useState<DocumentStatus>("pending");
 const [searchQuery, setSearchQuery] = useState("");
 const [debouncedSearch, setDebouncedSearch] = useState("");
 const [loading, setLoading] = useState(true);

 const [approveModalOpen, setApproveModalOpen] = useState(false);
 const [rejectModalOpen, setRejectModalOpen] = useState(false);
 const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
 const [adminNotes, setAdminNotes] = useState("");
 const [rejectionReason, setRejectionReason] = useState("");
 const [actionLoading, setActionLoading] = useState(false);

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
 return () => clearTimeout(timer);
 }, [searchQuery]);

 const fetchRequests = useCallback(async (page = 1) => {
 setLoading(true);
 try {
 let data: unknown;
 const params = { page, perPage: pagination.perPage };
 if (filteredStatus === "pending") {
 data = await getPendingDocumentRequests(params);
 } else if (filteredStatus === "all") {
 data = await getAdminDocumentRequests();
 } else {
 data = await getAdminDocumentRequests(filteredStatus);
 }

 let requestsList = normalizeDocumentRequests(data);
 let meta = { total: requestsList.length, page: 1, per_page: 20, last_page: 1 };

 if (typeof data === 'object' && data !== null) {
 const response = data as Record<string, unknown>;
 if (typeof response.data === 'object' && response.data !== null) {
 const dataObj = response.data as Record<string, unknown>;
 if (Array.isArray(dataObj.items)) {
 requestsList = dataObj.items as DocumentRequest[];
 meta = (dataObj.meta as typeof meta) || meta;
 }
 }
 }

 setRequests(requestsList);
 setPagination({
 currentPage: meta.page,
 totalPages: meta.last_page,
 totalItems: meta.total,
 perPage: meta.per_page,
 });
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || "Failed to load document requests");
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error("Failed to load document requests");
 }
 setRequests([]);
 } finally {
 setLoading(false);
 }
 }, [filteredStatus, pagination.perPage]);

 const handlePageChange = useCallback((page: number) => {
 fetchRequests(page);
 }, [fetchRequests]);

 useEffect(() => {
 fetchRequests();
 }, [fetchRequests]);

 const stats = useMemo(() => {
 const pending = requests.filter((r) => r.status === "pending").length;
 const approvedToday = requests.filter(
 (r) => r.status === "approved" && isToday(r.approved_at || r.updated_at)
 ).length;
 const rejectedToday = requests.filter(
 (r) => r.status === "rejected" && isToday(r.rejected_at || r.updated_at)
 ).length;
 return { pending, approvedToday, rejectedToday };
 }, [requests]);

 const filteredRequests = useMemo(() => {
 if (!debouncedSearch.trim()) return requests;
 const term = debouncedSearch.toLowerCase();
 return requests.filter((req) => {
 const userName = getUserName(req).toLowerCase();
 const email = getUserEmail(req).toLowerCase();
 const fileName = getRequestFileName(req).toLowerCase();
 const docType = getRequestType(req).toLowerCase();
 return (
 userName.includes(term) ||
 email.includes(term) ||
 fileName.includes(term) ||
 docType.includes(term) ||
 req.id.toString().includes(term)
 );
 });
 }, [requests, debouncedSearch]);

 const openApproveModal = (req: DocumentRequest) => {
 setSelectedRequest(req);
 setAdminNotes("");
 setApproveModalOpen(true);
 };

 const openRejectModal = (req: DocumentRequest) => {
 setSelectedRequest(req);
 setRejectionReason("");
 setAdminNotes("");
 setRejectModalOpen(true);
 };

 const closeModals = () => {
 setApproveModalOpen(false);
 setRejectModalOpen(false);
 setSelectedRequest(null);
 setAdminNotes("");
 setRejectionReason("");
 };

 const handleApprove = async () => {
 if (!selectedRequest) return;
 setActionLoading(true);
 try {
 await approveDocumentRequest(
 selectedRequest.id,
 adminNotes.trim() || undefined
 );
 toast.success("Document request approved");
 setRequests((prev) =>
 prev.map((r) =>
 r.id === selectedRequest.id
 ? { ...r, status: "approved", approved_at: new Date().toISOString() }
 : r
 )
 );
 closeModals();
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || "Failed to approve request");
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error("Failed to approve request");
 }
 } finally {
 setActionLoading(false);
 }
 };

 const handleReject = async () => {
 if (!selectedRequest) return;
 if (!rejectionReason.trim()) {
 toast.error("Please provide a rejection reason");
 return;
 }
 setActionLoading(true);
 try {
 await rejectDocumentRequest(
 selectedRequest.id,
 rejectionReason.trim(),
 adminNotes.trim() || undefined
 );
 toast.success("Document request rejected");
 setRequests((prev) =>
 prev.map((r) =>
 r.id === selectedRequest.id
 ? { ...r, status: "rejected", rejected_at: new Date().toISOString() }
 : r
 )
 );
 closeModals();
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || "Failed to reject request");
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error("Failed to reject request");
 }
 } finally {
 setActionLoading(false);
 }
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case "approved":
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
 <CircleCheck className="size-3" />
 Approved
 </span>
 );
 case "rejected":
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
 <CircleX className="size-3" />
 Rejected
 </span>
 );
 default:
 return (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
 <Clock className="size-3" />
 Pending
 </span>
 );
 }
 };

 const statusTabs: { value: DocumentStatus; label: string }[] = [
 { value: "pending", label: "Pending" },
 { value: "approved", label: "Approved" },
 { value: "rejected", label: "Rejected" },
 { value: "all", label: "All" },
 ];

 return (
 <div className="min-h-screen pb-20">
 <div className="bg-white border-b border-stone-200 sticky top-0 z-30">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-stone-900 tracking-tight flex items-center gap-2">
 <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
 <FileText className="size-6" />
 </span>
 Document Requests
 </h1>
 <p className="text-sm text-stone-500 mt-1 ml-12 font-medium">
 Review and manage careseeker document upload requests
 </p>
 </div>
 </div>

 <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
 <div className="size-10 bg-amber-100 rounded-lg flex items-center justify-center">
 <Clock className="size-5 text-amber-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{stats.pending}</p>
 <p className="text-sm font-medium text-stone-500">Pending Requests</p>
 </div>
 </div>
 <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
 <div className="size-10 bg-emerald-100 rounded-lg flex items-center justify-center">
 <CheckCircle className="size-5 text-emerald-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{stats.approvedToday}</p>
 <p className="text-sm font-medium text-stone-500">Approved Today</p>
 </div>
 </div>
 <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
 <div className="size-10 bg-red-100 rounded-lg flex items-center justify-center">
 <XCircle className="size-5 text-red-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{stats.rejectedToday}</p>
 <p className="text-sm font-medium text-stone-500">Rejected Today</p>
 </div>
 </div>
 </div>

 <div className="mt-8 flex flex-col md:flex-row gap-4">
 <div className="flex-1 relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-teal-500 transition-colors" size={20} />
 <input
 type="text"
 placeholder="Search by user, file name, or document type..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
 />
 </div>
 <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
 {statusTabs.map((tab) => (
 <button
 key={tab.value}
 onClick={() => setFilteredStatus(tab.value)}
 className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${ filteredStatus === tab.value ? "bg-stone-900 text-white border-stone-900 shadow-md transform scale-105" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50" }`}
 >
 {tab.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 text-stone-400">
 <div className="size-10 border-4 border-stone-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
 <p className="font-medium animate-pulse">Loading requests…</p>
 </div>
 ) : filteredRequests.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mb-4">
 <Inbox className="size-8 text-stone-300" />
 </div>
 <h3 className="text-lg font-semibold text-stone-900">No requests found</h3>
 <p className="text-stone-500 text-sm mt-1">
 {debouncedSearch
 ? "Try adjusting your search query."
 : "All document requests have been reviewed."}
 </p>
 </div>
 ) : (
 <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-stone-50 border-b border-stone-200">
 <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
 Request
 </th>
 <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
 User
 </th>
 <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
 Type
 </th>
 <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
 Status
 </th>
 <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
 Uploaded
 </th>
 <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {filteredRequests.map((req) => (
 <tr
 key={req.id}
 className="hover:bg-stone-50/50 transition-colors"
 >
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className="size-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
 <FileText className="size-5 text-blue-600" />
 </div>
 <div>
 <p className="text-sm font-semibold text-stone-900">
 {getRequestFileName(req)}
 </p>
 {req.description && (
 <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
 {req.description}
 </p>
 )}
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <User className="size-4 text-stone-400 flex-shrink-0" />
 <div>
 <p className="text-sm font-medium text-stone-900">
 {getUserName(req)}
 </p>
 {getUserEmail(req) && (
 <p className="text-xs text-stone-500">
 {getUserEmail(req)}
 </p>
 )}
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <span className="text-sm text-stone-700 font-medium">
 {getRequestType(req)}
 </span>
 </td>
 <td className="px-6 py-4">
 {getStatusBadge(req.status)}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-1.5 text-sm text-stone-500">
 <Calendar className="size-3.5" />
 <span>
 {formatDateTime(getRequestDate(req))}
 </span>
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-end gap-2">
 {(req.url || req.file_url) && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 const url = req.url || req.file_url || "";
 if (url.startsWith("http")) {
 window.open(url, "_blank");
 } else {
 const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
 window.open(`${base}/uploads/${url}`, "_blank");
 }
 }}
 >
 <Eye className="size-3.5 mr-1.5" />
 View
 </Button>
 )}
 {req.status === "pending" && (
 <>
 <Button
 size="sm"
 onClick={() => openApproveModal(req)}
 className="bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <CheckCircle className="size-3.5 mr-1.5" />
 Approve
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => openRejectModal(req)}
 className="border-red-300 text-red-600 hover:bg-red-50"
 >
 <XCircle className="size-3.5 mr-1.5" />
 Reject
 </Button>
 </>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>

 {approveModalOpen && selectedRequest && (
 <div className="fixed inset-0 bg-stone-950/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
 <div className="flex items-center gap-3 mb-4">
 <div className="size-10 bg-emerald-100 rounded-full flex items-center justify-center">
 <CheckCircle className="size-5 text-emerald-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">
 Approve Request
 </h3>
 <p className="text-sm text-stone-500">
 {getRequestFileName(selectedRequest)}
 </p>
 </div>
 </div>
 <p className="text-sm text-stone-600 mb-4">
 This will move the document to permanent storage. You can add optional admin notes below.
 </p>
 <div className="mb-4">
 <label htmlFor="input-src-app-admin-documents-page-tsx-600-602" className="block text-sm font-medium text-stone-700 mb-1.5">
 Admin Notes <span className="text-stone-400 font-normal">(optional)</span>
 </label>
 <textarea
 value={adminNotes}
 onChange={(e) => setAdminNotes(e.target.value)}
 placeholder="Add any notes about this approval..."
 rows={3}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
 />
 </div>
 <div className="flex gap-3">
 <Button
 variant="outline"
 onClick={closeModals}
 className="flex-1"
 disabled={actionLoading}
 >
 Cancel
 </Button>
 <Button
 onClick={handleApprove}
 className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
 disabled={actionLoading}
 >
 {actionLoading ? (
 <Loader2 className="size-4 animate-spin mr-2" />
 ) : (
 <CheckCircle className="size-4 mr-2" />
 )}
 Confirm Approval
 </Button>
 </div>
 </div>
 </div>
 )}

 {rejectModalOpen && selectedRequest && (
 <div className="fixed inset-0 bg-stone-950/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
 <div className="flex items-center gap-3 mb-4">
 <div className="size-10 bg-red-100 rounded-full flex items-center justify-center">
 <AlertTriangle className="size-5 text-red-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">
 Reject Request
 </h3>
 <p className="text-sm text-stone-500">
 {getRequestFileName(selectedRequest)}
 </p>
 </div>
 </div>
 <p className="text-sm text-stone-600 mb-4">
 This will delete the document from temporary storage. A rejection reason is required.
 </p>
 <div className="mb-4">
 <label htmlFor="input-src-app-admin-documents-page-tsx-657-659" className="block text-sm font-medium text-stone-700 mb-1.5">
 Rejection Reason <span className="text-red-500">*</span>
 </label>
 <textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder="Explain why this request is being rejected..."
 rows={3}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
 />
 </div>
 <div className="mb-4">
 <label htmlFor="input-src-app-admin-documents-page-tsx-669-671" className="block text-sm font-medium text-stone-700 mb-1.5">
 Admin Notes <span className="text-stone-400 font-normal">(optional)</span>
 </label>
 <textarea
 value={adminNotes}
 onChange={(e) => setAdminNotes(e.target.value)}
 placeholder="Add any additional notes..."
 rows={2}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
 />
 </div>
 <div className="flex gap-3">
 <Button
 variant="outline"
 onClick={closeModals}
 className="flex-1"
 disabled={actionLoading}
 >
 Cancel
 </Button>
 <Button
 onClick={handleReject}
 className="flex-1 bg-red-600 hover:bg-red-700 text-white"
 disabled={actionLoading}
 >
 {actionLoading ? (
 <Loader2 className="size-4 animate-spin mr-2" />
 ) : (
 <XCircle className="size-4 mr-2" />
 )}
 Confirm Rejection
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
