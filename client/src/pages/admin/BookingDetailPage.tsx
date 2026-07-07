
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminBookingDetails } from '@/lib/api';
import {
 Calendar, Clock, User, ArrowLeft, Mail, Phone, MapPin,
 CheckCircle, XCircle, AlertCircle, FileText, DollarSign,
 Briefcase, Video, Globe, Stethoscope, Languages, Sun, MessageCircle
} from "lucide-react";
import { m, LazyMotion, domAnimation } from "framer-motion";

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
 meeting_link?: string;
 video_room_id?: string;
 created_at: string;

 // Flattened fields from API
 client_name?: string;
 provider_name?: string;

 // Nested relation objects
 client?: {
 id: number;
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 role: string;
 country?: string;
 };
 provider?: {
 id: number;
 user_id: number;
 public_profile_id: string;
 provider_type: string;
 specialties?: string[];
 user?: {
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 country?: string;
 };
 };
}

const renderNoteContent = (content: string) => {
 try {
 const parsed = JSON.parse(content);
 if (typeof parsed === 'object' && parsed !== null) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100">
 {Object.entries(parsed).map(([key, value]) => {
 let Icon = FileText;
 if (key.includes('city') || key.includes('location')) Icon = MapPin;
 if (key.includes('specialization')) Icon = Stethoscope;
 if (key.includes('gender')) Icon = User;
 if (key.includes('lang')) Icon = Languages;
 if (key.includes('time') || key.includes('preference')) Icon = Sun;
 if (key.includes('source')) Icon = MessageCircle;

 return (
 <div key={key} className="flex items-start gap-3">
 <div className="mt-1 p-1.5 bg-white rounded-lg text-teal-600 shadow-sm border border-stone-100">
 <Icon size={14} />
 </div>
 <div>
 <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
 {key.replace(/_/g, " ")}
 </p>
 <p className="text-sm font-bold text-stone-800 capitalize">
 {String(value)}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 );
 }
 } catch (e) {
 // Not a JSON string
 }

 return (
 <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-stone-600 text-sm font-medium leading-relaxed">
 {content}
 </div>
 );
};

export default function AdminBookingDetailsPage() {
 const params = useParams();
 const navigate = useNavigate();
 const [booking, setBooking] = useState<Booking | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (params.id) {
 fetchBookingDetails(params.id as string);
 }
 }, [params.id]);

 const fetchBookingDetails = async (id: string) => {
 try {
 const data = await getAdminBookingDetails(id);
 // Handle if data is wrapped in { data: ... } or just the object
 const bookingData = data.data || data;
 setBooking(bookingData);
 } catch (error) {
 console.error("Failed to fetch booking details:", error);
 } finally {
 setLoading(false);
 }
 };

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

 if (loading) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
 <div className="size-10 border-4 border-stone-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
 <p className="text-stone-500 font-medium">Loading booking details…</p>
 </div>
 );
 }

 if (!booking) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center text-stone-500">
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Booking Not Found</h2>
 <button onClick={() => navigate(-1)} className="text-teal-600 hover:text-teal-700 font-medium">
 Go Back
 </button>
 </div>
 );
 }

 const { bg, text, icon: StatusIcon, border } = getStatusStyle(booking.status);

 return (
 <div className="min-h-screen bg-stone-50/50 pb-20">
 {/* Header */}
 <div className="bg-white border-b border-stone-200 sticky top-0 z-30">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-4 text-sm font-bold"
 >
 <ArrowLeft size={16} />
 Back to Bookings
 </button>

 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
 Booking #{booking.id}
 </h1>
 <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5 border ${bg} ${text} ${border}`}>
 <StatusIcon size={14} />
 {booking.status}
 </span>
 </div>
 <p className="text-stone-500 font-medium flex items-center gap-2">
 Created on {new Date(booking.created_at).toLocaleDateString()}
 </p>
 </div>

 {booking.total_amount && (
 <div className="bg-stone-900 text-white px-6 py-3 rounded-2xl shadow-lg shadow-stone-900/10">
 <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">Total Amount</p>
 <p className="text-2xl font-black flex items-center gap-1">
 {booking.currency || "SAR"} {booking.total_amount}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

 {/* Main Content - Left Column */}
 <div className="lg:col-span-2 space-y-6">

 {/* Schedule Card */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
 >
 <h2 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Calendar className="text-teal-500" size={20} />
 Schedule & Service
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase mb-1">Date & Time</p>
 <p className="text-stone-900 font-bold text-lg mb-1">
 {new Date(booking.scheduled_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
 </p>
 <p className="text-stone-600 font-medium flex items-center gap-2">
 <Clock size={16} />
 {booking.start_time} - {booking.end_time} ({booking.duration_hours} hr{booking.duration_hours > 1 ? 's' : ''})
 </p>
 </div>

 <div className="space-y-4">
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase mb-1">Service Type</p>
 <div className="flex items-center gap-2">
 {booking.service_type === 'online' ? <Video size={18} className="text-blue-500" /> : <Briefcase size={18} className="text-amber-500" />}
 <span className="font-bold text-stone-900 capitalize">{booking.service_type}</span>
 </div>
 </div>
 {booking.consultation_method && (
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase mb-1">Method</p>
 <span className="font-medium text-stone-700 capitalize">{booking.consultation_method}</span>
 </div>
 )}
 </div>
 </div>

 {booking.meeting_link && (
 <div className="mt-6 pt-6 border-t border-stone-100">
 <p className="text-xs font-bold text-stone-400 uppercase mb-2">Meeting Link</p>
 <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 p-3 rounded-xl border border-blue-100 transition-colors">
 <Video size={18} />
 Join Meeting Room
 </a>
 </div>
 )}
 </m.div>

 {/* Notes Card */}
 {(booking.notes || booking.provider_notes) && (
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
 >
 <h2 className="text-lg font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <FileText className="text-teal-500" size={20} />
 Notes
 </h2>

 <div className="space-y-6">
 {booking.notes && (
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase mb-2">Client Notes</p>
 {renderNoteContent(booking.notes)}
 </div>
 )}
 {booking.provider_notes && (
 <div>
 <p className="text-xs font-bold text-stone-400 uppercase mb-2">Provider Notes</p>
 {renderNoteContent(booking.provider_notes)}
 </div>
 )}
 </div>
 </m.div>
 )}
 </div>

 {/* Right Column - People */}
 <div className="space-y-6">

 {/* Client Card */}
 <m.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.2 }}
 className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
 >
 <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Client</h2>
 <div className="flex items-center gap-4 mb-6">
 <div className="size-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-black text-lg">
 {booking.client_name?.charAt(0) || booking.client?.firstName.charAt(0) || "C"}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">
 {booking.client_name || (booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : `Client #${booking.client_id}`)}
 </h3>
 <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Care Recipient</span>
 </div>
 </div>

 {booking.client && (
 <div className="space-y-3">
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <Mail size={16} className="text-stone-400" />
 <a href={`mailto:${booking.client.email}`} className="hover:text-teal-600 transition-colors">{booking.client.email}</a>
 </div>
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <Phone size={16} className="text-stone-400" />
 <a href={`tel:${booking.client.phone}`} className="hover:text-teal-600 transition-colors">{booking.client.phone}</a>
 </div>
 {booking.client.country && (
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <Globe size={16} className="text-stone-400" />
 <span>{booking.client.country}</span>
 </div>
 )}
 </div>
 )}
 </m.div>

 {/* Provider Card */}
 <m.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.3 }}
 className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
 >
 <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Provider</h2>
 <div className="flex items-center gap-4 mb-6">
 <div className="size-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center font-black text-lg">
 {booking.provider_name?.charAt(0) || booking.provider?.user?.firstName.charAt(0) || "P"}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">
 {booking.provider_name || (booking.provider?.user ? `${booking.provider.user.firstName} ${booking.provider.user.lastName}` : `Provider #${booking.provider_id}`)}
 </h3>
 <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full capitalize">
 {booking.provider?.provider_type || "Provider"}
 </span>
 </div>
 </div>

 {booking.provider && (
 <div className="space-y-4">
 {booking.provider.specialties && (
 <div className="flex flex-wrap gap-2">
 {booking.provider.specialties.map((spec: string | { name?: string }) => (
 <span key={typeof spec === 'string' ? spec : spec.name || 'unknown'} className="text-xs font-bold px-2 py-1 bg-stone-100 text-stone-600 rounded-lg">
 {typeof spec === 'string' ? spec : spec.name || 'Unknown specialty'}
 </span>
 ))}
 </div>
 )}

 {booking.provider.user && (
 <div className="space-y-3 pt-2 border-t border-stone-100">
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <Mail size={16} className="text-stone-400" />
 <a href={`mailto:${booking.provider.user.email}`} className="hover:text-teal-600 transition-colors">{booking.provider.user.email}</a>
 </div>
 <div className="flex items-center gap-3 text-sm text-stone-600">
 <Phone size={16} className="text-stone-400" />
 <a href={`tel:${booking.provider.user.phone}`} className="hover:text-teal-600 transition-colors">{booking.provider.user.phone}</a>
 </div>
 </div>
 )}

 <button
 onClick={() => navigate(`/admin/providers/${booking.provider?.public_profile_id}`)}
 className="w-full mt-2 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 py-2 rounded-lg transition-colors"
 >
 View Full Profile
 </button>
 </div>
 )}
 </m.div>

 </div>
 </div>
 </div>
 </div>
 );
}
