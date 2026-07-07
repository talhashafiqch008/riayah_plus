
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

;
import { useState, useEffect, useRef } from 'react';
import {
 User, Mail, Phone, Globe, Bell, Shield, Lock, ChevronRight, Save, Check,
 CreditCard, MapPin, Camera, Key, Smartphone, Moon, Sun, Heart, FileText,
 Trash2, LogOut, AlertTriangle, CheckCircle, Eye, EyeOff, Calendar, Zap, Sparkles, ChevronDown,
 Users, Home as HomeIcon, Clock, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUser, updateClientProfile, updatePassword } from '@/lib/api';
import toast from "react-hot-toast";
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@/lib/errors';

const TimePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
 const [isOpen, setIsOpen] = useState(false);
 // Parse value safely
 const [h, m] = value ? value.split(':') : ['--', '--'];

 const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
 const minutes = ['00', '15', '30', '45'];

 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="relative">
 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 block">{label}</span>
 <button
 onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
 className={`flex items-center gap-2 bg-stone-50 border rounded-lg px-3 py-2 w-32 transition-transform duration-300 hover:bg-white focus:outline-none ${isOpen ? 'border-teal-500 ring-2 ring-teal-100' : 'ring-1 ring-stone-200/50 hover:border-teal-300'}`}
 >
 <Clock className={`size-4 transition-colors ${isOpen ? 'text-teal-500' : 'text-stone-400'}`} />
 <span className={`text-sm font-semibold flex-1 text-left ${value ? 'text-stone-700' : 'text-stone-400'}`}>
 {value || '-- : --'}
 </span>
 <ChevronDown className={`size-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
 </button>

 {isOpen && (
 <>
 <div className="fixed inset-0 z-[60]" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setIsOpen(false); } }} onClick={() => setIsOpen(false)}></div>
 <div className="absolute top-full left-0 mt-2 bg-white ring-1 ring-stone-100/50 shadow-xl rounded-xl p-2 z-[70] flex gap-2 w-[180px] animate-in fade-in zoom-in-95 duration-100">
 <div className="h-48 overflow-y-auto w-1/2 scrollbar-none">
 <div className="text-[10px] font-bold text-stone-400 text-center mb-1 sticky top-0 bg-white py-1">Hrs</div>
 <div className="space-y-1">
 {hours.map(hour => (
 <div role="button" tabIndex={0} key={hour}
 onClick={(e) => {
 e.stopPropagation();
 onChange(`${hour}:${m === '--' ? '00' : m}`);
 }}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`p-1.5 text-center text-sm rounded-md cursor-pointer transition-colors ${h === hour ? 'bg-teal-500 text-white font-bold shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'text-stone-600 hover:bg-stone-100'}`}
 >
 {hour}
 </div>
 ))}
 </div>
 </div>
 <div className="h-48 overflow-y-auto w-1/2 scrollbar-none border-l ring-1 ring-stone-100/50 pl-2">
 <div className="text-[10px] font-bold text-stone-400 text-center mb-1 sticky top-0 bg-white py-1">Min</div>
 <div className="space-y-1">
 {minutes.map(min => (
 <div role="button" tabIndex={0} key={min}
 onClick={(e) => {
 e.stopPropagation();
 onChange(`${h === '--' ? '09' : h}:${min}`);
 setIsOpen(false);
 }}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`p-1.5 text-center text-sm rounded-md cursor-pointer transition-colors ${m === min ? 'bg-teal-500 text-white font-bold shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'text-stone-600 hover:bg-stone-100'}`}
 >
 {min}
 </div>
 ))}
 </div>
 </div>
 </div>
 </>
 )}
 </motion.div>
 );
};

interface ClientProfile {
 address?: string;
 city?: string;
 state?: string;
 postalCode?: string;
 postal_code?: string;
 country?: string;
 care_recipient_type?: string;
 care_location?: string;
 care_categories?: string[];
 schedule_type?: string;
 practitioner_gender?: string;
 provider_languages?: string[];
 preferred_days?: string[];
 preferred_time_slots?: string[];
}

interface UserData {
 id?: string;
 firstName?: string;
 lastName?: string;
 email?: string;
 phone?: string;
 country?: string;
 profilePhoto?: string;
 client_profile?: ClientProfile;
}

