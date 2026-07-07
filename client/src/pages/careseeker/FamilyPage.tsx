
import { useState, useEffect } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import {
 Users,
 UserPlus,
 User,
 Mail,
 Phone,
 Shield,
 Edit,
 Trash2,
 ChevronRight,
 CheckCircle,
 Eye,
 CreditCard,
 X,
 Loader2,
 Crown,
 Heart,
 Lock,
 Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addFamilyMember, deleteFamilyMember, getFamilyMembers, updateFamilyMember } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';




interface FamilyMember {
 id: string;
 firstName: string;
 lastName: string;
 relationship: string;
 email: string;
 phone: string;
 role: 'viewer' | 'decision_maker';
 isPrimary?: boolean;
}

export default function FamilyPage() {
 const { user } = useAuth();
 const [members, setMembers] = useState<FamilyMember[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
 const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 useEffect(() => {
 fetchMembers();
 }, []);

 const fetchMembers = async () => {
 try {
 setLoading(true);
 const data = await getFamilyMembers();
 const formattedMembers = Array.isArray(data) ? data : data.data || [];

 const mappedMembers = formattedMembers.map((m: {
 id: string;
 firstName?: string;
 first_name?: string;
 lastName?: string;
 last_name?: string;
 email?: string;
 phone?: string;
 relationship?: string;
 role?: string;
 }) => ({
 id: m.id,
 firstName: m.firstName || m.first_name,
 lastName: m.lastName || m.last_name,
 email: m.email,
 phone: m.phone,
 relationship: m.relationship || 'Family Member',
 role: m.role === 'decision_maker' ? 'decision_maker' : 'viewer',
 }));

 setMembers(mappedMembers);
 } catch (error) {
 console.error('Failed to fetch family members', error);
 } finally {
 setLoading(false);
 }
 };

 const handleEdit = (member: FamilyMember) => {
 setEditingMember(member);
 setShowModal(true);
 };

 const handleAdd = () => {
 setEditingMember(null);
 setShowModal(true);
 };

 const handleDelete = async (id: string, name: string) => {
 setDeleteConfirm({ id, name });
 };

 const confirmDelete = async () => {
 if (!deleteConfirm) return;
 setIsDeleting(true);
 try {
 await deleteFamilyMember(deleteConfirm.id);
 toast.success('Family member removed successfully');
 setDeleteConfirm(null);
 fetchMembers();
 } catch (error: unknown) {
 console.error('Failed to delete member', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to remove family member');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to remove family member');
 }
 } finally {
 setIsDeleting(false);
 }
 };

 const getRelationshipIcon = (relationship: string) => {
 const rel = relationship.toLowerCase();
 if (rel.includes('son') || rel.includes('daughter')) return '👶';
 if (rel.includes('spouse') || rel.includes('partner')) return '💑';
 if (rel.includes('parent') || rel.includes('mother') || rel.includes('father')) return '👴';
 if (rel.includes('sibling') || rel.includes('brother') || rel.includes('sister')) return '👫';
 return '👤';
 };

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
 <Users className="size-7 text-white" />
 </div>
 <div>
 <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900">Family Circle</h1>
 <p className="text-stone-500 font-medium">Manage your care team together</p>
 </div>
 </div>
 </div>
 <m.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={handleAdd}
 className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-stone-900 text-white rounded-2xl hover:shadow-xl hover:shadow-stone-900/20 transition-transform duration-300 font-bold"
 >
 <UserPlus className="size-5" />
 Add Family Member
 </m.button>
 </div>
 </m.div>

 {/* Features Banner */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="mb-8 bg-gradient-to-r from-teal-50 to-blue-50 rounded-[2rem] p-6 border border-teal-200"
 >
 <div className="flex items-start gap-4">
 <div className="p-3 bg-white rounded-xl ">
 <Sparkles className="size-6 text-teal-600" />
 </div>
 <div className="flex-1">
 <h3 className="font-semibold text-stone-900 mb-3 text-lg">Family Care Benefits</h3>
 <div className="grid sm:grid-cols-2 gap-3">
 {[
 { icon: Shield, text: 'Secure shared access to care management' },
 { icon: CreditCard, text: 'Unified billing and payment methods' },
 { icon: Heart, text: 'Collaborative care decisions' },
 { icon: Lock, text: 'Privacy-protected family data' }
 ].map((item) => (
 <div key={item.text} className="flex items-center gap-2 text-sm text-stone-700">
 <div className="p-1.5 bg-teal-100 rounded-lg">
 <item.icon className="size-3.5 text-teal-600" />
 </div>
 {item.text}
 </div>
 ))}
 </div>
 </div>
 </div>
 </m.div>

 {/* Loading State */}
 {loading ? (
 <div className="flex items-center justify-center p-20">
 <div className="text-center">
 <Loader2 className="size-12 text-teal-600 animate-spin mx-auto mb-4" />
 <p className="text-stone-500 font-medium">Loading family members…</p>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
 {/* Family Members */}
 <AnimatePresence mode="popLayout">
 {members.map((member, index) => (
 <m.div
 key={member.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 transition={{ delay: index * 0.05 }}
 className="group relative bg-white rounded-[2rem] p-6 ring-1 ring-stone-100/50 shadow-xl shadow-stone-200/40 hover:shadow-2xl hover:shadow-stone-200/60 transition-transform duration-300"
 >
 {/* Primary Badge */}
 {member.isPrimary && (
 <div className="absolute top-4 right-4">
 <div className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-full text-xs font-bold shadow-lg">
 <Crown className="size-3" />
 Primary
 </div>
 </div>
 )}

 {/* Avatar & Info */}
 <div className="flex items-start gap-4 mb-5">
 <m.div
 whileHover={{ scale: 1.05, rotate: 5 }}
 className="relative"
 >
 <div className="size-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
 {member.firstName?.[0]}{member.lastName?.[0]}
 </div>
 <div className="absolute -bottom-1 -right-1 text-2xl">
 {getRelationshipIcon(member.relationship)}
 </div>
 </m.div>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-stone-900 text-lg truncate">
 {member.firstName} {member.lastName}
 </h4>
 <p className="text-sm text-stone-500 font-medium capitalize">{member.relationship}</p>
 </div>
 </div>

 {/* Contact Info */}
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

 {/* Role Badge */}
 <div className="mb-5 pt-4 border-t ring-1 ring-stone-100/50">
 <div className="flex items-center justify-between">
 <span className="text-xs text-stone-500 font-bold uppercase tracking-wide">Access Level</span>
 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${member.role === 'decision_maker' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-700' }`}>
 {member.role === 'decision_maker' ? (
 <>
 <Shield className="size-3.5" />
 Decision Maker
 </>
 ) : (
 <>
 <Eye className="size-3.5" />
 Member
 </>
 )}
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
 {!member.isPrimary && (
 <m.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => handleDelete(member.id, member.firstName)}
 className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
 >
 <Trash2 className="size-4" />
 </m.button>
 )}
 </div>
 </m.div>
 ))}

 {/* Add Member Card */}
 <m.button
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: members.length * 0.05 }}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={handleAdd}
 className="bg-stone-50 hover:bg-stone-100 rounded-[2rem] p-8 border-2 border-dashed border-stone-300 hover:border-teal-400 flex flex-col items-center justify-center min-h-[320px] transition-transform duration-300 group"
 >
 <div className="size-16 bg-teal-100 group-hover:bg-teal-200 rounded-2xl flex items-center justify-center mb-4 transition-colors">
 <UserPlus className="size-8 text-teal-600" />
 </div>
 <p className="font-bold text-stone-900 text-lg mb-1">Add Family Member</p>
 <p className="text-sm text-stone-500 text-center">Invite someone to help<br />manage care together</p>
 </m.button>
 </AnimatePresence>

 {/* Empty State */}
 {members.length === 0 && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="col-span-full"
 >
 <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed ring-1 ring-stone-200/50">
 <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
 <Users className="size-10 text-stone-300" />
 </div>
 <h3 className="text-xl font-semibold text-stone-900 mb-2">No family members yet</h3>
 <p className="text-stone-500 mb-6">Start building your care circle by adding family members</p>
 <button
 onClick={handleAdd}
 className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-bold"
 >
 <UserPlus className="size-5" />
 Add Your First Member
 </button>
 </div>
 </m.div>
 )}
 </div>
 )}

 {/* Shared Payments Section */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="mt-8 bg-gradient-to-br from-stone-900 to-stone-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl"
 >
 <div className="absolute top-0 right-0 size-64 bg-teal-500 rounded-full blur-[100px] opacity-20"></div>

 <div className="relative z-10">
 <div className="flex items-start gap-4 mb-6">
 <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
 <CreditCard className="size-6 text-teal-300" />
 </div>
 <div className="flex-1">
 <h3 className="text-xl font-semibold mb-2">Shared Payment Methods</h3>
 <p className="text-stone-300 leading-relaxed">
 Family members with Decision Maker access can use shared payment methods for care bookings, making it easier to manage expenses together.
 </p>
 </div>
 </div>
 <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-colors font-bold border border-white/10">
 Manage Payment Methods
 <ChevronRight className="size-4" />
 </button>
 </div>
 </m.div>
 </div>

 {/* Delete Confirmation Modal */}
 <AnimatePresence>
 {deleteConfirm && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
 onClick={() => setDeleteConfirm(null)}
 >
 <m.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-xl"
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2 bg-red-50 rounded-full">
 <Trash2 className="size-5 text-red-500" />
 </div>
 <h3 className="font-semibold text-stone-900">Remove Family Member</h3>
 </div>
 <p className="text-stone-500 mb-6">
 Are you sure you want to remove <span className="font-semibold text-stone-900">{deleteConfirm.name}</span> from your family members?
 </p>
 <div className="flex gap-3">
 <button
 onClick={() => setDeleteConfirm(null)}
 className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
 disabled={isDeleting}
 >
 Cancel
 </button>
 <button
 onClick={confirmDelete}
 disabled={isDeleting}
 className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
 >
 {isDeleting ? 'Removing...' : 'Remove'}
 </button>
 </div>
 </m.div>
 </m.div>
 )}
 </AnimatePresence>

 {/* Add/Edit Member Modal */}
 <AnimatePresence>
 {showModal && (
 <FamilyMemberModal
 initialData={editingMember}
 onClose={() => setShowModal(false)}
 onSuccess={() => {
 setShowModal(false);
 fetchMembers();
 }}
 />
 )}
 </AnimatePresence>
 </div>
 );
}

