
import { useState, useEffect, useRef } from 'react';
import { Save, Bell, Shield, Database, Mail, QrCode, AlertCircle, CheckCircle, Key, Lock, X } from "lucide-react";
import toast from "react-hot-toast";
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';
import { enable2fa, verify2faSetup, disable2fa } from '@/lib/api';

export default function AdminSettingsPage() {
 const { user, refreshUser } = useAuth();
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

 // 2FA state
 const [mfaEnabled, setMfaEnabled] = useState(false);
 const [mfaLoading, setMfaLoading] = useState(false);
 const [showMfaSetup, setShowMfaSetup] = useState(false);
 const [setupStep, setSetupStep] = useState(1);
 const [twoFaSecret, setTwoFaSecret] = useState('');
 const [qrCodeUrl, setQrCodeUrl] = useState('');
 const [verificationCode, setVerificationCode] = useState('');
 const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
 const [showDisableModal, setShowDisableModal] = useState(false);
 const [disablePassword, setDisablePassword] = useState('');

 useEffect(() => {
 fetchSettings();
 }, []);

 useEffect(() => {
 if (user?.two_factor_enabled) setMfaEnabled(true);
 }, [user]);

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

 const handleEnableMfa = async () => {
 setMfaLoading(true);
 try {
 const data = await enable2fa();
 setTwoFaSecret(data.secret ?? '');
 setQrCodeUrl(data.qrCode ?? data.qr_code_url ?? '');
 setSetupStep(1);
 setVerificationCode('');
 setRecoveryCodes(null);
 setShowMfaSetup(true);
 } catch (err) {
 toast.error(isApiError(err) ? err.message : 'Failed to start 2FA setup');
 } finally {
 setMfaLoading(false);
 }
 };

 const handleVerifyMfa = async () => {
 if (verificationCode.length !== 6) return;
 setMfaLoading(true);
 try {
 const data = await verify2faSetup(twoFaSecret, verificationCode);
 setMfaEnabled(true);
 setVerificationCode('');
 if (data.recovery_codes) setRecoveryCodes(data.recovery_codes);
 await refreshUser();
 toast.success('Two-factor authentication enabled');
 } catch (err) {
 toast.error(isApiError(err) ? err.message : 'Verification failed');
 } finally {
 setMfaLoading(false);
 }
 };

 const handleDisableMfa = async () => {
 if (!disablePassword) { toast.error('Enter your password'); return; }
 setMfaLoading(true);
 try {
 await disable2fa(disablePassword);
 setMfaEnabled(false);
 setShowDisableModal(false);
 setDisablePassword('');
 await refreshUser();
 toast.success('Two-factor authentication disabled');
 } catch (err) {
 toast.error(isApiError(err) ? err.message : 'Failed to disable 2FA');
 } finally {
 setMfaLoading(false);
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
 <>
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

 {/* Two-Factor Authentication */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center gap-3 mb-6">
 <div className="rounded-lg bg-teal-50 p-2">
 <Shield className="size-5 text-teal-600" />
 </div>
 <h2 className="text-lg font-semibold text-stone-900">Two-Factor Authentication</h2>
 </div>

 {mfaEnabled ? (
 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
 <div className="flex items-center gap-3">
 <CheckCircle className="size-6 text-green-600" />
 <div>
 <p className="font-medium text-green-900">2FA is enabled</p>
 <p className="text-sm text-green-700">Using Authenticator App</p>
 </div>
 </div>
 <button
 onClick={() => setShowDisableModal(true)}
 className="px-3 py-1.5 text-sm border border-stone-300 rounded-md hover:bg-stone-50"
 >
 Disable
 </button>
 </div>
 <div className="p-4 bg-stone-50 rounded-xl text-sm text-stone-600">
 Recovery codes were shown when you first enabled 2FA. Contact support if you need them reset.
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
 <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-amber-700">
 Your account is not protected by two-factor authentication. Enable it for enhanced security.
 </p>
 </div>
 <button
 onClick={handleEnableMfa}
 disabled={mfaLoading}
 className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50"
 >
 <QrCode className="size-4" />
 {mfaLoading ? 'Setting up…' : 'Enable Authenticator App'}
 </button>
 </div>
 )}
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

 {/* 2FA Setup Modal */}
 {showMfaSetup && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMfaSetup(false)}>
 <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between p-6 border-b">
 <h2 className="text-lg font-semibold text-stone-900">Set Up Authenticator App</h2>
 <button onClick={() => setShowMfaSetup(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="size-5 text-stone-500" /></button>
 </div>
 <div className="p-6">
 {recoveryCodes ? (
 <div className="space-y-4">
 <div className="text-center">
 <CheckCircle className="size-10 text-green-600 mx-auto mb-2" />
 <p className="font-medium text-stone-900">Two-factor authentication enabled!</p>
 <p className="text-sm text-stone-500 mt-1">Save these recovery codes. You will only see them once.</p>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {recoveryCodes.map((code, i) => (
 <code key={i} className="bg-stone-100 px-3 py-2 rounded-lg text-sm font-mono text-stone-800 text-center">{code}</code>
 ))}
 </div>
 <button onClick={() => { setShowMfaSetup(false); setRecoveryCodes(null); }} className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Done</button>
 </div>
 ) : setupStep === 1 ? (
 <div className="space-y-4 text-center">
 {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto size-48" />}
 <p className="text-sm text-stone-600">Scan this QR code with your authenticator app, or enter the secret key manually:</p>
 <code className="block bg-stone-100 px-4 py-2 rounded-lg text-sm font-mono text-stone-800 break-all">{twoFaSecret}</code>
 <button onClick={() => setSetupStep(2)} className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Next</button>
 </div>
 ) : (
 <div className="space-y-4 text-center">
 <p className="text-stone-600 text-sm">Enter the 6-digit code from your authenticator app to confirm setup.</p>
 <input
 type="text"
 inputMode="numeric"
 value={verificationCode}
 onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
 placeholder="000000"
 className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
 maxLength={6}
 />
 <button
 onClick={handleVerifyMfa}
 disabled={verificationCode.length !== 6 || mfaLoading}
 className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
 >
 {mfaLoading ? 'Verifying…' : 'Verify & Enable 2FA'}
 </button>
 <button onClick={() => setSetupStep(1)} className="w-full text-sm text-stone-500 hover:text-stone-700">Back</button>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Disable 2FA Modal */}
 {showDisableModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDisableModal(false)}>
 <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between p-6 border-b">
 <h2 className="text-lg font-semibold text-stone-900">Disable Two-Factor Authentication</h2>
 <button onClick={() => setShowDisableModal(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="size-5 text-stone-500" /></button>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-sm text-stone-600">Enter your current password to confirm.</p>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
 <input
 type="password"
 value={disablePassword}
 onChange={(e) => setDisablePassword(e.target.value)}
 placeholder="Current password"
 className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
 />
 </div>
 <div className="flex gap-3">
 <button onClick={() => setShowDisableModal(false)} className="flex-1 py-2.5 border border-stone-300 rounded-lg text-sm hover:bg-stone-50">Cancel</button>
 <button
 onClick={handleDisableMfa}
 disabled={!disablePassword || mfaLoading}
 className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
 >
 {mfaLoading ? 'Disabling…' : 'Disable 2FA'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 );
}