export default function SettingsPage() {
 const { logout } = useAuth();
 const [user, setUser] = useState<UserData | null>(null);
 const [activeTab, setActiveTab] = useState('profile');
 const [openDropdown, setOpenDropdown] = useState<string | null>(null); // 'gender' | 'language' | null
 const [loading, setLoading] = useState(true);
 const [saved, setSaved] = useState(false);
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [showPassword, setShowPassword] = useState(false);
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [passwordLoading, setPasswordLoading] = useState(false);
 const handleUpdatePassword = async () => {
 if (!currentPassword) {
 toast.error('Please enter your current password');
 return;
 }
 if (!newPassword) {
 toast.error('Please enter a new password');
 return;
 }
 if (newPassword.length < 8) {
 toast.error('Password must be at least 8 characters');
 return;
 }

 try {
 setPasswordLoading(true);
 await updatePassword(currentPassword, newPassword);
 toast.success('Password updated successfully. Logging out…');
 setCurrentPassword('');
 setNewPassword('');

 setTimeout(() => {
 logout();
 }, 2000);

 } catch (error) {
 console.error('Failed to update password:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to update password');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to update password');
 }
 setPasswordLoading(false);
 }
 };

 // Mock state for interactive elements
 const [notifications, setNotifications] = useState({
 email: true,
 push: true,
 sms: false,
 });

 const draftKey = 'careseeker_profile_draft';

 const saveDraft = () => {
 if (!user) return;
 const draft = {
 user,
 timestamp: Date.now()
 };
 localStorage.setItem(draftKey, JSON.stringify(draft));
 };

 const loadDraft = () => {
 try {
 const saved = localStorage.getItem(draftKey);
 if (saved) {
 const draft = JSON.parse(saved);
 const age = Date.now() - (draft.timestamp || 0);
 if (age < 24 * 60 * 60 * 1000) {
 if (draft.user) setUser(draft.user);
 } else {
 localStorage.removeItem(draftKey);
 }
 }
 } catch {
 localStorage.removeItem(draftKey);
 }
 };

 const clearDraft = () => {
 localStorage.removeItem(draftKey);
 };

 useEffect(() => {
 const fetchUser = async () => {
 try {
 const userData = await getUser();
 setUser(userData);
 loadDraft();
 } catch (error) {
 console.error('Failed to load user settings:', error);
 toast.error('Failed to load your settings. Please refresh the page.');
 } finally {
 setLoading(false);
 }
 };
 fetchUser();
 }, []);

 useEffect(() => {
 if (!loading && user) {
 saveDraft();
 }
 }, [user]);

 const [isSaving, setIsSaving] = useState(false);

 const handleSave = async () => {
 if (!user) return;
 try {
 setIsSaving(true);
 setSaved(false);

 // Map local state (mixed snake_case/camelCase) to backend validation rules
 const profile = user?.client_profile || {};

 // Handle enum mappings
 let careRecipient = profile.care_recipient_type;
 if (careRecipient === 'someone_else') careRecipient = 'other';
 if (careRecipient === 'myself') careRecipient = 'myself';

 // Create FormData or JSON payload
 let payload: FormData | Record<string, unknown>;

 if (selectedFile) {
 const formData = new FormData();
 formData.append('profilePhoto', selectedFile);

 // Append other fields
 formData.append('firstName', user.firstName || '');
 formData.append('lastName', user.lastName || '');
 formData.append('email', user.email || '');
 formData.append('phone', user.phone || '');
 formData.append('country', user.country || profile.country || '');
 formData.append('address', profile.address || '');
 formData.append('city', profile.city || '');
 formData.append('state', profile.state || '');
 formData.append('postal_code', profile.postalCode || profile.postal_code || '');

 // Fields that might be arrays or special values
 if (careRecipient) formData.append('careRecipientType', careRecipient);
 formData.append('careLocation', profile.care_location || '');
 formData.append('scheduleType', profile.schedule_type || '');

 (profile.care_categories || []).forEach((cat: string) => formData.append('careCategories[]', cat));
 (profile.care_categories || []).forEach((cat: string) => formData.append('careNeeds[]', cat));

 formData.append('practitionerGender', profile.practitioner_gender || '');
 (profile.provider_languages || []).forEach((lang: string) => formData.append('providerLanguages[]', lang));

 payload = formData;
 } else {
 payload = {
 // User Base Info
 firstName: user.firstName,
 lastName: user.lastName,
 email: user.email,
 phone: user.phone,
 country: user.country || profile.country,

 // Client Profile Info
 careRecipientType: careRecipient,
 careLocation: profile.care_location,

 careCategories: profile.care_categories || [],
 careNeeds: profile.care_categories || [],

 practitionerGender: profile.practitioner_gender,
 providerLanguages: profile.provider_languages || [],

 address: profile.address,
 city: profile.city,
 state: profile.state,
 postal_code: profile.postalCode || profile.postal_code,

 scheduleType: profile.schedule_type,
 preferredDays: profile.preferred_days || [],
 preferredTimeSlots: profile.preferred_time_slots || [],

 profilePhoto: user.profilePhoto
 };
 }

 await updateClientProfile(payload);
 clearDraft();
 setSaved(true);
 toast.success('Settings saved successfully');
 setTimeout(() => setSaved(false), 2000);
 } catch (error) {
 console.error('Failed to save settings:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to save changes');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to save changes');
 }
 } finally {
 setIsSaving(false);
 }
 };

 const fileInputRef = useRef<HTMLInputElement>(null);
 const [uploadingPhoto, setUploadingPhoto] = useState(false);

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 // 1. Immediate Preview
 const previewUrl = URL.createObjectURL(file);
 setUser((prev: UserData | null) => (prev ? { ...prev, profilePhoto: previewUrl } : null));
 setSelectedFile(file);
 };

 const triggerFileInput = () => {
 fileInputRef.current?.click();
 };

 const tabs = [
 { id: 'profile', label: 'My Profile', icon: User, desc: 'Personal details & photo' },
 { id: 'care', label: 'Care Preferences', icon: Heart, desc: 'Needs & requirements' },
 { id: 'account', label: 'Security', icon: Shield, desc: 'Password & 2FA' },
 // { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & updates' },
 // { id: 'payment', label: 'Billing', icon: CreditCard, desc: 'Methods & history' },
 ];

 if (loading || !user) {
 return (
 <div className="min-h-[60vh] flex items-center justify-center">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 return (
  <div className="w-full space-y-8 pb-12">
 {/* Header */}
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">Account Settings</h1>
 <p className="text-stone-500 mt-2 text-lg">Manage your personal information and application preferences.</p>
 </div>

 <div className="flex flex-col lg:flex-row gap-8">
 {/* 👈 Sidebar Navigation */}
 <div className="lg:w-80 flex-shrink-0 space-y-6">
 {/* User Mini Card */}
 <div className="bg-white p-6 rounded-2xl ring-1 ring-stone-100/50  flex items-center gap-4">
 <div className="relative">
 <div className="size-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-[0_4px_20px_rgba(0,0,0,0.04)] shadow-teal-500/20">
 {user.firstName?.[0]}{user.lastName?.[0]}
 </div>
 <div className="absolute -bottom-1 -right-1 size-5 bg-teal-500 border-2 border-white rounded-full flex items-center justify-center">
 <Check className="size-3 text-white" />
 </div>
 </div>
 <div className="overflow-hidden">
 <h3 className="font-semibold text-stone-900 truncate">{user.firstName} {user.lastName}</h3>
 <p className="text-sm text-stone-500 truncate">{user.email}</p>
 </div>
 </div>

 {/* Navigation Links */}
 <nav className="space-y-2">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`w-full text-left p-4 rounded-xl transition-transform duration-300 group flex items-start gap-4 ${isActive ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] shadow-stone-200/50 border border-teal-100' : 'hover:bg-white hover: border border-transparent' }`}
 >
 <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-teal-50 text-teal-600' : 'bg-stone-100 text-stone-500 group-hover:bg-teal-50 group-hover:text-teal-600'}`}>
 <Icon className="size-5" />
 </div>
 <div className="flex-1">
 <div className={`font-semibold ${isActive ? 'text-stone-900' : 'text-stone-600'}`}>
 {tab.label}
 </div>
 <div className="text-xs text-stone-400 mt-0.5 font-medium">
 {tab.desc}
 </div>
 </div>
 {isActive && <ChevronRight className="size-5 text-teal-500 self-center" />}
 </button>
 );
 })}
 </nav>

 {/* Danger Zone Link */}
 <button className="w-full p-4 rounded-xl border border-dashed border-red-200 hover:bg-red-50 hover:border-red-300 transition-transform duration-300 flex items-center gap-3 text-red-600 group">
 <Trash2 className="size-5" />
 <span className="font-medium">Delete Account</span>
 </button>
 </div>

 {/* 👉 Main Content Area */}
 <div className="flex-1">
 <div className="bg-white/90 backdrop-blur-xl rounded-3xl ring-1 ring-stone-100/50 shadow-xl shadow-stone-200/50 relative min-h-[600px]">
 {/* Decorative background visual - Clipped */}
 <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
 <div className="absolute top-0 right-0 size-96 bg-gradient-to-br from-teal-50/50 to-blue-50/50 rounded-full blur-3xl -z-0 pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
 </div>

 <div className="relative z-10 p-8 lg:p-10">

 {/* Profile Tab */}
 {activeTab === 'profile' && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="flex items-center justify-between pb-6 border-b ring-1 ring-stone-100/50">
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">Personal Profile</h2>
 <p className="text-stone-500">Update your photo and personal details.</p>
 </div>
<Button
onClick={handleSave}
disabled={isSaving}
className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-[var(--radius-lg)] shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
>
{isSaving ? (
<span className="flex items-center gap-2">
<div className="animate-spin rounded-full size-4 border-2 border-white/30 border-t-white" />
Saving…
</span>
) : saved ? (
<span className="flex items-center gap-2">
<Check className="size-4" />
Saved
</span>
) : (
<span className="flex items-center gap-2">
<Save className="size-4" />
Save Changes
</span>
)}
</Button>
 </div>

{/* Avatar Upload */}
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-stone-50/50 rounded-[var(--radius-xl)] ring-1 ring-stone-100/60">
<input
  type="file"
  ref={fileInputRef}
  className="hidden"
  accept="image/*"
  onChange={handleFileChange}
/>
<div className="relative group cursor-pointer flex-shrink-0" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { triggerFileInput(); } }} onClick={triggerFileInput}>
  <div className="size-28 sm:size-32 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 p-1 shadow-md hover:shadow-lg transition-shadow">
    {user.profilePhoto ? (
      <img width={128} height={128} src={user.profilePhoto} alt="Profile" className="size-full rounded-full object-cover" loading="lazy" />
    ) : (
      <div className="size-full rounded-full bg-stone-800 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold overflow-hidden relative">
        {user.firstName?.[0]}{user.lastName?.[0]}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="size-8 text-white" />
        </div>
      </div>
    )}
  </div>
  <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/10" />
