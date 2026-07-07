
import { useState } from 'react';
import {
 User, Mail, Phone, MapPin, Camera, Lock, Shield, Bell, Globe,
 Clock, Calendar, Languages, Car, Heart, Save, ChevronRight,
 AlertCircle, CheckCircle, Eye, EyeOff, Trash2, Download, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAccount } from '@/lib/api/user';
import { isApiError } from '@/lib/errors';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AccountPage() {
 const { user, logout } = useAuth();
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState('profile');
 const [showPassword, setShowPassword] = useState(false);
 const [saving, setSaving] = useState(false);
 const [deleting, setDeleting] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

 const handleDeleteAccount = async () => {
 setDeleting(true);
 try {
 await deleteAccount();
 logout();
 toast.success('Account deleted successfully.');
 navigate('/');
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to delete account. Please try again.');
 } else {
 toast.error('Failed to delete account. Please try again.');
 }
 } finally {
 setDeleting(false);
 setShowDeleteConfirm(false);
 }
 };

 // Mock profile data
 const [profile, setProfile] = useState({
 firstName: user?.firstName || 'Sarah',
 lastName: user?.lastName || 'Johnson',
 email: user?.email || 'sarah.johnson@example.com',
 phone: '+971 50 123 4567',
 address: 'Dubai Marina, Tower 5',
 bio: 'Experienced nurse with 10+ years in elderly and disability care. Passionate about providing compassionate, quality care.',
 languages: ['English', 'Arabic'],
 certifications: ['Nursing License - DHA', 'First Aid Certified', 'Dementia Care Specialist'],
 });

 // Availability preferences
 const [preferences, setPreferences] = useState({
 maxTravelDistance: 20,
 preferredCareTypes: ['Elderly Care', 'Nursing Care', 'Disability Support'],
 workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
 workHours: { start: '08:00', end: '18:00' },
 preferredGender: 'no-preference',
 strictGenderMatch: false,
 prayerBreak: false,
 familyPresenceRequired: false,
 });

 // Notification settings
 const [notifications, setNotifications] = useState({
 newJobRequests: true,
 sessionReminders: true,
 paymentAlerts: true,
 documentExpiry: true,
 emailNotifications: true,
 smsNotifications: true,
 pushNotifications: true,
 });

 const tabs = [
 { id: 'profile', label: 'Profile', icon: User },
 { id: 'preferences', label: 'Availability & Preferences', icon: Calendar },
 { id: 'security', label: 'Security', icon: Lock },
 { id: 'notifications', label: 'Notifications', icon: Bell },
 { id: 'privacy', label: 'Privacy & Data', icon: Shield },
 ];

 const careTypes = ['Elderly Care', 'Nursing Care', 'Disability Support', 'Mental Health', 'Companionship', 'Childcare'];
 const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

 const handleSave = () => {
 setSaving(true);
 setTimeout(() => setSaving(false), 1000);
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">Account Settings</h2>
 <p className="text-stone-600">Manage your profile, preferences, and account settings</p>
 </div>
 <Button onClick={handleSave} disabled={saving}>
 {saving ? (
 <>
 <div className="animate-spin rounded-full size-4 border-2 border-white border-t-transparent mr-2" />
 Saving…
 </>
 ) : (
 <>
 <Save className="size-4 mr-2" />
 Save Changes
 </>
 )}
 </Button>
 </div>

 <div className="flex flex-col lg:flex-row gap-6">
 {/* Sidebar */}
 <div className="lg:w-64 bg-white rounded-xl border border-stone-200 p-4">
 <nav className="space-y-1">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-teal-50 text-teal-700' : 'text-stone-600 hover:bg-stone-50' }`}
 >
 <tab.icon className="size-5" />
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 {/* Content */}
 <div className="flex-1 bg-white rounded-xl border border-stone-200 p-6">
 {/* Profile Tab */}
 {activeTab === 'profile' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-stone-900">Profile Information</h3>

 {/* Avatar */}
 <div className="flex items-center gap-6">
 <div className="relative">
 <div className="size-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
 {profile.firstName[0]}{profile.lastName[0]}
 </div>
 <button className="absolute bottom-0 right-0 p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700">
 <Camera className="size-4" />
 </button>
 </div>
 <div>
 <h4 className="font-semibold text-stone-900">{profile.firstName} {profile.lastName}</h4>
 <p className="text-sm text-stone-500">Healthcare Provider</p>
 <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
 <CheckCircle className="size-3" />
 Verified Provider
 </p>
 </div>
 </div>

 {/* Form */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label htmlFor="first-name" className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
 <input id="first-name"
 type="text"
 value={profile.firstName}
 onChange={(e) => setProfile(prev => ({...prev, firstName: e.target.value }))}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="last-name" className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
 <input id="last-name"
 type="text"
 value={profile.lastName}
 onChange={(e) => setProfile(prev => ({...prev, lastName: e.target.value }))}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
 <input id="email"
 type="email"
 value={profile.email}
 onChange={(e) => setProfile(prev => ({...prev, email: e.target.value }))}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
 <input id="phone"
 type="tel"
 value={profile.phone}
 onChange={(e) => setProfile(prev => ({...prev, phone: e.target.value }))}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div className="md:col-span-2">
 <label htmlFor="address" className="block text-sm font-medium text-stone-700 mb-1">Address</label>
 <input id="address"
 type="text"
 value={profile.address}
 onChange={(e) => setProfile(prev => ({...prev, address: e.target.value }))}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div className="md:col-span-2">
 <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">Bio</label>
 <textarea id="bio"
 value={profile.bio}
 onChange={(e) => setProfile(prev => ({...prev, bio: e.target.value }))}
 rows={3}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 </div>

 {/* Languages */}
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">Languages Spoken</span>
 <div className="flex flex-wrap gap-2">
 {profile.languages.map((lang) => (
 <span key={lang} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
 {lang}
 </span>
 ))}
 <button className="px-3 py-1 border border-dashed border-stone-300 text-stone-500 rounded-full text-sm hover:border-teal-500 hover:text-teal-600">
 + Add Language
 </button>
 </div>
 </div>

 {/* Certifications */}
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">Certifications</span>
 <div className="space-y-2">
 {profile.certifications.map((cert) => (
 <div key={cert} className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg">
 <CheckCircle className="size-4 text-green-600" />
 <span className="text-sm text-stone-700">{cert}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Preferences Tab */}
 {activeTab === 'preferences' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-stone-900">Availability & Preferences</h3>

 {/* Work Days */}
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">Available Days</span>
 <div className="flex flex-wrap gap-2">
 {days.map((day) => (
 <button
 key={day}
 onClick={() => {
 const newDays = preferences.workDays.includes(day)
 ? preferences.workDays.filter(d => d !== day)
 : [...preferences.workDays, day];
 setPreferences(prev => ({...prev, workDays: newDays }));
 }}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${preferences.workDays.includes(day) ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200' }`}
 >
 {day}
 </button>
 ))}
 </div>
 </div>

 {/* Work Hours */}
 <div>
 <label htmlFor="work-hours" className="block text-sm font-medium text-stone-700 mb-2">Work Hours</label>
 <div className="flex items-center gap-4">
 <input id="work-hours"
 type="time"
 value={preferences.workHours.start}
 onChange={(e) => setPreferences({
 ...preferences,
 workHours: { ...preferences.workHours, start: e.target.value }
 })}
 className="px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <span className="text-stone-500">to</span>
 <input
 type="time"
 value={preferences.workHours.end}
 onChange={(e) => setPreferences({
 ...preferences,
 workHours: { ...preferences.workHours, end: e.target.value }
 })}
 className="px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 </div>

 {/* Max Travel Distance */}
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">
 Maximum Travel Distance: {preferences.maxTravelDistance} km
 </span>
 <input
 type="range"
 min="5"
 max="50"
 value={preferences.maxTravelDistance}
 onChange={(e) => setPreferences(prev => ({...prev, maxTravelDistance: parseInt(e.target.value) }))}
 className="w-full accent-teal-600"
 />
 <div className="flex justify-between text-xs text-stone-500 mt-1">
 <span>5 km</span>
 <span>50 km</span>
 </div>
 </div>

 {/* Preferred Care Types */}
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">Preferred Care Types</span>
 <div className="flex flex-wrap gap-2">
 {careTypes.map((type) => (
 <button
 key={type}
 onClick={() => {
 const newTypes = preferences.preferredCareTypes.includes(type)
 ? preferences.preferredCareTypes.filter(t => t !== type)
 : [...preferences.preferredCareTypes, type];
 setPreferences(prev => ({...prev, preferredCareTypes: newTypes }));
 }}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${preferences.preferredCareTypes.includes(type) ? 'bg-teal-100 text-teal-700 border border-teal-300' : 'bg-stone-100 text-stone-600 border border-stone-200 hover:border-teal-300' }`}
 >
 {type}
 </button>
 ))}
 </div>
 </div>

 {/* Preferred Gender */}
 <div>
 <label htmlFor="client-gender-preference" className="block text-sm font-medium text-stone-700 mb-2">Client Gender Preference</label>
 <select id="client-gender-preference"
 value={preferences.preferredGender}
 onChange={(e) => setPreferences(prev => ({...prev, preferredGender: e.target.value }))}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 >
 <option value="no-preference">No Preference</option>
 <option value="male">Male Only</option>
 <option value="female">Female Only</option>
 </select>
 </div>

 {/* Cultural Preferences */}
 <div className="space-y-4 pt-4 border-t border-stone-200">
 <h4 className="font-medium text-stone-900">Cultural & Religious Preferences</h4>

 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
 <div>
 <p className="font-medium text-stone-900">Strict Gender Matching</p>
 <p className="text-sm text-stone-500">Only show my profile to patients matching my gender preference</p>
 </div>
 <label htmlFor="input-src-app-provider-account-page-tsx-374-374" className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={preferences.strictGenderMatch}
 onChange={(e) => setPreferences(prev => ({...prev, strictGenderMatch: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
 <div>
 <p className="font-medium text-stone-900">Prayer Breaks</p>
 <p className="text-sm text-stone-500">Automatically block 15 mins for prayer times based on location</p>
 </div>
 <label htmlFor="input-src-app-provider-account-page-tsx-390-390" className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={preferences.prayerBreak}
 onChange={(e) => setPreferences(prev => ({...prev, prayerBreak: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
 <div>
 <p className="font-medium text-stone-900">Family Presence Required</p>
 <p className="text-sm text-stone-500">I prefer to deliver care only when a family member is present</p>
 </div>
 <label htmlFor="input-src-app-provider-account-page-tsx-406-406" className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={preferences.familyPresenceRequired}
 onChange={(e) => setPreferences(prev => ({...prev, familyPresenceRequired: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>
 </div>
 </div>
 )}

 {/* Security Tab */}
 {activeTab === 'security' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-stone-900">Security Settings</h3>

 {/* Change Password */}
 <div className="p-5 bg-stone-50 rounded-xl">
 <h4 className="font-semibold text-stone-900 mb-4">Change Password</h4>
 <div className="space-y-4">
 <div>
 <label htmlFor="current-password" className="block text-sm font-medium text-stone-700 mb-1">Current Password</label>
 <div className="relative">
 <input id="current-password"
 type={showPassword ? "text" : "password"}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <button
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>
 <div>
 <label htmlFor="new-password" className="block text-sm font-medium text-stone-700 mb-1">New Password</label>
 <input id="new-password"
 type="password"
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <div>
 <label htmlFor="confirm-new-password" className="block text-sm font-medium text-stone-700 mb-1">Confirm New Password</label>
 <input id="confirm-new-password"
 type="password"
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <Button>Update Password</Button>
 </div>
 </div>

 {/* Two-Factor Auth */}
 <div className="flex items-center justify-between p-5 bg-stone-50 rounded-xl">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-purple-100 rounded-xl">
 <Shield className="size-5 text-purple-600" />
 </div>
 <div>
 <h4 className="font-semibold text-stone-900">Two-Factor Authentication</h4>
 <p className="text-sm text-stone-500">Add an extra layer of security</p>
 </div>
 </div>
 <Button variant="outline">Enable</Button>
 </div>

 {/* Active Sessions */}
 <div className="p-5 bg-stone-50 rounded-xl">
 <h4 className="font-semibold text-stone-900 mb-4">Active Sessions</h4>
 <div className="space-y-3">
 <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-green-100 rounded-lg">
 <Globe className="size-4 text-green-600" />
 </div>
 <div>
 <p className="font-medium text-stone-900">Current Session</p>
 <p className="text-xs text-stone-500">Chrome on Windows • Dubai, UAE</p>
 </div>
 </div>
 <span className="text-xs text-green-600">Active Now</span>
 </div>
 </div>
 <Button variant="outline" className="w-full mt-4 text-red-600 border-red-200 hover:bg-red-50">
 Sign Out All Other Sessions
 </Button>
 </div>
 </div>
 )}

 {/* Notifications Tab */}
 {activeTab === 'notifications' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-stone-900">Notification Preferences</h3>

 <div className="space-y-4">
 {[
 { key: 'newJobRequests', label: 'New Job Requests', desc: 'Get notified when new jobs match your profile' },
 { key: 'sessionReminders', label: 'Session Reminders', desc: 'Reminders before scheduled sessions' },
 { key: 'paymentAlerts', label: 'Payment Alerts', desc: 'Notifications for payments and earnings' },
 { key: 'documentExpiry', label: 'Document Expiry', desc: 'Alerts when documents are expiring' },
 ].map((item) => (
 <div key={item.key} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
 <div>
 <p className="font-medium text-stone-900">{item.label}</p>
 <p className="text-sm text-stone-500">{item.desc}</p>
 </div>
 <label htmlFor="input-src-app-provider-account-page-tsx-517-517" className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={notifications[item.key as keyof typeof notifications]}
 onChange={(e) => setNotifications(prev => ({...prev, [item.key]: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>
 ))}
 </div>

 <div className="border-t border-stone-200 pt-6">
 <h4 className="font-semibold text-stone-900 mb-4">Notification Channels</h4>
 <div className="space-y-4">
 {[
 { key: 'emailNotifications', label: 'Email Notifications', icon: Mail },
 { key: 'smsNotifications', label: 'SMS Notifications', icon: Phone },
 { key: 'pushNotifications', label: 'Push Notifications', icon: Bell },
 ].map((item) => (
 <div key={item.key} className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <item.icon className="size-5 text-stone-400" />
 <span className="text-stone-700">{item.label}</span>
 </div>
 <label htmlFor="input-src-app-provider-account-page-tsx-543-543" className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={notifications[item.key as keyof typeof notifications]}
 onChange={(e) => setNotifications(prev => ({...prev, [item.key]: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Privacy Tab */}
 {activeTab === 'privacy' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-stone-900">Privacy & Data</h3>

 {/* Data Export */}
 <div className="p-5 bg-stone-50 rounded-xl">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-blue-100 rounded-xl">
 <Download className="size-5 text-blue-600" />
 </div>
 <div className="flex-1">
 <h4 className="font-semibold text-stone-900">Download Your Data</h4>
 <p className="text-sm text-stone-500 mb-4">
 Get a copy of all your personal data in a portable format
 </p>
 <Button variant="outline">Request Data Export</Button>
 </div>
 </div>
 </div>

 {/* Consent Management */}
 <div className="p-5 bg-stone-50 rounded-xl">
 <h4 className="font-semibold text-stone-900 mb-4">Consent Management (PDPL)</h4>
 <div className="space-y-3">
 <div className="flex items-center justify-between p-3 bg-white rounded-lg">
 <span className="text-stone-700">Data Processing Agreement</span>
 <span className="text-green-600 text-sm flex items-center gap-1">
 <CheckCircle className="size-4" />
 Consented
 </span>
 </div>
 <div className="flex items-center justify-between p-3 bg-white rounded-lg">
 <span className="text-stone-700">Background Check Authorization</span>
 <span className="text-green-600 text-sm flex items-center gap-1">
 <CheckCircle className="size-4" />
 Consented
 </span>
 </div>
 </div>
 </div>

 {/* Delete Account */}
 <div className="p-5 bg-red-50 rounded-xl border border-red-100">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-red-100 rounded-xl">
 <Trash2 className="size-5 text-red-600" />
 </div>
 <div className="flex-1">
 <h4 className="font-semibold text-red-900">Delete Account</h4>
 <p className="text-sm text-red-700 mb-4">
 Permanently delete your account and all associated data. This action cannot be undone.
 </p>
 {!showDeleteConfirm ? (
 <Button
 variant="outline"
 className="text-red-600 border-red-300 hover:bg-red-100"
 onClick={() => setShowDeleteConfirm(true)}
 >
 Delete My Account
 </Button>
 ) : (
 <div className="flex flex-col gap-3">
 <p className="text-sm text-red-800 font-medium">
 Are you sure? This will immediately delete your account.
 </p>
 <div className="flex gap-2">
 <Button
 variant="outline"
 className="text-stone-600 border-stone-300"
 onClick={() => setShowDeleteConfirm(false)}
 disabled={deleting}
 >
 Cancel
 </Button>
 <Button
 variant="outline"
 className="text-red-600 border-red-300 hover:bg-red-100"
 onClick={handleDeleteAccount}
 disabled={deleting}
 >
 {deleting ? 'Deleting...' : 'Confirm Delete'}
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
