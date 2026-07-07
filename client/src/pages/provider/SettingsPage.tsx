
import { useState, useEffect, useRef, type ReactNode, type ElementType } from 'react';
import { m, LazyMotion, domAnimation } from "framer-motion";
import {
 Settings as SettingsIcon, Bell, Globe, Shield, Sun, Moon, Monitor,
 Smartphone, Mail, Lock, User, Save, Loader2, Eye, EyeOff,
 MessageCircle, MapPin, CheckCircle, Sparkles, KeyRound,
 Briefcase, Heart, Languages, Stethoscope, Clock, DollarSign, FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProviderProfile, updatePassword, updateProviderProfile } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { STORAGE_KEYS } from '@/lib/storage-keys';

// ── Sub-components (defined OUTSIDE main component to avoid re-creation on each render) ──

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
 <label htmlFor="input-src-app-provider-settings-page-tsx-19-19" className="relative inline-flex items-center cursor-pointer flex-shrink-0">
 <input id="input-src-app-provider-settings-page-tsx-19-19" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label="Toggle" className="sr-only peer" />
 <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-teal-600" />
 </label>
);

interface SectionCardProps {
 children: ReactNode;
 icon: ElementType;
 iconBg: string;
 title: string;
 subtitle: string;
 delay?: number;
}

const SectionCard = ({ children, icon: Icon, iconBg, title, subtitle, delay = 0 }: SectionCardProps) => (
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay }}
 className="bg-white rounded-[2rem] p-6 sm:p-8 border border-stone-100 shadow-xl shadow-stone-200/40"
 >
 <div className="flex items-center gap-3 mb-6">
 <div className={`p-2.5 ${iconBg} rounded-xl`}>
 <Icon className="size-5" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
 <p className="text-sm text-stone-500">{subtitle}</p>
 </div>
 </div>
 {children}
 </m.div>
);

interface InputFieldProps {
 label: string;
 value: string | number;
 onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
 type?: string;
 disabled?: boolean;
 icon?: ElementType;
 hint?: string;
 placeholder?: string;
}

const InputField = ({ label, value, onChange, type = 'text', disabled = false, icon: Icon, hint, placeholder }: InputFieldProps) => (
 <div>
 <label className="block text-sm font-bold text-stone-700 mb-2">{label}</label>
 <div className="relative">
 {Icon && <Icon className="absolute left-4 top-3.5 size-4 text-stone-400" />}
 <input
 type={type}
 value={value}
 onChange={onChange}
 disabled={disabled}
 placeholder={placeholder}
 className={`w-full ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3 ${disabled ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : 'bg-stone-50 text-stone-900'} border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium`}
 />
 </div>
 {hint && <p className="text-xs text-stone-400 mt-1.5">{hint}</p>}
 </div>
);

