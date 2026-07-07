
import { useState, useEffect , useRef } from 'react';
import { Save, Bell, Shield, Database, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

export default function AdminSettingsPage() {
 const [settings, setSettings] = useState({
 siteName: "Riaya Plus",
 supportEmail: "support@riayaplus.com",
 enableNotifications: true,
 enableEmailAlerts: true,
 maintenanceMode: false,
 allowRegistration: true,
 requireEmailVerification: false,
 sessionTimeout: "30",
 maxLoginAttempts: "5",
 });
 const loadingRef = useRef(true);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 fetchSettings();
 }, []);

 const fetchSettings = async () => {
 try {
 const response = await client.get('/admin/settings');
 const data = response.data?.data || response.data;
 if (data) {
 setSettings(prev => ({ ...prev, ...data }));
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load settings');
 }
 } finally {
 loadingRef.current = false;
 }
 };

 const handleSave = async () => {
 try {
 setSaving(true);
 await client.put('/admin/settings', settings);
 toast.success("Settings saved successfully!");
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to save settings');
 }
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Settings</h1>
 <p className="text-sm text-stone-500">Manage system settings and configurations</p>
 </div>

 <div className="space-y-6">
 {/* General Settings */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center gap-3 mb-6">
 <div className="rounded-lg bg-blue-50 p-2">
 <Database className="size-5 text-blue-600" />
 </div>
 <h2 className="text-lg font-semibold text-stone-900">General Settings</h2>
 </div>

 <div className="space-y-4">
 <div>
 <label htmlFor="siteName" className="block text-sm font-medium text-stone-700 mb-2">
 Site Name
 </label>
 <input
 id="siteName"
 type="text"
 value={settings.siteName}
 onChange={(e) => setSettings(prev => ({...prev, siteName: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>

 <div>
 <label htmlFor="supportEmail" className="block text-sm font-medium text-stone-700 mb-2">
 Support Email
 </label>
 <input
 id="supportEmail"
 type="email"
 value={settings.supportEmail}
 onChange={(e) => setSettings(prev => ({...prev, supportEmail: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 </div>
 </div>

 {/* Notification Settings */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center gap-3 mb-6">
 <div className="rounded-lg bg-purple-50 p-2">
 <Bell className="size-5 text-purple-600" />
 </div>
 <h2 className="text-lg font-semibold text-stone-900">Notifications</h2>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-stone-900">Enable Notifications</p>
 <p className="text-sm text-stone-500">Receive system notifications</p>
 </div>
 <label htmlFor="enableNotifications" aria-label="Toggle enableNotifications" className="relative inline-flex items-center cursor-pointer">
 <input
 id="enableNotifications"
 type="checkbox"
 checked={settings.enableNotifications}
 onChange={(e) => setSettings(prev => ({...prev, enableNotifications: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-stone-900">Email Alerts</p>
 <p className="text-sm text-stone-500">Send email notifications for important events</p>
 </div>
 <label htmlFor="enableEmailAlerts" aria-label="Toggle enableEmailAlerts" className="relative inline-flex items-center cursor-pointer">
 <input
 id="enableEmailAlerts"
 type="checkbox"
 checked={settings.enableEmailAlerts}
 onChange={(e) => setSettings(prev => ({...prev, enableEmailAlerts: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
 </label>
 </div>
 </div>
 </div>

 {/* Security Settings */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center gap-3 mb-6">
 <div className="rounded-lg bg-red-50 p-2">
 <Shield className="size-5 text-red-600" />
 </div>
 <h2 className="text-lg font-semibold text-stone-900">Security</h2>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-stone-900">Maintenance Mode</p>
 <p className="text-sm text-stone-500">Disable public access to the platform</p>
 </div>
 <label htmlFor="maintenanceMode" aria-label="Toggle maintenanceMode" className="relative inline-flex items-center cursor-pointer">
 <input
 id="maintenanceMode"
 type="checkbox"
 checked={settings.maintenanceMode}
 onChange={(e) => setSettings(prev => ({...prev, maintenanceMode: e.target.checked }))}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
 </label>
 </div>

 <div>
 <label htmlFor="sessionTimeout" className="block text-sm font-medium text-stone-700 mb-2">
 Session Timeout (minutes)
 </label>
 <input
 id="sessionTimeout"
 type="number"
 value={settings.sessionTimeout}
 onChange={(e) => setSettings(prev => ({...prev, sessionTimeout: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>

 <div>
 <label htmlFor="maxLoginAttempts" className="block text-sm font-medium text-stone-700 mb-2">
 Max Login Attempts
 </label>
 <input
 id="maxLoginAttempts"
 type="number"
 value={settings.maxLoginAttempts}
 onChange={(e) => setSettings(prev => ({...prev, maxLoginAttempts: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 </div>
 </div>

 {/* Save Button */}
 <div className="flex justify-end">
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center rounded-md bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {saving ? (
 <>
 <div className="mr-2 size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Saving…
 </>
 ) : (
 <>
 <Save className="mr-2 size-4" />
 Save Settings
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 );
}