</div>
<div className="flex-1 space-y-3 min-w-0">
  <h3 className="font-semibold text-stone-900 text-lg">Profile Photo</h3>
  <p className="text-sm text-stone-500 leading-relaxed">
    This will be displayed on your profile and visible to caregivers. Max file size: 5MB.
  </p>
  <div className="flex flex-wrap gap-3">
    <Button
      variant="outline"
      size="sm"
      onClick={triggerFileInput}
      className="border-stone-300 hover:border-stone-400 hover:bg-stone-50"
    >
      <Camera className="size-4 mr-2" />
      Upload New
    </Button>
    {user.profilePhoto && (
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => setUser(prev => prev ? {...prev, profilePhoto: undefined} : null)}
      >
        Remove
      </Button>
    )}
  </div>
</div>
</div>

<div className="space-y-6">
  <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
    <User className="size-5 text-teal-600" />
    <h4 className="text-lg font-semibold text-stone-900">Personal Information</h4>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div className="space-y-2">
      <label htmlFor="first-name" className="text-sm font-semibold text-stone-700">First Name</label>
      <input
        id="first-name"
        type="text"
        value={user.firstName || ''}
        onChange={(e) => setUser(prev => prev ? {...prev, firstName: e.target.value} : null)}
        className="input-field"
      />
    </div>
    <div className="space-y-2">
      <label htmlFor="last-name" className="text-sm font-semibold text-stone-700">Last Name</label>
      <input
        id="last-name"
        type="text"
        value={user.lastName || ''}
        onChange={(e) => setUser(prev => prev ? {...prev, lastName: e.target.value} : null)}
        className="input-field"
      />
    </div>
    <div className="space-y-2">
      <label htmlFor="email-address" className="text-sm font-semibold text-stone-700">Email Address</label>
      <div className="relative">
        <Mail className="absolute left-3.5 top-3.5 size-5 text-stone-400" />
        <input
          id="email-address"
          type="email"
          value={user.email || ''}
          onChange={(e) => setUser(prev => prev ? {...prev, email: e.target.value} : null)}
          className="input-field pl-12"
        />
      </div>
    </div>
    <div className="space-y-2">
      <label htmlFor="phone-number" className="text-sm font-semibold text-stone-700">Phone Number</label>
      <div className="relative">
        <Phone className="absolute left-3.5 top-3.5 size-5 text-stone-400" />
        <input
          id="phone-number"
          type="tel"
          value={user.phone || ''}
          placeholder="+974 0000 0000"
          onChange={(e) => setUser(prev => prev ? {...prev, phone: e.target.value} : null)}
          className="input-field pl-12"
        />
      </div>
    </div>
  </div>
