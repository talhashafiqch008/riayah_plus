
import { useState, useEffect , useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
 Users,
 UserPlus,
 Mail,
 Phone,
 Edit,
 Trash2,
 X,
 Loader2,
 Stethoscope,
 Briefcase,
 CheckCircle,
 Clock,
 XCircle,
 Sparkles,
 Shield,
 ShieldOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addAgencyStaff, deleteAgencyStaff, getAgencyStaff, getAgencyStaffRoles, updateAgencyStaff } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';




// Role display names
const ROLE_LABELS: Record<string, string> = {
 'NURSE': 'Nurse',
 'DOCTOR': 'Doctor',
 'ALLIED_HEALTH': 'Allied Health',
 'SUPPORT_WORKER': 'Support Worker',
 'PERSONAL_CARE_ASSISTANT': 'Personal Care Assistant',
 'COMPANION_CARER': 'Companion Carer',
};

interface StaffMember {
 id: string;
 user_id: string;
 firstName: string;
 lastName: string;
 email: string;
 phone: string;
 role: string;
 specialty: string | null;
 status: 'active' | 'inactive' | 'pending';
 created_at: string;
}

const statusConfig = {
 active: { label: 'Active', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
 inactive: { label: 'Inactive', icon: XCircle, color: 'bg-red-50 text-red-700 border-red-200' },
 pending: { label: 'Pending', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function StaffPage() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const [staff, setStaff] = useState<StaffMember[]>([]);
 const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);
 const [unauthorized, setUnauthorized] = useState(false);
 const [showModal, setShowModal] = useState(false);
 const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

 useEffect(() => {
 fetchData();
 }, []);

 const fetchData = async () => {
 try {
 setLoading(true);
 const [staffRes, rolesRes] = await Promise.all([
 getAgencyStaff(),
 getAgencyStaffRoles(),
 ]);

 setStaff(staffRes.data || []);
 setAllowedRoles(rolesRes.roles || []);
 } catch (error: unknown) {
 // If 403 — user is not an agency provider
 if (error && typeof error === 'object' && 'response' in error) {
 const err = error as { response?: { status?: number } };
 if (err.response?.status === 403) {
 setUnauthorized(true);
 } else {
 console.error('Failed to fetch staff data', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load staff data');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load staff data');
 }
 }
 } else {
 console.error('Failed to fetch staff data', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load staff data');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load staff data');
 }
 }
 } finally {
 setLoading(false);
 }
 };

 const handleEdit = (member: StaffMember) => {
 setEditingStaff(member);
 setShowModal(true);
 };

 const handleAdd = () => {
 setEditingStaff(null);
 setShowModal(true);
 };

 const handleDelete = async (id: string, name: string) => {
 if (!confirm(`Are you sure you want to remove ${name} from your staff?`)) return;

 try {
 await deleteAgencyStaff(id);
 toast.success('Staff member removed successfully');
 fetchData();
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to remove staff member');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to remove staff member');
 }
 }
 };

 const getRoleIcon = (role: string) => {
 if (['DOCTOR', 'NURSE', 'ALLIED_HEALTH'].includes(role)) return '🩺';
 if (['SUPPORT_WORKER', 'PERSONAL_CARE_ASSISTANT'].includes(role)) return '🤝';
 if (role === 'COMPANION_CARER') return '💙';
 return '👤';
 };

 // ── Unauthorized View ──
 if (!loading && unauthorized) {
 return (
 <div className="min-h-screen bg-stone-50/50 flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-white rounded-[2rem] p-10 shadow-xl shadow-stone-200/40 max-w-md w-full text-center"
 >
 <div className="size-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <ShieldOff className="size-10 text-red-400" />
 </div>
 <h2 className="text-2xl font-semibold text-stone-900 mb-3">Unauthorized Access</h2>
 <p className="text-stone-500 mb-8 leading-relaxed">
 This page is only available for agency and clinic providers. Individual providers cannot manage staff.
 </p>
 <button
 onClick={() => navigate('/provider/dashboard')}
 className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-bold"
 >
 Back to Dashboard
 </button>
 </m.div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50/50 p-4 sm:p-6 lg:p-8">
 <div className="max-w-7xl mx-auto">
 {/* Hero Header */}
 <m.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="mb-8"
 >
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <div className="p-3 bg-teal-600 rounded-2xl shadow-lg shadow-teal-200">
 <Stethoscope className="size-7 text-white" />
 </div>
 <div>
 <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900">My Staff</h1>
 <p className="text-stone-500 font-medium">Manage your clinic&apos;s healthcare team</p>
 </div>
 </div>
 </div>
 <m.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={handleAdd}
 className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-stone-900 text-white rounded-2xl hover:shadow-xl hover:shadow-stone-900/20 transition-all font-bold"
 >
 <UserPlus className="size-5" />
 Add Staff Member
 </m.button>
 </div>
 </m.div>

 {/* Info Banner */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="mb-8 bg-gradient-to-r from-teal-50 to-blue-50 rounded-[2rem] p-6 border border-teal-200"
 >
 <div className="flex items-start gap-4">
 <div className="p-3 bg-white rounded-xl shadow-sm">
 <Sparkles className="size-6 text-teal-600" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-stone-900 mb-3 text-lg">Staff Management</h3>
 <div className="grid sm:grid-cols-2 gap-3">
 {[
 { icon: Shield, text: 'Staff accounts are linked to your agency' },
 { icon: Briefcase, text: `Available roles: ${allowedRoles.map(r => ROLE_LABELS[r] || r).join(', ') || 'Loading…'}` },
 { icon: Users, text: 'Staff can accept bookings under your agency' },
 { icon: Stethoscope, text: 'Each staff member gets their own provider profile' },
 ].map((item) => (
 <div key={item.text} className="flex items-center gap-2 text-sm text-stone-700">
 <div className="p-1.5 bg-teal-100 rounded-lg flex-shrink-0">
 <item.icon className="size-3.5 text-teal-600" />
 </div>
 {item.text}
 </div>
 ))}
 </div>
 </div>
 </div>
 </m.div>

 {/* Loading */}
 {loading ? (
 <div className="flex items-center justify-center p-20">
 <div className="text-center">
 <Loader2 className="size-12 text-teal-600 animate-spin mx-auto mb-4" />
 <p className="text-stone-500 font-medium">Loading staff…</p>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 <AnimatePresence mode="popLayout">
 {staff.map((member, index) => {
 const status = statusConfig[member.status] || statusConfig.pending;
 const StatusIcon = status.icon;

 return (
 <m.div
 key={member.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 transition={{ delay: index * 0.05 }}
 className="group relative bg-white rounded-[2rem] p-6 border border-stone-100 shadow-xl shadow-stone-200/40 hover:shadow-2xl hover:shadow-stone-200/60 transition-all duration-300"
 >
 {/* Avatar & Info */}
 <div className="flex items-start gap-4 mb-5">
 <m.div whileHover={{ scale: 1.05, rotate: 5 }} className="relative">
 <div className="size-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
 {member.firstName?.[0]}{member.lastName?.[0]}
 </div>
 <div className="absolute -bottom-1 -right-1 text-2xl">
 {getRoleIcon(member.role)}
 </div>
 </m.div>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-stone-900 text-lg truncate">
 {member.firstName} {member.lastName}
 </h4>
 <p className="text-sm text-teal-600 font-semibold">
 {ROLE_LABELS[member.role] || member.role}
 </p>
 {member.specialty && (
 <p className="text-xs text-stone-400 mt-0.5">{member.specialty}</p>
 )}
 </div>
 </div>

 {/* Contact */}
 <div className="space-y-2.5 mb-5">
 <div className="flex items-center gap-3 text-sm">
 <div className="p-2 bg-stone-50 rounded-lg">
 <Mail className="size-4 text-stone-400" />
 </div>
 <span className="text-stone-600 truncate">{member.email}</span>
 </div>
 <div className="flex items-center gap-3 text-sm">
 <div className="p-2 bg-stone-50 rounded-lg">
 <Phone className="size-4 text-stone-400" />
 </div>
 <span className="text-stone-600">{member.phone}</span>
 </div>
 </div>

 {/* Status */}
 <div className="mb-5 pt-4 border-t border-stone-100">
 <div className="flex items-center justify-between">
 <span className="text-xs text-stone-500 font-bold uppercase tracking-wide">Status</span>
 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm border ${status.color}`}>
 <StatusIcon className="size-3.5" />
 {status.label}
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-2">
 <m.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => handleEdit(member)}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl transition-colors font-medium"
 >
 <Edit className="size-4" />
 Edit
 </m.button>
 <m.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => handleDelete(member.id, member.firstName)}
 className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
 >
 <Trash2 className="size-4" />
 </m.button>
 </div>
 </m.div>
 );
 })}

 {/* Add Card */}
 <m.button
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: staff.length * 0.05 }}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={handleAdd}
 className="bg-stone-50 hover:bg-stone-100 rounded-[2rem] p-8 border-2 border-dashed border-stone-300 hover:border-teal-400 flex flex-col items-center justify-center min-h-[320px] transition-all group"
 >
 <div className="size-16 bg-teal-100 group-hover:bg-teal-200 rounded-2xl flex items-center justify-center mb-4 transition-colors">
 <UserPlus className="size-8 text-teal-600" />
 </div>
 <p className="font-bold text-stone-900 text-lg mb-1">Add Staff Member</p>
 <p className="text-sm text-stone-500 text-center">Add a doctor, nurse, or<br />support worker to your team</p>
 </m.button>
 </AnimatePresence>

 {/* Empty State */}
 {staff.length === 0 && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="col-span-full"
 >
 <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-stone-200">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
 <Users className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No staff members yet</h3>
 <p className="text-stone-500 mb-6">Start building your healthcare team</p>
 <button
 onClick={handleAdd}
 className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-bold"
 >
 <UserPlus className="size-5" />
 Add Your First Staff Member
 </button>
 </div>
 </m.div>
 )}
 </div>
 )}
 </div>

 {/* Add/Edit Modal */}
 <AnimatePresence>
 {showModal && (
 <StaffModal
 initialData={editingStaff}
 allowedRoles={allowedRoles}
 onClose={() => setShowModal(false)}
 onSuccess={() => {
 setShowModal(false);
 fetchData();
 }}
 />
 )}
 </AnimatePresence>
 </div>
 );
}

function StaffModal({
 initialData,
 allowedRoles,
 onClose,
 onSuccess,
}: {
 initialData: StaffMember | null;
 allowedRoles: string[];
 onClose: () => void;
 onSuccess: () => void;
}) {
 const isEditing = !!initialData;
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 first_name: initialData?.firstName || '',
 last_name: initialData?.lastName || '',
 email: initialData?.email || '',
 phone: initialData?.phone || '',
 password: '',
 role: initialData?.role || (allowedRoles.length > 0 ? allowedRoles[0] : ''),
 specialty: initialData?.specialty || '',
 status: initialData?.status || 'active',
 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 if (isEditing && initialData) {
 const dataToUpdate: Record<string, unknown> = { ...formData };
 if (!dataToUpdate.password) delete dataToUpdate.password;
 await updateAgencyStaff(initialData.id, dataToUpdate);
 toast.success('Staff member updated successfully');
 } else {
 await addAgencyStaff(formData);
 toast.success('Staff member added successfully');
 }
 onSuccess();
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to save staff member');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to save staff member');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4"
 onClick={onClose}
 >
 <m.div
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
 >
 {/* Header */}
 <div className="bg-stone-900 p-6 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-teal-500/20 rounded-full blur-2xl" />
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-semibold mb-1">
 {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
 </h3>
 <p className="text-stone-300 text-sm">
 {isEditing ? 'Update staff information' : 'Create a new provider account'}
 </p>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
 <X className="size-6" />
 </button>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-5">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="first-name" className="block text-sm font-bold text-stone-700 mb-2">First Name</label>
 <input id="first-name"
 type="text"
 required
 value={formData.first_name}
 onChange={(e) => setFormData(prev => ({...prev, first_name: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="Ahmed"
 />
 </div>
 <div>
 <label htmlFor="last-name" className="block text-sm font-bold text-stone-700 mb-2">Last Name</label>
 <input id="last-name"
 type="text"
 required
 value={formData.last_name}
 onChange={(e) => setFormData(prev => ({...prev, last_name: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="Ali"
 />
 </div>
 </div>

 <div>
 <label htmlFor="email-address" className="block text-sm font-bold text-stone-700 mb-2">Email Address</label>
 <input id="email-address"
 type="email"
 required
 value={formData.email}
 onChange={(e) => setFormData(prev => ({...prev, email: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="ahmed@example.com"
 />
 </div>

 <div>
 <label htmlFor="phone-number" className="block text-sm font-bold text-stone-700 mb-2">Phone Number</label>
 <input id="phone-number"
 type="tel"
 required
 value={formData.phone}
 onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="+974 5000 0000"
 />
 </div>

 <div>
 <label className="block text-sm font-bold text-stone-700 mb-2">
 Password {isEditing && <span className="text-stone-400 font-normal text-xs">(Leave blank to keep current)</span>}
 </label>
 <input
 type="password"
 required={!isEditing}
 minLength={6}
 value={formData.password}
 onChange={(e) => setFormData(prev => ({...prev, password: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder={isEditing ? "••••••••" : "Create a password"}
 />
 {!isEditing && <p className="text-xs text-stone-500 mt-2">Minimum 6 characters</p>}
 </div>

 <div>
 <label htmlFor="role" className="block text-sm font-bold text-stone-700 mb-2">Role</label>
 <select id="role"
 required
 value={formData.role}
 onChange={(e) => setFormData(prev => ({...prev, role: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 >
 {allowedRoles.length > 0 ? (
 allowedRoles.map((role) => (
 <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
 ))
 ) : (
 <option value="">No roles available</option>
 )}
 </select>
 <p className="text-xs text-stone-400 mt-1.5">Only roles you selected during onboarding are available</p>
 </div>

 <div>
 <label htmlFor="input-src-app-provider-staff-page-tsx-576-578" className="block text-sm font-bold text-stone-700 mb-2">
 Specialty <span className="text-stone-400 font-normal text-xs">(Optional)</span>
 </label>
 <input
 type="text"
 value={formData.specialty}
 onChange={(e) => setFormData(prev => ({...prev, specialty: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="e.g. Physiotherapy, Cardiology"
 />
 </div>

 {isEditing && (
 <div>
 <label htmlFor="status" className="block text-sm font-bold text-stone-700 mb-2">Status</label>
 <select id="status"
 value={formData.status}
 onChange={(e) => setFormData(prev => ({...prev, status: e.target.value as 'active' | 'inactive' | 'pending' }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 >
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 <option value="pending">Pending</option>
 </select>
 </div>
 )}

 <div className="pt-4 flex gap-3">
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-6 py-3 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors font-bold"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 hover:shadow-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 Saving…
 </>
 ) : (
 isEditing ? 'Save Changes' : 'Create Account'
 )}
 </button>
 </div>
 </form>
 </m.div>
 </m.div>
 );
}
