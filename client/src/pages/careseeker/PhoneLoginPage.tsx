
/**
 * Phone Login Page for Careseekers
 * OTP-based authentication for Middle East market
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Loader2, Shield } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';
import { PhoneAuthService } from '@/lib/phone-auth';
import { verifyPhoneOtp } from '@/lib/api/auth';
import { CountryCode } from '@/config/countries';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { STORAGE_KEYS } from '@/lib/storage-keys';




export default function PhoneLoginPage() {
 const navigate = useNavigate();
 const [step, setStep] = useState<'phone' | 'otp'>('phone');
 const [fullPhoneNumber, setFullPhoneNumber] = useState('');
 const [countryCode, setCountryCode] = useState<CountryCode>(CountryCode.QA); // Qatar default
 const [otp, setOtp] = useState('');
 const [loading, setLoading] = useState(false);
 // sessionId not needed for current mock implementation but kept for future
 const [sessionId, setSessionId] = useState('');

 const handleSendOTP = async () => {
 // Basic validation: Full phone should have enough digits (e.g. > 8 chars)
 if (!fullPhoneNumber || fullPhoneNumber.replace(/[^0-9]/g, '').length < 8) {
 toast.error('Please enter a valid phone number');
 return;
 }

 setLoading(true);
 try {
 // PhoneAuthService.sendOTP takes (phoneNumber, countryCode)
 const result = await PhoneAuthService.sendOTP(fullPhoneNumber, countryCode);

 if (result.success) {
 // Mock result usually doesn't return session_id in current implementation, 
 // but if it did, we'd store it. 
 // Checking result.success is enough.
 setStep('otp');
 toast.success(result.message || 'OTP sent to your phone!');
 } else {
 toast.error(result.message || 'Failed to send OTP.');
 }
 } catch (error: unknown) {
 console.error('Send OTP error:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to send OTP. Please try again.');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to send OTP. Please try again.');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleVerifyOTP = async () => {
 if (otp.length !== 6) {
 toast.error('Please enter the 6-digit code');
 return;
 }

 setLoading(true);
 try {
 const result = await verifyPhoneOtp(fullPhoneNumber, otp, countryCode);

 if (result.is_registered === false) {
 toast.success('Phone verified successfully!');
 navigate('/careseeker/onboarding');
 return;
 }

 if (result.accessToken) {
 toast.success('Phone verified successfully!');
 localStorage.setItem(STORAGE_KEYS.token, result.accessToken);
 localStorage.setItem(STORAGE_KEYS.apiToken, result.accessToken);
 if (result.user) {
 localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(result.user));
 }
 navigate('/careseeker');
 } else {
 toast.error('Invalid verification code. Please try again.');
 }
 } catch (error: unknown) {
 console.error('Verify OTP error:', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to verify OTP. Please try again.');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to verify OTP. Please try again.');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleResendOTP = async () => {
 await handleSendOTP();
 };

 return (
 <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
 <div className="w-full max-w-md">
 {/* Header */}
 <div className="text-center mb-8">
 <div className="size-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
 <Phone className="size-8 text-white" />
 </div>
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">
 {step === 'phone' ? 'Sign In' : 'Verify Code'}
 </h1>
 <p className="text-stone-600">
 {step === 'phone'
 ? 'Enter your phone number to continue'
 : `We sent a code to ${fullPhoneNumber}`
 }
 </p>
 </div>

 {/* Card */}
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-stone-200/50 p-8">
 {step === 'phone' ? (
 // Phone Number Step
 <div className="space-y-6">
 <div>
 <span className="block text-sm font-medium text-stone-700 mb-2">
 Phone Number
 </span>
 <PhoneInput
 value={fullPhoneNumber}
 onChange={(phone, country) => {
 setFullPhoneNumber(phone);
 setCountryCode(country);
 }}
 defaultCountry={CountryCode.QA}
 />
 <p className="text-xs text-stone-500 mt-2">
 We'll send you a verification code via SMS
 </p>
 </div>

 <button
 onClick={handleSendOTP}
 disabled={loading || !fullPhoneNumber}
 className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-transform duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {loading ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 Sending…
 </>
 ) : (
 <>
 Continue
 <ArrowRight className="size-5" />
 </>
 )}
 </button>

 {/* Alternative Login */}
 <div className="text-center">
 <p className="text-sm text-stone-600">
 Or{' '}
 <button
 onClick={() => navigate('/careseeker/login')}
 className="text-teal-600 hover:text-teal-700 font-medium"
 >
 sign in with email
 </button>
 </p>
 </div>
 </div>
 ) : (
 // OTP Verification Step
 <div className="space-y-6">
 <div>
 <label htmlFor="input-src-app-careseeker-phone-login-page-tsx-188-190" className="block text-sm font-medium text-stone-700 mb-2">
 Verification Code
 </label>
 <input
 type="text"
 inputMode="numeric"
 maxLength={6}
 value={otp}
 onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
 placeholder="000000"
 className="w-full p-4 text-center text-2xl font-bold tracking-widest ring-1 ring-stone-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
 />
 <p className="text-xs text-stone-500 mt-2">
 Enter the 6-digit code we sent you
 </p>
 </div>

 <button
 onClick={handleVerifyOTP}
 disabled={loading || otp.length !== 6}
 className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-transform duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {loading ? (
 <>
 <Loader2 className="size-5 animate-spin" />
 Verifying…
 </>
 ) : (
 <>
 Verify & Continue
 <ArrowRight className="size-5" />
 </>
 )}
 </button>

 {/* Resend & Back */}
 <div className="flex items-center justify-between text-sm">
 <button
 onClick={() => setStep('phone')}
 className="text-stone-600 hover:text-stone-900"
 >
 ← Change number
 </button>
 <button
 onClick={handleResendOTP}
 disabled={loading}
 className="text-teal-600 hover:text-teal-700 font-medium"
 >
 Resend code
 </button>
 </div>
 </div>
 )}

 {/* Security Notice */}
 <div className="mt-6 p-4 bg-stone-50 rounded-lg flex items-start gap-3">
 <Shield className="size-5 text-stone-400 flex-shrink-0 mt-0.5" />
 <p className="text-xs text-stone-600">
 Your phone number is secure and will only be used for authentication and important updates.
 </p>
 </div>
 </div>

 {/* Footer */}
 <p className="text-center text-sm text-stone-500 mt-6">
 Don't have an account?{' '}
 <button
 onClick={() => navigate('/careseeker/onboarding')}
 className="text-teal-600 hover:text-teal-700 font-medium"
 >
 Get started
 </button>
 </p>
 </div>
 </div>
 );
}