function FamilyMemberModal({
 initialData,
 onClose,
 onSuccess
}: {
 initialData: FamilyMember | null,
 onClose: () => void,
 onSuccess: () => void
}) {
 const isEditing = !!initialData;
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 first_name: initialData?.firstName || '',
 last_name: initialData?.lastName || '',
 email: initialData?.email || '',
 phone: initialData?.phone || '',
 password: '',
 relationship: initialData?.relationship || 'son',
 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 if (isEditing && initialData) {
 const dataToUpdate: Record<string, string> = { ...formData };
 if (!dataToUpdate.password) delete dataToUpdate.password;

 await updateFamilyMember(initialData.id, dataToUpdate);
 toast.success('Family member updated successfully');
 } else {
 await addFamilyMember(formData);
 toast.success('Family member added successfully');
 }
 onSuccess();
 } catch (error: unknown) {
 console.error('Error saving family member:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to save family member');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to save family member');
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
 className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl"
 >
 {/* Header */}
 <div className="bg-stone-900 p-6 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 size-32 bg-teal-500/20 rounded-full blur-2xl"></div>
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-semibold mb-1">
 {isEditing ? 'Edit Family Member' : 'Add Family Member'}
 </h3>
 <p className="text-stone-300 text-sm">
 {isEditing ? 'Update member information' : 'Create a new family account'}
 </p>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-white/20 rounded-xl transition-colors"
 >
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
 <label htmlFor="relationship" className="block text-sm font-bold text-stone-700 mb-2">Relationship</label>
 <select id="relationship"
 value={formData.relationship}
 onChange={(e) => setFormData(prev => ({...prev, relationship: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 >
 <option value="son">Son</option>
 <option value="daughter">Daughter</option>
 <option value="spouse">Spouse</option>
 <option value="sibling">Sibling</option>
 <option value="parent">Parent</option>
 <option value="other">Other</option>
 </select>
 </div>

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
 className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 hover:shadow-lg transition-transform duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