</div>

<div className="space-y-6 pt-6">
  <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
    <MapPin className="size-5 text-teal-600" />
    <h4 className="text-lg font-semibold text-stone-900">Location Details</h4>
  </div>

 <div className="md:col-span-2 flex flex-col gap-2">
 <label htmlFor="street-address" className="text-base font-bold text-stone-900 ml-1">Street Address</label>
 <textarea id="street-address"
 rows={2}
 value={user.client_profile?.address || ''}
 onChange={(e) => setUser(prev => ({...prev, client_profile: { ...user.client_profile, address: e.target.value } }))}
 className="input-field resize-none py-3 text-black"
 placeholder="Enter full street address"
 />
 </div>

 <div className="flex flex-col gap-2">
 <label htmlFor="city" className="text-base font-bold text-stone-900 ml-1">City</label>
 <input id="city"
 type="text"
 value={user.client_profile?.city || ''}
 onChange={(e) => setUser(prev => ({...prev, client_profile: { ...user.client_profile, city: e.target.value } }))}
 className="input-field text-black"
 placeholder="e.g. Doha"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label htmlFor="state---province" className="text-base font-bold text-stone-900 ml-1">State / Province</label>
 <input id="state---province"
 type="text"
 value={user.client_profile?.state || ''}
 onChange={(e) => setUser(prev => ({...prev, client_profile: { ...user.client_profile, state: e.target.value } }))}
 className="input-field text-black"
 placeholder="e.g. Ad Dawhah"
 />
 </div>
 <div className="flex flex-col gap-2">
 <label htmlFor="postal-code" className="text-base font-bold text-stone-900 ml-1">Postal Code</label>
 <input id="postal-code"
 type="text"
 value={user.client_profile?.postalCode || ''}
 onChange={(e) => setUser(prev => ({...prev, client_profile: { ...user.client_profile, postalCode: e.target.value } }))}
 className="input-field text-black"
 placeholder="e.g. 12345"
 />
 </div>
 <div className="flex flex-col gap-2 relative z-20">
 <span className="text-base font-bold text-stone-900 ml-1">Country</span>
 <div className="relative">
 <button
 onClick={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
 className="w-full px-4 py-3 rounded-lg border-2 border-stone-300 bg-white text-black font-semibold text-base flex justify-between items-center transition-transform duration-300 hover:border-stone-400 pl-12"
 >
 <Globe className="absolute left-4 top-3.5 size-5 text-stone-500" />
 <span className="truncate text-left">
 {user.country || user.client_profile?.country || 'Qatar'}
 </span>
 <ChevronDown className={`size-5 text-stone-500 transition-transform flex-shrink-0 ${openDropdown === 'country' ? 'rotate-180' : ''}`} />
 </button>

 {openDropdown === 'country' && (
 <div className="absolute top-full left-0 w-full mt-2 bg-white ring-1 ring-stone-200/50 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-500 max-h-60 overflow-y-auto">
 {['Qatar', 'Egypt'].map((c) => (
 <div role="button" tabIndex={0}
 key={c}
 onClick={() => {
 setUser(prev => ({...prev, country: c, client_profile: { ...user.client_profile, country: c } }));
 setOpenDropdown(null);
 }}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`px-4 py-3 text-stone-900 font-medium cursor-pointer transition-colors hover:bg-teal-50 ${(user.country === c || user.client_profile?.country === c) ? 'bg-teal-50 text-teal-900 font-bold' : '' }`}
 >
 {c}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Care Preferences Tab */}
 {activeTab === 'care' && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="flex items-center justify-between pb-6 border-b ring-1 ring-stone-100/50">
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">Care Preferences</h2>
 <p className="text-stone-500">Customize how we match you with providers.</p>
 </div>
 <Button onClick={handleSave} disabled={isSaving} className="disabled:opacity-70">
 {isSaving ? (
 <>
 <div className="animate-spin rounded-full size-4 border-b-2 border-white mr-2"></div>
 Saving…
 </>
 ) : (
 <>Save Preferences</>
 )}
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20"> {/* Apply pb-20 to allow dropdown space */}

 {/* Care Recipient & Location */}
 <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-stone-50 p-5 rounded-2xl ring-1 ring-stone-100/50">
 <span className="block text-base font-bold text-stone-900 mb-3">Who needs care?</span>
 <div className="flex gap-2 bg-white p-1 rounded-xl ring-1 ring-stone-100/50">
 {['myself', 'someone_else'].map((type) => (
 <button
 key={type}
 onClick={() => {
 setUser({
 ...user,
 client_profile: {
 ...(user.client_profile || {}),
 care_recipient_type: type
 }
 });
 }}
 className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-transform duration-300 ${user.client_profile?.care_recipient_type === type ? 'bg-teal-500 text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'text-stone-500 hover:text-stone-700' }`}
 >
 {type === 'myself' ? 'Myself' : 'Someone Else'}
 </button>
 ))}
 </div>
 </div>

 <div className="bg-stone-50 p-5 rounded-2xl ring-1 ring-stone-100/50">
 <span className="block text-base font-bold text-stone-900 mb-3">Care Location</span>
 <div className="flex gap-2 bg-white p-1 rounded-xl ring-1 ring-stone-100/50">
 {['home', 'remote', 'both'].map((loc) => (
 <button
 key={loc}
 onClick={() => {
 setUser({
 ...user,
 client_profile: {
 ...(user.client_profile || {}),
 care_location: loc
 }
 });
 }}
 className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-transform duration-300 ${user.client_profile?.care_location === loc ? 'bg-teal-500 text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'text-stone-500 hover:text-stone-700' }`}
 >
 {loc}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Care Categories - Multi Select Pills */}
 <div className="md:col-span-2 bg-white/90 backdrop-blur-xl rounded-2xl ring-1 ring-stone-200/50 p-6">
 <h3 className="font-semibold text-stone-900 flex items-center gap-2 mb-4">
 <Heart className="size-5 text-rose-500" />
 Care Categories Needed
 </h3>
 <div className="flex flex-wrap gap-2">
 {['aged_care', 'disability_support', 'allied_health', 'child_family', 'home_support'].map((cat) => {
 const currentCats: string[] = Array.isArray(user.client_profile?.care_categories) ? user.client_profile.care_categories : [];
 const isSelected = currentCats.includes(cat);
 return (
 <button
 key={cat}
 onClick={() => {
 let newCats;
 if (isSelected) newCats = currentCats.filter((c: string) => c !== cat);
 else newCats = [...currentCats, cat];

 setUser({
 ...user,
 client_profile: {
 ...(user.client_profile || {}),
 care_categories: newCats
 }
 });
 }}
 className={`px-4 py-2 rounded-full border text-sm font-medium transition-transform duration-300 ${isSelected ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white ring-1 ring-stone-200/50 text-stone-600 hover:border-rose-200 hover:text-rose-600' }`}
 >
 {cat.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
 </button>
 );
 })}
 </div>
 </div>

 {/* Gender Preference Custom Dropdown */}
 <div className="bg-stone-50 p-5 rounded-2xl ring-1 ring-stone-100/50 relative z-30">
 <span className="block text-base font-bold text-stone-900 mb-3">Preferred Provider Gender</span>
 <div className="relative">
 <button
 onClick={() => setOpenDropdown(openDropdown === 'gender' ? null : 'gender')}
 className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 bg-white text-black font-semibold text-base flex justify-between items-center transition-transform duration-300 hover:border-stone-400"
 >
 {user.client_profile?.practitioner_gender === 'female' ? 'Female' :
 user.client_profile?.practitioner_gender === 'male' ? 'Male' : 'No Preference'}
 <ChevronDown className={`size-5 text-stone-500 transition-transform ${openDropdown === 'gender' ? 'rotate-180' : ''}`} />
 </button>

 {openDropdown === 'gender' && (
 <div className="absolute top-full left-0 w-full mt-2 bg-white ring-1 ring-stone-200/50 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-500">
 {['No Preference', 'Female', 'Male'].map((opt) => (
 <div role="button" tabIndex={0}
 key={opt}
 onClick={() => {
 setUser({
 ...user,
 client_profile: {
 ...user.client_profile,
 practitioner_gender: opt.toLowerCase().replace(' ', '_')
 }
 });
 setOpenDropdown(null);
 }}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
 className={`px-4 py-3 text-stone-900 font-medium cursor-pointer transition-colors hover:bg-purple-100 ${opt.toLowerCase().includes(user.client_profile?.practitioner_gender?.replace('_', ' ') || '') ? 'bg-purple-50 text-purple-900' : '' }`}
 >
 {opt}
 </div>
 ))}
 </div>
 )}
 </div>
 <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
 <Sparkles className="size-3 text-teal-500" />
 We honor cultural preferences.
 </p>
 </div>

 {/* Language Preference Custom Dropdown (Multi-Select) */}
 <div className="bg-stone-50 p-5 rounded-2xl ring-1 ring-stone-100/50 relative z-20">
 <span className="block text-base font-bold text-stone-900 mb-3">Communication Language</span>
 <div className="relative">
 <button
 onClick={() => setOpenDropdown(openDropdown === 'language' ? null : 'language')}
 className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 bg-white text-black font-semibold text-base flex justify-between items-center transition-transform duration-300 hover:border-stone-400"
 >
 <span className="truncate pr-4">
 {Array.isArray(user.client_profile?.provider_languages) && user.client_profile.provider_languages.length > 0
 ? user.client_profile.provider_languages.map((l: string) => l.charAt(0).toUpperCase() + l.slice(1).toLowerCase()).join(', ')
 : 'Select Languages'}
 </span>
 <ChevronDown className={`size-5 text-stone-500 transition-transform flex-shrink-0 ${openDropdown === 'language' ? 'rotate-180' : ''}`} />
 </button>

 {openDropdown === 'language' && (
 <div className="absolute top-full left-0 w-full mt-2 bg-white ring-1 ring-stone-200/50 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-500 max-h-60 overflow-y-auto">
 {['English', 'Arabic', 'Hindi', 'Tagalog', 'Urdu', 'French'].map((opt) => {
 const currentLangs: string[] = Array.isArray(user.client_profile?.provider_languages)
 ? user.client_profile.provider_languages
 : [];

 const isSelected = currentLangs.includes(opt);

 return (
 <div role="button" tabIndex={0}
 key={opt}
 onClick={(e) => {
 e.stopPropagation();
 let newLangs;
 if (isSelected) {
 newLangs = currentLangs.filter((l) => l !== opt);
 } else {
 newLangs = [...currentLangs, opt];
 }
 // Update User State
 setUser({
 ...user,
 client_profile: {
 ...(user.client_profile || {}),
 provider_languages: newLangs
 }
 });
 }}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-purple-50 group border-b border-stone-50 last:border-0 ${isSelected ? 'bg-purple-50/50' : '' }`}
 >
 <span className={`font-medium ${isSelected ? 'text-purple-900 font-bold' : 'text-stone-700'}`}>{opt}</span>
 {isSelected && <Check className="size-5 text-purple-600" />}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Schedule Preferences */}
 <div className="md:col-span-2 bg-white/90 backdrop-blur-xl rounded-2xl ring-1 ring-stone-200/50 p-6 space-y-6">
 <h3 className="font-semibold text-stone-900 flex items-center gap-2">
 <Clock className="size-5 text-blue-500" />
 Schedule Preferences
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <span className="block text-sm font-semibold text-stone-700 mb-2">Schedule Type</span>
 <div className="flex bg-stone-100 rounded-lg p-1">
 {['one_time', 'recurring'].map((type) => (
 <button
 key={type}
 onClick={() => {
 setUser({
 ...user,
 client_profile: {
 ...(user.client_profile || {}),
 schedule_type: type
 }
 });
 }}
 className={`flex-1 py-2 text-sm font-medium rounded-md transition-transform duration-300 ${user.client_profile?.schedule_type === type ? 'bg-white  text-stone-900' : 'text-stone-500 hover:text-stone-700' }`}
 >
 {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
 </button>
 ))}
 </div>
 </div>
 </div>
 <div className="space-y-4">
 <span className="block text-sm font-semibold text-stone-700">Weekly Schedule</span>
 <div className="space-y-3">
 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
 const currentDays = user.client_profile?.preferred_days || [];
 const isDaySelected = currentDays.includes(day);

 // Helper to check if a specific time is available (not used for logic anymore, just display)
 // storage format: "Day:Start-End" e.g. "Monday:09:00-17:00"

 return (
 <div key={day} className={`p-4 rounded-xl border transition-transform duration-300 ${isDaySelected ? 'bg-white border-teal-200 ' : 'bg-stone-50 ring-1 ring-stone-100/50 opacity-70'}`}>
 <div className="flex flex-col sm:flex-row sm:items-center gap-4">
 <button
 onClick={() => {
 let newDays;
 if (isDaySelected) {
 newDays = currentDays.filter((d: string) => d !== day);
 // Also cleanup times for this day
 const newTimes = (user.client_profile?.preferred_time_slots || []).filter((s: string) => !s.startsWith(day));
 setUser({
 ...user,
 client_profile: {
 ...user.client_profile,
 preferred_days: newDays,
 preferred_time_slots: newTimes
 }
 });
 } else {
 newDays = [...currentDays, day];
 setUser({
 ...user,
 client_profile: {
 ...user.client_profile,
 preferred_days: newDays
 }
 });
 }
 }}
 className={`flex items-center gap-3 min-w-[140px] text-left group`}
 >
 <div className={`size-6 rounded-md border flex items-center justify-center transition-colors ${isDaySelected ? 'bg-teal-500 border-teal-500' : 'bg-white border-stone-300 group-hover:border-teal-400'}`}>
 {isDaySelected && <Check className="size-4 text-white" />}
 </div>
 <span className={`font-semibold ${isDaySelected ? 'text-teal-900' : 'text-stone-500'}`}>{day}</span>
 </button>

 {isDaySelected && (
 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500 pl-4 border-l ring-1 ring-stone-200/50 ml-2">
 {(() => {
 // Extract time for this day "Day:Start-End"
 const currentSlots = user.client_profile?.preferred_time_slots || [];
 const daySlot = currentSlots.find((s: string) => s.startsWith(`${day}:`));

 // Fix: split(':') breaks the time string itself "09:00". Use substring instead.
 const timeRange = daySlot ? daySlot.slice(day.length + 1) : '';

 const parts = timeRange ? timeRange.split('-') : [];
 const startTime = parts[0] || '';
 const endTime = parts[1] || '';

 const updateTime = (type: 'start' | 'end', val: string) => {
 const newStart = type === 'start' ? val : (startTime || '');
 const newEnd = type === 'end' ? val : (endTime || '');
 const newSlot = `${day}:${newStart}-${newEnd}`;

 const otherSlots = currentSlots.filter((s: string) => !s.startsWith(`${day}:`));
 setUser({
 ...user,
 client_profile: {
 ...user.client_profile,
 preferred_time_slots: [...otherSlots, newSlot]
 }
 });
 };

 return (
 <div className="flex items-center gap-4">
 <TimePicker
 label="From"
 value={startTime}
 onChange={(val) => updateTime('start', val)}
 />
 <span className="text-stone-300 mt-6">•</span>
 <TimePicker
 label="To"
 value={endTime}
 onChange={(val) => updateTime('end', val)}
 />
 </div>
 );
 })()}
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Cultural Toggles */}
 <div className="md:col-span-2 bg-white/90 backdrop-blur-xl rounded-2xl ring-1 ring-stone-200/50 p-6 space-y-4">
 <h3 className="font-semibold text-stone-900 flex items-center gap-2">
 <Globe className="size-4 text-teal-600" />
 Cultural & Religious Considerations
 </h3>

 {[
 { label: 'Halal Food Preparation', desc: 'Ensure all meals prepared are halal certified' },
 { label: 'Prayer Time Respect', desc: 'Accommodate prayer times during shifts' },
 { label: 'Modest Dress Code', desc: 'Prefer providers with modest attire' }
 ].map((item) => (
 <div key={item.label} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
 <div>
 <p className="font-medium text-stone-800">{item.label}</p>
 <p className="text-xs text-stone-500">{item.desc}</p>
 </div>
 <label htmlFor="input-src-app-careseeker-settings-page-tsx-993-993" className="relative inline-flex items-center cursor-pointer">
 <input id="input-src-app-careseeker-settings-page-tsx-993-993" type="checkbox" aria-label="Toggle" className="sr-only peer" />
 <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform duration-300 peer-checked:bg-teal-600"></div>
 </label>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Account Security Tab */}
 {activeTab === 'account' && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="pb-6 border-b ring-1 ring-stone-100/50">
 <h2 className="text-2xl font-semibold text-stone-900">Login & Security</h2>
 <p className="text-stone-500">Manage your account security preferences.</p>
 </div>

     <div className="grid gap-6">
  {/* Password Card */}
  <div className="bg-white rounded-[var(--radius-xl)] p-6 sm:p-8 ring-1 ring-stone-100/60 shadow-sm shadow-stone-100/50">
    <div className="flex items-start gap-4 mb-8">
      <div className="p-3 bg-teal-50 text-teal-600 rounded-xl flex-shrink-0">
        <Lock className="size-6" />
      </div>
      <div>
        <h3 className="font-semibold text-stone-900 text-lg">Change Password</h3>
        <p className="text-sm text-stone-500 mt-1">Choose a strong password to protect your account</p>
      </div>
    </div>
    
    <div className="space-y-5 max-w-xl">
      {/* Current Password */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-stone-700">Current Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Type your current password"
            className="w-full px-4 py-3.5 bg-stone-50 ring-1 ring-stone-200/50 rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all font-medium text-stone-900 placeholder:text-stone-400 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-stone-700">New Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password (min 8 characters)"
            className="w-full px-4 py-3.5 bg-stone-50 ring-1 ring-stone-200/50 rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all font-medium text-stone-900 placeholder:text-stone-400 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          onClick={handleUpdatePassword}
          disabled={passwordLoading || !currentPassword || !newPassword}
          className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 text-white font-bold rounded-[var(--radius-lg)] hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {passwordLoading ? (
            <span className="flex items-center gap-2">
              <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating…
            </span>
          ) : (
            'Update Password'
          )}
        </button>
      </div>
    </div>
  </div>
  </div>
  </div>
  )}

 {/* Notifications Tab */}
 {/* Notifications Tab */}
 {activeTab === 'notifications' && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="pb-6 border-b ring-1 ring-stone-100/50">
 <h2 className="text-2xl font-semibold text-stone-900">Notifications</h2>
 <p className="text-stone-500">Control how and when we contact you.</p>
 </div>

 <div className="space-y-4">
 {[
 { title: 'Email Notifications', desc: 'Get updates on your booking status and receipts.' },
 { title: 'Push Notifications', desc: 'Receive real-time alerts on your mobile device.' },
 { title: 'SMS Alerts', desc: 'Get text reminders for upcoming appointments.' },
 { title: 'Marketing Offers', desc: 'Receive special promotions and news.' }
 ].map((item, i) => (
 <div key={item.title} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-white border border-transparent hover:ring-1 ring-stone-200/50 hover: transition-transform duration-300">
 <div>
 <h3 className="font-semibold text-stone-900">{item.title}</h3>
 <p className="text-sm text-stone-500">{item.desc}</p>
 </div>
 <label htmlFor="input-src-app-careseeker-settings-page-tsx-1077-1077" className="relative inline-flex items-center cursor-pointer">
 <input id="input-src-app-careseeker-settings-page-tsx-1077-1077" type="checkbox" defaultChecked={i < 2} aria-label="Toggle" className="sr-only peer" />
 <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform duration-300 peer-checked:bg-teal-600"></div>
 </label>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Payment Tab */}
 {activeTab === 'payment' && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="flex items-center justify-between pb-6 border-b ring-1 ring-stone-100/50">
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">Payment Methods</h2>
 <p className="text-stone-500">Securely manage your payment details.</p>
 </div>
 <Button className="gap-2">
 <Zap className="size-4" /> Add Method
 </Button>
 </div>

 <div className="grid gap-4">
 <div className="p-5 ring-1 ring-stone-200/50 rounded-2xl flex items-center justify-between bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-lg">
 <div className="flex items-center gap-4">
 <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center font-bold italic tracking-wider">
 VISA
 </div>
 <div>
 <p className="font-mono text-lg tracking-widest">•••• •••• •••• 4242</p>
 <p className="text-xs text-stone-400">Expires 12/26</p>
 </div>
 </div>
 <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">Default</div>
 </div>
 </div>
 </div>
 )}

 </div>
 </div>
 </div>
 </div>

  <style>{`
    .input-field {
      @apply w-full px-4 py-3 rounded-[var(--radius-lg)] border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 font-medium text-sm;
    }
    .input-field:hover {
      @apply border-stone-300;
    }
    .input-field:focus {
      @apply bg-white;
    }
    .input-field:disabled {
      @apply bg-stone-50 text-stone-400 cursor-not-allowed border-stone-100;
    }
  `}</style>
 </div>
 );
}
