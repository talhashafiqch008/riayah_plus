
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import {
 Calendar, Clock, User, Search, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { getAdminBookings } from '@/lib/api';
import { AdminPagination } from '@/components/admin/AdminPagination';

interface Booking {
 id: number;
 client_id: number;
 provider_id: number;
 booking_type: string;
 scheduled_at: string;
 start_time: string;
 end_time: string;
 duration_hours: number;
 hourly_rate: string;
 total_amount: string;
 currency: string;
 status: string;
 provider_status: string;
 notes?: string;
 provider_notes?: string;
 service_type: string;
 consultation_method?: string;
 client_name?: string;
 provider_name?: string;
 client?: {
 id: number;
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 role: string;
 };
 provider?: {
 id: number;
 user_id: number;
 public_profile_id: string;
 provider_type: string;
 user?: {
 firstName: string;
 lastName: string;
 };
 };
 careRecipient?: { firstName: string; lastName: string };
 service?: { name: string };
}

export default function AdminBookingsPage() {
 const navigate = useNavigate();
 const [bookings, setBookings] = useState<Booking[]>([]);
 const [pagination, setPagination] = useState({
 currentPage: 1,
 totalPages: 1,
 totalItems: 0,
 perPage: 20,
 });
 const [searchQuery, setSearchQuery] = useState("");
 const [debouncedSearch, setDebouncedSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState("all");
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
 return () => clearTimeout(timer);
 }, [searchQuery]);

 useEffect(() => {
 fetchBookings();
 }, []);

 const handleBookingClick = (bookingId: number) => {
 navigate(`/admin/bookings/${bookingId}`);
 };

 const fetchBookings = async (page = 1) => {
 try {
 setLoading(true);
 const data: unknown = await getAdminBookings({
 page,
 perPage: pagination.perPage,
 status: statusFilter === 'all' ? undefined : statusFilter,
 });

 let bookingsList: Booking[] = [];
 let meta = { total: 0, page: 1, per_page: 20, last_page: 1 };

 if (Array.isArray(data)) {
 bookingsList = data as Booking[];
 } else if (typeof data === 'object' && data !== null) {
 const response = data as Record<string, unknown>;
 if (Array.isArray(response.bookings)) {
 bookingsList = response.bookings as Booking[];
 } else if (Array.isArray(response.data)) {
 bookingsList = response.data as Booking[];
 } else if (Array.isArray((response.data as Record<string, unknown>)?.items)) {
 bookingsList = ((response.data as Record<string, unknown>).items as Booking[]);
 meta = (response.data as Record<string, unknown>).meta as typeof meta || meta;
 }
 }

 setBookings(bookingsList);
 setPagination({
 currentPage: meta.page,
 totalPages: meta.last_page,
 totalItems: meta.total,
 perPage: meta.per_page,
 });
 } catch (error) {
 console.error("Failed to fetch bookings:", error);
 setBookings([]);
 } finally {
 setLoading(false);
 }
 };

 const handlePageChange = (page: number) => {
 fetchBookings(page);
 };

 const filteredBookings = bookings.filter((booking) => {
 const matchesSearch = !debouncedSearch ||
 booking.client_id.toString().includes(debouncedSearch) ||
 booking.provider_id.toString().includes(debouncedSearch) ||
 booking.service_type?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 booking.client_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 booking.provider_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 booking.client?.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 booking.client?.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 booking.provider?.user?.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 booking.provider?.user?.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase());

 const matchesStatus = statusFilter === "all" ||
 (statusFilter === 'pending' ? (booking.status === 'pending' || booking.status === 'pending_payment') : booking.status === statusFilter);
 return matchesSearch && matchesStatus;
 });

 const getStatusStyle = (status: string) => {
 const normalizedStatus = status?.toLowerCase();
 switch (normalizedStatus) {
 case "confirmed":
 return { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle, border: "border-emerald-100" };
 case "pending":
 case "pending_payment":
 return { bg: "bg-amber-50", text: "text-amber-700", icon: Clock, border: "border-amber-100" };
 case "completed":
 return { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle, border: "border-blue-100" };
 case "cancelled":
 return { bg: "bg-red-50", text: "text-red-700", icon: XCircle, border: "border-red-100" };
 default:
 return { bg: "bg-stone-50", text: "text-stone-700", icon: AlertCircle, border: "border-stone-100" };
 }
 };

 const formatDate = (dateStr: string) => {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
 };

 const formatTime = (dateStr: string) => {
 const d = new Date(dateStr);
 return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
 };

 return (
 <div className="min-h-screen pb-20">
 {/* Header Section */}
 <div className="bg-white border-b border-stone-200 sticky top-0 z-30">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-semibold text-stone-900 tracking-tight flex items-center gap-2">
 <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
 <Calendar className="size-6" />
 </span>
 Bookings Management
 </h1>
 <p className="text-sm text-stone-500 mt-1 ml-12 font-medium">
 Manage appointments, schedules, and service requests
 </p>
 </div>
 </div>

 {/* Filters Toolbar */}
 <div className="mt-8 flex flex-col md:flex-row gap-4">
 <div className="flex-1 relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-teal-500 transition-colors" size={20} />
 <input
 type="text"
 placeholder="Search by name, service, or ID&hellip;"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
 />
 </div>
 <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
 {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
 <button
 key={status}
 onClick={() => setStatusFilter(status)}
 className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${statusFilter === status ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50' }`}
 >
 {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 text-stone-400">
 <div className="size-10 border-4 border-stone-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
 <p className="font-medium">Loading bookings&hellip;</p>
 </div>
 ) : filteredBookings.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-stone-200">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mb-4">
 <Search className="size-8 text-stone-300" />
 </div>
 <h3 className="text-lg font-semibold text-stone-900">No bookings found</h3>
 <p className="text-stone-500 text-sm mt-1">Try adjusting your filters or search query.</p>
 </div>
 ) : (
 <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-stone-50 text-xs uppercase text-stone-500 font-semibold sticky top-0">
 <tr>
 <th className="px-4 py-3">Booking ID</th>
 <th className="px-4 py-3">Date & Time</th>
 <th className="px-4 py-3">Client</th>
 <th className="px-4 py-3">Provider</th>
 <th className="px-4 py-3">Service</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3 text-right">Amount</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {filteredBookings.map((booking) => {
 const style = getStatusStyle(booking.status);
 const StatusIcon = style.icon;

 return (
 <tr
 key={booking.id}
 onClick={() => handleBookingClick(booking.id)}
 className="hover:bg-stone-50/50 transition-colors cursor-pointer"
 >
 <td className="px-4 py-3">
 <span className="font-medium text-stone-900">#{booking.id}</span>
 </td>
 <td className="px-4 py-3 whitespace-nowrap">
 <div className="text-stone-900 font-medium">{formatDate(booking.scheduled_at)}</div>
 <div className="text-stone-500 text-xs">{formatTime(booking.scheduled_at)}</div>
 </td>
 <td className="px-4 py-3">
 <div className="font-medium text-stone-900">
 {booking.client_name || (booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : `Client #${booking.client_id}`)}
 </div>
 </td>
 <td className="px-4 py-3">
 <div className="text-stone-700">
 {booking.provider_name || (booking.provider?.user ? `${booking.provider.user.firstName} ${booking.provider.user.lastName}` : `Provider #${booking.provider_id}`)}
 </div>
 </td>
 <td className="px-4 py-3">
 <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 uppercase">
 {booking.service_type || booking.service?.name || 'Service'}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
 <StatusIcon size={10} />
 {booking.status}
 </span>
 </td>
 <td className="px-4 py-3 text-right font-medium text-stone-900">
 {booking.total_amount ? `${booking.currency || '$'} ${booking.total_amount}` : '—'}
 </td>
 <td className="px-4 py-3 text-right">
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleBookingClick(booking.id);
 }}
 className="px-3 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
 >
 Details
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 <AdminPagination
 currentPage={pagination.currentPage}
 totalPages={pagination.totalPages}
 totalItems={pagination.totalItems}
 perPage={pagination.perPage}
 onPageChange={handlePageChange}
 />
 </div>
 )}
 </div>
 </div>
 );
}
