
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

;
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { enable2fa, verify2faSetup, disable2fa, getSessions, revokeSession } from '@/lib/api';
import { isApiError } from '@/lib/errors';
import {
 ArrowLeft, Shield, Smartphone, Key, Mail, Lock,
 Check, X, AlertCircle, ChevronRight, QrCode,
 Laptop, Tablet, MonitorSmartphone, Trash2, Clock,
 MapPin, CheckCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Device {
 id: string;
 name: string;
 ip_address: string | null;
 user_agent: string | null;
 last_used_at: string | null;
 created_at: string;
 current: boolean;
}

function getDeviceType(userAgent: string | null): 'desktop' | 'mobile' | 'tablet' {
 if (!userAgent) return 'desktop';
 const ua = userAgent.toLowerCase();
 if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
 if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
 return 'desktop';
}

function formatRelativeTime(dateString: string | null): string {
 if (!dateString) return 'Never';
 const date = new Date(dateString);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const diffSec = Math.floor(diffMs / 1000);
 const diffMin = Math.floor(diffSec / 60);
 const diffHour = Math.floor(diffMin / 60);
 const diffDay = Math.floor(diffHour / 24);

 if (diffSec < 60) return 'Just now';
 if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
 if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
 if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
 return date.toLocaleDateString();
}

export default function SecurityPage() {
 const { user, refreshUser } = useAuth();
 const [mfaEnabled, setMfaEnabled] = useState(false);
 const [mfaMethod, setMfaMethod] = useState<'app' | 'sms' | null>(null);
 const [showMfaSetup, setShowMfaSetup] = useState(false);
 const [setupStep, setSetupStep] = useState(1);
 const [verificationCode, setVerificationCode] = useState('');
 const [devices, setDevices] = useState<Device[]>([]);
 const [devicesLoading, setDevicesLoading] = useState(true);
 const [showRemoveDeviceModal, setShowRemoveDeviceModal] = useState(false);
 const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
 const [twoFaSecret, setTwoFaSecret] = useState('');
 const [qrCodeUrl, setQrCodeUrl] = useState('');
 const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
 const [disablePassword, setDisablePassword] = useState('');
 const [showDisableModal, setShowDisableModal] = useState(false);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 if (user?.two_factor_enabled) {
 setMfaEnabled(true);
 setMfaMethod('app');
 }
 }, [user]);

 const fetchDevices = useCallback(async () => {
 setDevicesLoading(true);
 try {
 const data = await getSessions();
 const sessions = data?.data || data?.sessions || data || [];
 setDevices(Array.isArray(sessions) ? sessions : []);
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message);
 } else {
 toast.error('Failed to load devices');
 }
 } finally {
 setDevicesLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchDevices();
 }, [fetchDevices]);

 const handleEnableMfa = async (method: 'app' | 'sms') => {
 if (method === 'sms') {
 toast.error('SMS 2FA is not yet available. Please use an authenticator app.');
 return;
 }
 setMfaMethod(method);
 setSetupStep(1);
 setRecoveryCodes(null);
 setVerificationCode('');
 setLoading(true);
 try {
 const data = await enable2fa();
 setTwoFaSecret(data.secret);
 setQrCodeUrl(data.qr_code_url);
 setShowMfaSetup(true);
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message);
 } else {
 toast.error('Failed to start 2FA setup');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleVerifyMfa = async () => {
 if (verificationCode.length !== 6) return;
 setLoading(true);
 try {
 const data = await verify2faSetup(twoFaSecret, verificationCode);
 setMfaEnabled(true);
 setSetupStep(1);
 setVerificationCode('');
 if (data.recovery_codes) {
 setRecoveryCodes(data.recovery_codes);
 }
 await refreshUser();
 toast.success(data.message || 'Two-factor authentication enabled');
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message);
 } else {
 toast.error('Verification failed');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleDisableMfa = async () => {
 if (!disablePassword) {
 toast.error('Please enter your password');
 return;
 }
 setLoading(true);
 try {
 await disable2fa(disablePassword);
 setMfaEnabled(false);
 setMfaMethod(null);
 setShowDisableModal(false);
 setDisablePassword('');
 await refreshUser();
 toast.success('Two-factor authentication disabled');
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message);
 } else {
 toast.error('Failed to disable 2FA');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleRemoveDevice = (device: Device) => {
 setDeviceToRemove(device);
 setShowRemoveDeviceModal(true);
 };

 const confirmRemoveDevice = async () => {
 if (!deviceToRemove) return;
 setLoading(true);
 try {
 await revokeSession(deviceToRemove.id);
 setDevices(devices.filter(d => d.id !== deviceToRemove.id));
 setShowRemoveDeviceModal(false);
 setDeviceToRemove(null);
 toast.success('Device removed successfully');
 } catch (error: unknown) {
 if (isApiError(error)) {
 toast.error(error.message);
 } else {
 toast.error('Failed to remove device');
 }
 } finally {
 setLoading(false);
 }
 };

 const getDeviceIcon = (type: string) => {
 switch (type) {
 case 'mobile': return Smartphone;
 case 'tablet': return Tablet;
 default: return Laptop;
 }
 };

 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-3xl mx-auto space-y-6">
 {/* Header */}
 <div className="flex items-center gap-4">
 <Link to="/careseeker/settings" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div>
 <h1 className="text-2xl font-semibold text-stone-900">Security Settings</h1>
 <p className="text-stone-600">Manage MFA and connected devices</p>
 </div>
 </div>

 {/* MFA Section */}
 <div className="bg-white rounded-xl ring-1 ring-stone-200/50 overflow-hidden">
 <div className="p-6 border-b ring-1 ring-stone-100/50">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-teal-100 rounded-lg">
 <Shield className="size-5 text-teal-600" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-stone-900">Two-Factor Authentication (MFA)</h2>
 <p className="text-sm text-stone-500">Add an extra layer of security to your account</p>
 </div>
 </div>
 </div>

 <div className="p-6">
 {mfaEnabled ? (
 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
 <div className="flex items-center gap-3">
 <CheckCircle className="size-6 text-green-600" />
 <div>
 <p className="font-medium text-green-900">MFA is enabled</p>
 <p className="text-sm text-green-700">
 Using {mfaMethod === 'app' ? 'Authenticator App' : 'SMS'}
 </p>
 </div>
 </div>
 <Button variant="outline" size="sm" onClick={() => setShowDisableModal(true)}>
 Disable
 </Button>
 </div>

 <div className="p-4 bg-stone-50 rounded-xl">
 <h4 className="font-medium text-stone-900 mb-2">Recovery Options</h4>
 <p className="text-sm text-stone-600 mb-3">
 Make sure you have backup recovery codes in case you lose access to your MFA device.
 </p>
 <Button variant="outline" size="sm" onClick={() => toast.error('Recovery codes were shown when you first enabled 2FA. Please contact support if you lost them.')}
>
 <Key className="size-4 mr-2" />
 View Recovery Codes
 </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
 <AlertCircle className="size-5 text-amber-600 flex-shrink-0" />
 <p className="text-sm text-amber-700">
 Your account is not protected by two-factor authentication. We recommend enabling it for enhanced security.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 onClick={() => handleEnableMfa('app')}
 disabled={loading}
 className="p-4 ring-1 ring-stone-200/50 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-transform duration-300 text-left group disabled:opacity-50"
 >
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200">
 <QrCode className="size-5 text-purple-600" />
 </div>
 <div>
 <p className="font-medium text-stone-900">Authenticator App</p>
 <p className="text-xs text-stone-500">Recommended</p>
 </div>
 </div>
 <p className="text-sm text-stone-600">
 Use Google Authenticator, Authy, or similar app
 </p>
 </button>

 <button
 onClick={() => handleEnableMfa('sms')}
 disabled={loading}
 className="p-4 ring-1 ring-stone-200/50 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-transform duration-300 text-left group disabled:opacity-50"
 >
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200">
 <Smartphone className="size-5 text-blue-600" />
 </div>
 <div>
 <p className="font-medium text-stone-900">SMS Verification</p>
 <p className="text-xs text-stone-500">Quick setup</p>
 </div>
 </div>
 <p className="text-sm text-stone-600">
 Receive verification codes via SMS
 </p>
 </button>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Connected Devices */}
 <div className="bg-white rounded-xl ring-1 ring-stone-200/50 overflow-hidden">
 <div className="p-6 border-b ring-1 ring-stone-100/50">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-100 rounded-lg">
 <MonitorSmartphone className="size-5 text-blue-600" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-stone-900">Connected Devices</h2>
 <p className="text-sm text-stone-500">Manage devices with active sessions</p>
 </div>
 </div>
 <Button variant="outline" size="sm" disabled={devicesLoading || devices.length === 0}>
 Sign out all
 </Button>
 </div>
 </div>

 <div className="divide-y divide-stone-100">
 {devicesLoading ? (
 <div className="p-8 flex items-center justify-center">
 <Loader2 className="size-6 text-stone-400 animate-spin" />
 <span className="ml-2 text-stone-500">Loading devices&hellip;</span>
 </div>
 ) : devices.length === 0 ? (
 <div className="p-8 text-center text-stone-500">
 No active sessions found.
 </div>
 ) : (
 devices.map((device) => {
 const deviceType = getDeviceType(device.user_agent);
 const DeviceIcon = getDeviceIcon(deviceType);
 return (
 <div key={device.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
 <div className="flex items-center gap-4">
 <div className={`p-2 rounded-lg ${device.current ? 'bg-green-100' : 'bg-stone-100'}`}>
 <DeviceIcon className={`size-5 ${device.current ? 'text-green-600' : 'text-stone-600'}`} />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <p className="font-medium text-stone-900">{device.name}</p>
 {device.current && (
 <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
 This device
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 text-sm text-stone-500 flex-wrap">
 {device.ip_address && (
 <span className="flex items-center gap-1">
 <MapPin className="size-3" />
 {device.ip_address}
 </span>
 )}
 {device.user_agent && (
 <span className="flex items-center gap-1">
 <Laptop className="size-3" />
 {device.user_agent.length > 40 ? device.user_agent.slice(0, 40) + '&hellip;' : device.user_agent}
 </span>
 )}
 <span className="flex items-center gap-1">
 <Clock className="size-3" />
 {formatRelativeTime(device.last_used_at)}
 </span>
 </div>
 </div>
 </div>
 {!device.current && (
 <button
 onClick={() => handleRemoveDevice(device)}
 disabled={loading}
 className="p-2 hover:bg-red-100 rounded-lg text-red-700 hover:text-red-600 transition-colors disabled:opacity-50"
 >
 <Trash2 className="size-4" />
 </button>
  )}
  </div>
  );
  })
 )}
 </div>

 <div className="p-4 border-t ring-1 ring-stone-100/50 bg-stone-50">
 <Button variant="outline" className="w-full" size="sm" disabled={devicesLoading || devices.length === 0}>
 Sign out of all other devices
 </Button>
 </div>
 </div>

 {/* Password Section */}
 <div className="bg-white rounded-xl ring-1 ring-stone-200/50 p-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-orange-100 rounded-lg">
 <Lock className="size-5 text-orange-600" />
 </div>
 <div>
 <h2 className="font-semibold text-stone-900">Password</h2>
 <p className="text-sm text-stone-500">Last changed 30 days ago</p>
 </div>
 </div>
 <Button variant="outline" size="sm">
 Change Password
 </Button>
 </div>
 </div>

 {/* MFA Setup Modal */}
 {showMfaSetup && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowMfaSetup(false); } }} onClick={() => setShowMfaSetup(false)}>
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b ring-1 ring-stone-200/50">
 <h2 className="text-lg font-semibold text-stone-900">
 Set up {mfaMethod === 'app' ? 'Authenticator App' : 'SMS Verification'}
 </h2>
 </div>
 <div className="p-6">
 {recoveryCodes ? (
 <div className="space-y-4">
 <div className="text-center">
 <CheckCircle className="size-10 text-green-600 mx-auto mb-2" />
 <p className="font-medium text-stone-900">Two-factor authentication enabled!</p>
 <p className="text-sm text-stone-600 mt-1">Save these recovery codes in a safe place. You will only see them once.</p>
 </div>
 <div className="grid grid-cols-2 gap-2">
 {recoveryCodes.map((code, n) => (
 <code key={`item-${n}`} className="bg-stone-100 px-3 py-2 rounded-lg text-sm font-mono text-stone-800 text-center">
 {code}
 </code>
 ))}
 </div>
 <Button
 onClick={() => { setShowMfaSetup(false); setRecoveryCodes(null); setTwoFaSecret(''); setQrCodeUrl(''); }}
 className="w-full"
 >
 Done
 </Button>
 </div>
 ) : (
 <>
 {mfaMethod === 'app' && setupStep === 1 && (
 <div className="text-center space-y-4">
 {qrCodeUrl && (
 <img width={100} height={100} src={qrCodeUrl} alt="2FA QR Code" className="mx-auto size-48" loading="lazy" />
 )}
 <p className="text-sm text-stone-600">
 Scan this QR code with your authenticator app, or enter this secret key manually:
 </p>
 <code className="block bg-stone-100 px-4 py-2 rounded-lg text-sm font-mono text-stone-800 break-all">
 {twoFaSecret}
 </code>
 <Button onClick={() => setSetupStep(2)} className="w-full">
 Next
 </Button>
 </div>
 )}
 {mfaMethod === 'app' && setupStep === 2 && (
 <div className="text-center space-y-4">
 <p className="text-stone-600">
 Enter the 6-digit code from your authenticator app to verify setup.
 </p>
 <input
 type="text"
 value={verificationCode}
 onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
 placeholder="000000"
 className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none mb-4"
 maxLength={6}
 />
 <Button
 onClick={handleVerifyMfa}
 disabled={verificationCode.length !== 6 || loading}
 className="w-full"
 >
 {loading ? 'Verifying&hellip;' : 'Verify & Enable MFA'}
 </Button>
 </div>
 )}
 </>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Disable 2FA Modal */}
 {showDisableModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowDisableModal(false); } }} onClick={() => setShowDisableModal(false)}>
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-md" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b ring-1 ring-stone-200/50">
 <h2 className="text-lg font-semibold text-stone-900">Disable Two-Factor Authentication</h2>
 </div>
 <div className="p-6 space-y-4">
 <p className="text-stone-600">
 To disable 2FA, please enter your current password for security verification.
 </p>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
 <input
 type="password"
 value={disablePassword}
 onChange={(e) => setDisablePassword(e.target.value)}
 placeholder="Current password"
 className="w-full pl-12 pr-4 py-3 bg-stone-50 border-2 ring-1 ring-stone-200/50 rounded-xl focus:border-teal-500 focus:outline-none transition-colors"
 />
 </div>
 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowDisableModal(false)}>
 Cancel
 </Button>
 <Button
 className="flex-1 bg-red-600 hover:bg-red-700"
 onClick={handleDisableMfa}
 disabled={loading || !disablePassword}
 >
 {loading ? 'Disabling&hellip;' : 'Disable 2FA'}
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Remove Device Modal */}
 {showRemoveDeviceModal && deviceToRemove && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowRemoveDeviceModal(false); } }} onClick={() => setShowRemoveDeviceModal(false)}>
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-md" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b ring-1 ring-stone-200/50">
 <h2 className="text-lg font-semibold text-stone-900">Remove Device</h2>
 </div>
 <div className="p-6">
 <p className="text-stone-600 mb-4">
 Are you sure you want to remove <strong>{deviceToRemove.name}</strong>? This will sign out the device immediately.
 </p>
 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowRemoveDeviceModal(false)}>
 Cancel
 </Button>
 <Button
 className="flex-1 bg-red-600 hover:bg-red-700"
 onClick={confirmRemoveDevice}
 disabled={loading}
 >
 {loading ? 'Removing&hellip;' : 'Remove'}
 </Button>
  </div>
  </div>
  </div>
  </div>
  )}
  </motion.div>
  );
 }