export default function SettingsPage() {
 const { user, refreshUser } = useAuth();
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [serverLoadedAt, setServerLoadedAt] = useState<number>(0);

 // Profile (from API)
 const [profile, setProfile] = useState({
 firstName: '',
 lastName: '',
 email: '',
 phone: '',
 });

 // Provider profile fields (onboarding data)
 const [providerData, setProviderData] = useState({
 bio: '',
 gender: '',
 preferred_language: '',
 spoken_languages: [] as string[],
 specialties: [] as string[],
 license_number: '',
 license_type: '',
 issuing_authority: '',
 license_expiry: '',
 allied_health_specialty: '',
 support_skills: [] as string[],
 hobbies: [] as string[],
 hourly_rate: '',
 max_distance_km: '',
 service_location: '',
 business_name: '',
 address: '',
 city: '',
 region: '',
 });

 // Password
 // Password
 const [passwords, setPasswords] = useState({
 current_password: '',
 password: '',
 password_confirmation: '',
 });
 const [passwordLoading, setPasswordLoading] = useState(false);
 const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

 // Preferences (localStorage)
 const [language, setLanguage] = useState('english');
 const [theme, setTheme] = useState('light');
 const [timezone, setTimezone] = useState('Asia/Qatar');
 const [notifications, setNotifications] = useState({
 pushEnabled: true, emailEnabled: true, smsEnabled: false,
 newJobs: true, sessionReminders: true, paymentAlerts: true,
 documentExpiry: true, marketingEmails: false,
 });
 const [privacy, setPrivacy] = useState({
 profileVisible: true, showRating: true, shareLocation: true,
 });

 const draftKey = 'provider_profile_draft';

 const saveDraft = () => {
 const draft = {
 profile,
 providerData,
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
 if (draft.timestamp > serverLoadedAt) {
 toast.success(
 'Found unsaved changes from ' + new Date(draft.timestamp).toLocaleTimeString() + '. Changes restored.',
 { duration: 5000 }
 );
 if (draft.profile) setProfile(draft.profile);
 if (draft.providerData) setProviderData(draft.providerData);
 } else {
 localStorage.removeItem(draftKey);
 }
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

 // Load everything
 useEffect(() => {
 loadProfile();
 loadPreferences();
 }, []);

 const loadProfile = async () => {
 try {
 setLoading(true);
 const res = await getProviderProfile();
 const u = res.user;
 const p = res.profile;

 setProfile({
 firstName: u?.firstName || '',
 lastName: u?.lastName || '',
 email: u?.email || '',
 phone: u?.phone || '',
 });

 // Helper: safely parse array fields that may be JSON strings
 const safeArray = (val: unknown): string[] => {
 if (Array.isArray(val)) return val;
 if (typeof val === 'string') {
 try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
 }
 return [];
 };

 setProviderData({
 bio: p?.bio || '',
 gender: p?.gender || '',
 preferred_language: p?.preferred_language || '',
 spoken_languages: safeArray(p?.spoken_languages),
 specialties: safeArray(p?.specialties),
 license_number: p?.license_number || '',
 license_type: p?.license_type || '',
 issuing_authority: p?.issuing_authority || '',
 license_expiry: p?.license_expiry ? p.license_expiry.split('T')[0] : '',
 allied_health_specialty: p?.allied_health_specialty || '',
 support_skills: safeArray(p?.support_skills),
 hobbies: safeArray(p?.hobbies),
 hourly_rate: p?.hourly_rate || '',
 max_distance_km: p?.max_distance_km || '',
 service_location: p?.service_location || '',
 business_name: p?.business_name || '',
 address: p?.address || '',
 city: p?.city || '',
 region: p?.region || '',
 });
 } catch (error) {
 console.error('Failed to load profile', error);
 toast.error('Failed to load your profile. Using cached data.');
 // Fallback to user context
 if (user) {
 setProfile({
 firstName: user.firstName || '',
 lastName: user.lastName || '',
 email: user.email || '',
 phone: user.phone || '',
 });
 }
 } finally {
 setLoading(false);
 setServerLoadedAt(Date.now());
 loadDraft();
 }
 };

 useEffect(() => {
 if (!loading) {
 saveDraft();
 }
 }, [profile, providerData]);

 const loadPreferences = () => {
 try {
 const saved = localStorage.getItem(STORAGE_KEYS.providerSettings);
 if (saved) {
 const parsed = JSON.parse(saved);
 if (parsed.language) setLanguage(parsed.language);
 if (parsed.theme) setTheme(parsed.theme);
 if (parsed.timezone) setTimezone(parsed.timezone);
 if (parsed.notifications) setNotifications(parsed.notifications);
 if (parsed.privacy) setPrivacy(parsed.privacy);
 }
 } catch { }
 };

 // Save profile + provider data
 const handleSaveProfile = async () => {
 setSaving(true);
 try {
 const formData = new FormData();
 // User fields
 formData.append('firstName', profile.firstName);
 formData.append('lastName', profile.lastName);
 formData.append('phone', profile.phone);

 // Provider fields
 formData.append('bio', providerData.bio);
 formData.append('gender', providerData.gender);
 formData.append('preferred_language', providerData.preferred_language);
 formData.append('spoken_languages', JSON.stringify(providerData.spoken_languages));
 formData.append('specialties', JSON.stringify(providerData.specialties));
 formData.append('license_number', providerData.license_number);
 formData.append('license_type', providerData.license_type);
 formData.append('issuing_authority', providerData.issuing_authority);
 if (providerData.license_expiry) formData.append('license_expiry', providerData.license_expiry);
 formData.append('allied_health_specialty', providerData.allied_health_specialty);
 formData.append('support_skills', JSON.stringify(providerData.support_skills));
 formData.append('hobbies', JSON.stringify(providerData.hobbies));
 if (providerData.hourly_rate) formData.append('hourly_rate', providerData.hourly_rate);
 if (providerData.max_distance_km) formData.append('max_distance_km', providerData.max_distance_km);
 formData.append('service_location', providerData.service_location);
 formData.append('business_name', providerData.business_name);
 formData.append('address', providerData.address);
 formData.append('city', providerData.city);
 formData.append('region', providerData.region);

 await updateProviderProfile(formData);
 await refreshUser();
 clearDraft();
 toast.success('Profile updated successfully');
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to update profile');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to update profile');
 }
 } finally {
 setSaving(false);
 }
 };
 // Save password
 const handlePasswordChange = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!passwords.current_password) {
 toast.error('Please enter your current password');
 return;
 }
 if (passwords.password !== passwords.password_confirmation) {
 toast.error('Passwords do not match');
 return;
 }
 setPasswordLoading(true);
 try {
 await updatePassword(passwords.current_password, passwords.password);
 toast.success('Password updated successfully');
 setPasswords({ current_password: '', password: '', password_confirmation: '' });
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to update password');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to update password');
 }
 } finally {
 setPasswordLoading(false);
 }
 };

 // Save preferences

 // Save preferences
 const savePreferences = () => {
 localStorage.setItem(STORAGE_KEYS.providerSettings, JSON.stringify({ language, theme, timezone, notifications, privacy }));
 toast.success('Preferences saved');
 };

 // Helper: array field editing
 const handleArrayField = (field: keyof typeof providerData, value: string) => {
 const arr = value.split(',').map(s => s.trim()).filter(Boolean);
 setProviderData(prev => ({...prev, [field]: arr }));
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-stone-50/50 flex items-center justify-center">
 <div className="text-center">
 <Loader2 className="size-12 text-teal-600 animate-spin mx-auto mb-4" />
 <p className="text-stone-500 font-medium">Loading settings…</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50/50 p-4 sm:p-6 lg:p-8">
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-3 bg-teal-600 rounded-2xl shadow-lg shadow-teal-200">
 <SettingsIcon className="size-7 text-white" />
 </div>
 <div>
 <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900">Settings</h1>
 <p className="text-stone-500 font-medium">Manage your account, profile & preferences</p>
 </div>
 </div>
 </m.div>

 <div className="space-y-6">

 {/* ═══ Profile Information ═══ */}
 <SectionCard icon={User} iconBg="bg-teal-100 text-teal-600" title="Profile Information" subtitle="Your personal details" delay={0.05}>
 <div className="grid sm:grid-cols-2 gap-5">
 <InputField label="First Name" value={profile.firstName} onChange={(e) => setProfile(prev => ({...prev, firstName: e.target.value }))} />
 <InputField label="Last Name" value={profile.lastName} onChange={(e) => setProfile(prev => ({...prev, lastName: e.target.value }))} />
 <InputField label="Email" value={profile.email} disabled icon={Mail} hint="Email cannot be changed" />
 <InputField label="Phone" value={profile.phone} onChange={(e) => setProfile(prev => ({...prev, phone: e.target.value }))} icon={Smartphone} />
 </div>
 </SectionCard>

 {/* ═══ Professional Information (Onboarding Data) ═══ */}
 <SectionCard icon={Briefcase} iconBg="bg-blue-100 text-blue-600" title="Professional Information" subtitle="Your onboarding details — edit anytime" delay={0.1}>
 <div className="space-y-6">
 {/* Bio */}
 <div>
 <label htmlFor="bio" className="block text-sm font-bold text-stone-700 mb-2">Bio</label>
 <textarea id="bio"
 value={providerData.bio}
 onChange={(e) => setProviderData(prev => ({...prev, bio: e.target.value }))}
 rows={3}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium resize-none"
 placeholder="Tell clients about yourself and your experience..."
 />
 </div>

 <div className="grid sm:grid-cols-2 gap-5">
 <div>
 <label htmlFor="gender" className="block text-sm font-bold text-stone-700 mb-2">Gender</label>
 <select id="gender"
 value={providerData.gender}
 onChange={(e) => setProviderData(prev => ({...prev, gender: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 >
 <option value="">Select gender</option>
 <option value="male">Male</option>
 <option value="female">Female</option>
 </select>
 </div>
 <div>
 <label htmlFor="preferred-language" className="block text-sm font-bold text-stone-700 mb-2">Preferred Language</label>
 <select id="preferred-language"
 value={providerData.preferred_language}
 onChange={(e) => setProviderData(prev => ({...prev, preferred_language: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 >
 <option value="">Select language</option>
 <option value="english">English</option>
 <option value="arabic">Arabic</option>
 <option value="both">Both</option>
 </select>
 </div>
 </div>

 <InputField
 label="Spoken Languages"
 value={(providerData.spoken_languages || []).join(', ')}
 onChange={(e) => handleArrayField('spoken_languages', e.target.value)}
 icon={Languages}
 hint="Separate with commas (e.g. English, Arabic, Urdu)"
 />

 {/* Clinical fields */}
 <div className="pt-4 border-t border-stone-100">
 <h4 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-4 flex items-center gap-2">
 <Stethoscope className="size-4" /> Clinical Details
 </h4>
 <div className="grid sm:grid-cols-2 gap-5">
 <InputField label="License Number" value={providerData.license_number} onChange={(e) => setProviderData(prev => ({...prev, license_number: e.target.value }))} placeholder="e.g. LIC-12345" />
 <InputField label="License Type" value={providerData.license_type} onChange={(e) => setProviderData(prev => ({...prev, license_type: e.target.value }))} placeholder="e.g. Medical, Nursing" />
 <InputField label="Issuing Authority" value={providerData.issuing_authority} onChange={(e) => setProviderData(prev => ({...prev, issuing_authority: e.target.value }))} placeholder="e.g. MOH Qatar" />
 <InputField label="License Expiry" type="date" value={providerData.license_expiry} onChange={(e) => setProviderData(prev => ({...prev, license_expiry: e.target.value }))} />
 </div>
 <div className="mt-5">
 <InputField
 label="Specialties"
 value={(providerData.specialties || []).join(', ')}
 onChange={(e) => handleArrayField('specialties', e.target.value)}
 hint="Separate with commas (e.g. Cardiology, Pediatrics)"
 />
 </div>
 <div className="mt-5">
 <InputField label="Allied Health Specialty" value={providerData.allied_health_specialty} onChange={(e) => setProviderData(prev => ({...prev, allied_health_specialty: e.target.value }))} placeholder="e.g. Physiotherapy" />
 </div>
 </div>

 {/* Non-clinical fields */}
 <div className="pt-4 border-t border-stone-100">
 <h4 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-4 flex items-center gap-2">
 <Heart className="size-4" /> Skills & Interests
 </h4>
 <div className="space-y-5">
 <InputField
 label="Support Skills"
 value={(providerData.support_skills || []).join(', ')}
 onChange={(e) => handleArrayField('support_skills', e.target.value)}
 hint="Separate with commas (e.g. Mobility Assistance, Meal Prep)"
 />
 <InputField
 label="Hobbies & Activities"
 value={(providerData.hobbies || []).join(', ')}
 onChange={(e) => handleArrayField('hobbies', e.target.value)}
 hint="Separate with commas (e.g. Reading, Walking, Games)"
 />
 </div>
 </div>

 {/* Work Preferences */}
 <div className="pt-4 border-t border-stone-100">
 <h4 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-4 flex items-center gap-2">
 <Clock className="size-4" /> Work Preferences
 </h4>
 <div className="grid sm:grid-cols-2 gap-5">
 <InputField label="Hourly Rate (QAR)" type="number" value={providerData.hourly_rate} onChange={(e) => setProviderData(prev => ({...prev, hourly_rate: e.target.value }))} icon={DollarSign} placeholder="e.g. 100" />
 <InputField label="Max Distance (km)" type="number" value={providerData.max_distance_km} onChange={(e) => setProviderData(prev => ({...prev, max_distance_km: e.target.value }))} icon={MapPin} placeholder="e.g. 30" />
 <div>
 <label htmlFor="service-location" className="block text-sm font-bold text-stone-700 mb-2">Service Location</label>
 <select id="service-location"
 value={providerData.service_location}
 onChange={(e) => setProviderData(prev => ({...prev, service_location: e.target.value }))}
 className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 >
 <option value="">Select</option>
 <option value="client_home">Client&apos;s Home</option>
 <option value="clinic">My Clinic</option>
 <option value="both">Both</option>
 <option value="online">Online Only</option>
 </select>
 </div>
 </div>
 </div>

 {/* Business Info */}
 {providerData.business_name && (
 <div className="pt-4 border-t border-stone-100">
 <h4 className="text-sm font-semibold text-stone-600 uppercase tracking-wide mb-4 flex items-center gap-2">
 <FileText className="size-4" /> Business Information
 </h4>
 <div className="grid sm:grid-cols-2 gap-5">
 <InputField label="Business Name" value={providerData.business_name} onChange={(e) => setProviderData(prev => ({...prev, business_name: e.target.value }))} />
 <InputField label="Address" value={providerData.address} onChange={(e) => setProviderData(prev => ({...prev, address: e.target.value }))} />
 <InputField label="City" value={providerData.city} onChange={(e) => setProviderData(prev => ({...prev, city: e.target.value }))} />
 <InputField label="Region" value={providerData.region} onChange={(e) => setProviderData(prev => ({...prev, region: e.target.value }))} />
 </div>
 </div>
 )}
 </div>

 {/* Save Profile Button */}
 <div className="mt-8 pt-6 border-t border-stone-100 flex justify-end">
 <button
 onClick={handleSaveProfile}
 disabled={saving}
 className="inline-flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-2xl hover:shadow-xl hover:shadow-stone-900/20 transition-all font-bold disabled:opacity-50"
 >
 {saving ? <><Loader2 className="size-5 animate-spin" /> Saving…</> : <><Save className="size-5" /> Save Profile</>}
 </button>
 </div>
 </SectionCard>

 {/* ═══ Change Password ═══ */}
 <SectionCard icon={KeyRound} iconBg="bg-amber-100 text-amber-600" title="Change Password" subtitle="Update your security credentials" delay={0.15}>
 <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
 <div>
 <label htmlFor="current-password" className="block text-sm font-bold text-stone-700 mb-2">Current Password</label>
 <div className="relative">
 <Lock className="absolute left-4 top-3.5 size-4 text-stone-400" />
 <input id="current-password"
 type={showPasswords.current ? 'text' : 'password'}
 required
 value={passwords.current_password}
 onChange={(e) => setPasswords(prev => ({...prev, current_password: e.target.value }))}
 className="w-full pl-11 pr-12 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="Current password"
 />
 <button type="button" onClick={() => setShowPasswords(prev => ({...prev, current: !showPasswords.current }))} className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600">
 {showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>
 <div>
 <label htmlFor="new-password" className="block text-sm font-bold text-stone-700 mb-2">New Password</label>
 <div className="relative">
 <Lock className="absolute left-4 top-3.5 size-4 text-stone-400" />
 <input id="new-password"
 type={showPasswords.new ? 'text' : 'password'}
 required minLength={6}
 value={passwords.password}
 onChange={(e) => setPasswords(prev => ({...prev, password: e.target.value }))}
 className="w-full pl-11 pr-12 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="New password"
 />
 <button type="button" onClick={() => setShowPasswords(prev => ({...prev, new: !showPasswords.new }))} className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600">
 {showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 <p className="text-xs text-stone-400 mt-1.5">Minimum 6 characters</p>
 </div>
 <div>
 <label htmlFor="confirm-new-password" className="block text-sm font-bold text-stone-700 mb-2">Confirm New Password</label>
 <div className="relative">
 <Lock className="absolute left-4 top-3.5 size-4 text-stone-400" />
 <input id="confirm-new-password"
 type={showPasswords.confirm ? 'text' : 'password'}
 required minLength={6}
 value={passwords.password_confirmation}
 onChange={(e) => setPasswords(prev => ({...prev, password_confirmation: e.target.value }))}
 className="w-full pl-11 pr-12 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium"
 placeholder="Confirm password"
 />
 <button type="button" onClick={() => setShowPasswords(prev => ({...prev, confirm: !showPasswords.confirm }))} className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600">
 {showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>
 <button type="submit" disabled={passwordLoading || !passwords.password} className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all font-bold disabled:opacity-50">
 {passwordLoading ? <><Loader2 className="size-4 animate-spin" /> Updating…</> : <><KeyRound className="size-4" /> Update Password</>}
 </button>
 </form>
 </SectionCard>

 {/* ═══ Language & Region ═══ */}
 <SectionCard icon={Globe} iconBg="bg-indigo-100 text-indigo-600" title="Language & Region" subtitle="Set your preferred language and timezone" delay={0.2}>
 <div className="space-y-6">
 <div>
 <span className="block text-sm font-bold text-stone-700 mb-3">Language</span>
 <div className="grid grid-cols-2 gap-4">
 {[
 { id: 'english', label: 'English', flag: '🇬🇧', dir: 'Left-to-Right' },
 { id: 'arabic', label: 'العربية', flag: '🇦🇪', dir: 'Right-to-Left' },
 ].map((lang) => (
 <button key={lang.id} onClick={() => setLanguage(lang.id)}
 className={`p-4 rounded-2xl border-2 transition-all text-left ${language === lang.id ? 'border-teal-600 bg-teal-50 shadow-lg shadow-teal-100' : 'border-stone-200 hover:border-stone-300'}`}>
 <span className="text-2xl mb-2 block">{lang.flag}</span>
 <span className="font-bold text-stone-900 block">{lang.label}</span>
 <span className="text-xs text-stone-500 block mt-0.5">{lang.dir}</span>
 {language === lang.id && <CheckCircle className="size-4 text-teal-600 mt-2" />}
 </button>
 ))}
 </div>
 </div>
 <div>
 <label htmlFor="timezone" className="block text-sm font-bold text-stone-700 mb-2">Timezone</label>
 <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-900 font-medium">
 <option value="Asia/Qatar">Arabia Standard Time (AST) - Qatar</option>
 <option value="Asia/Riyadh">Arabia Standard Time (AST) - Saudi Arabia</option>
 <option value="Africa/Cairo">Eastern European Time (EET) - Egypt</option>
 <option value="Asia/Dubai">Gulf Standard Time (GST) - UAE</option>
 </select>
 </div>
 </div>
 </SectionCard>

 {/* ═══ Appearance ═══ */}
 <SectionCard icon={Sun} iconBg="bg-purple-100 text-purple-600" title="Appearance" subtitle="Customize how the app looks" delay={0.25}>
 <div className="grid grid-cols-3 gap-4">
 {[
 { id: 'light', label: 'Light', icon: Sun, desc: 'Default' },
 { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on eyes' },
 { id: 'system', label: 'System', icon: Monitor, desc: 'Auto-detect' },
 ].map((option) => (
 <button key={option.id} onClick={() => setTheme(option.id)}
 className={`p-5 rounded-2xl border-2 transition-all text-center ${theme === option.id ? 'border-teal-600 bg-teal-50 shadow-lg shadow-teal-100' : 'border-stone-200 hover:border-stone-300'}`}>
 <option.icon className={`size-6 mx-auto mb-2 ${theme === option.id ? 'text-teal-600' : 'text-stone-400'}`} />
 <span className="font-bold text-stone-900 block">{option.label}</span>
 <span className="text-xs text-stone-500 block mt-0.5">{option.desc}</span>
 {theme === option.id && <CheckCircle className="size-4 text-teal-600 mx-auto mt-2" />}
 </button>
 ))}
 </div>
 </SectionCard>

 {/* ═══ Notifications ═══ */}
 <SectionCard icon={Bell} iconBg="bg-blue-100 text-blue-600" title="Notifications" subtitle="Control how you receive alerts" delay={0.3}>
 <div className="space-y-6">
 <div>
 <span className="block text-sm font-bold text-stone-700 mb-3">Channels</span>
 <div className="space-y-3">
 {[
 { key: 'pushEnabled', label: 'Push Notifications', icon: Smartphone, desc: 'Receive alerts on your device' },
 { key: 'emailEnabled', label: 'Email Notifications', icon: Mail, desc: 'Get updates via email' },
 { key: 'smsEnabled', label: 'SMS Notifications', icon: MessageCircle, desc: 'Important alerts via text' },
 ].map((ch) => (
 <div key={ch.key} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
 <div className="flex items-center gap-4">
 <div className="p-2 bg-white rounded-xl shadow-sm"><ch.icon className="size-4 text-stone-500" /></div>
 <div>
 <p className="font-bold text-stone-900 text-sm">{ch.label}</p>
 <p className="text-xs text-stone-500">{ch.desc}</p>
 </div>
 </div>
 <ToggleSwitch checked={notifications[ch.key as keyof typeof notifications]} onChange={(val) => setNotifications(prev => ({...prev, [ch.key]: val }))} />
 </div>
 ))}
 </div>
 </div>
 <div>
 <span className="block text-sm font-bold text-stone-700 mb-3">Types</span>
 <div className="space-y-2">
 {[
 { key: 'newJobs', label: 'New Job Requests', desc: 'When jobs match your profile' },
 { key: 'sessionReminders', label: 'Session Reminders', desc: '30 min before scheduled sessions' },
 { key: 'paymentAlerts', label: 'Payment Alerts', desc: 'When you receive payment' },
 { key: 'documentExpiry', label: 'Document Expiry', desc: 'When documents expire soon' },
 { key: 'marketingEmails', label: 'Marketing & Tips', desc: 'Tips and promotional content' },
 ].map((type) => (
 <div key={type.key} className="flex items-center justify-between p-3.5 hover:bg-stone-50 rounded-xl transition-colors">
 <div>
 <p className="font-bold text-stone-900 text-sm">{type.label}</p>
 <p className="text-xs text-stone-500">{type.desc}</p>
 </div>
 <ToggleSwitch checked={notifications[type.key as keyof typeof notifications]} onChange={(val) => setNotifications(prev => ({...prev, [type.key]: val }))} />
 </div>
 ))}
 </div>
 </div>
 </div>
 </SectionCard>

 {/* ═══ Privacy ═══ */}
 <SectionCard icon={Shield} iconBg="bg-emerald-100 text-emerald-600" title="Privacy" subtitle="Control your data and visibility" delay={0.35}>
 <div className="space-y-3">
 {[
 { key: 'profileVisible', label: 'Profile Visibility', desc: 'Allow patients to find you in search', icon: Eye },
 { key: 'showRating', label: 'Show My Rating', desc: 'Display your rating on your profile', icon: Sparkles },
 { key: 'shareLocation', label: 'Share Location', desc: 'Allow location tracking during shifts', icon: MapPin },
 ].map((s) => (
 <div key={s.key} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
 <div className="flex items-center gap-4">
 <div className="p-2 bg-white rounded-xl shadow-sm"><s.icon className="size-4 text-stone-500" /></div>
 <div>
 <p className="font-bold text-stone-900 text-sm">{s.label}</p>
 <p className="text-xs text-stone-500">{s.desc}</p>
 </div>
 </div>
 <ToggleSwitch checked={privacy[s.key as keyof typeof privacy]} onChange={(val) => setPrivacy(prev => ({...prev, [s.key]: val }))} />
 </div>
 ))}
 </div>
 </SectionCard>

 {/* ═══ Save Preferences ═══ */}
 <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-end gap-3 pb-8">
 <button onClick={savePreferences} className="inline-flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-2xl hover:shadow-xl hover:shadow-stone-900/20 transition-all font-bold">
 <Save className="size-5" /> Save Preferences
 </button>
 </m.div>
 </div>
 </div>
 </div>
 );
}
