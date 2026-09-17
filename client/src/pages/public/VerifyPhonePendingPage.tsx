import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Phone, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendOtp, verifyPhoneOtp } from '@/lib/api/auth';
import { isApiError } from '@/lib/errors';

export default function VerifyPhonePendingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get('phone') ?? '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Missing phone number.');
      return;
    }
    if (otp.trim().length < 4) {
      toast.error('Enter the SMS verification code.');
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp.trim());
      toast.success('Phone verified. Please sign in.');
      navigate(`/login?portal=family&phone=${encodeURIComponent(phone)}`, { replace: true });
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    setResending(true);
    try {
      await sendOtp(phone);
      toast.success('A new SMS code was sent.');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 size-16 rounded-full bg-teal-100 flex items-center justify-center">
            <Phone className="size-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-stone-900 mb-2">Verify Your Phone</h2>
          <p className="text-stone-600 mb-2">We sent a 6-digit SMS code to</p>
          {phone ? (
            <p className="font-medium text-stone-900 mb-6">{phone}</p>
          ) : (
            <p className="text-stone-500 mb-6">your phone</p>
          )}

          <form onSubmit={handleVerify} className="space-y-4 text-left">
            <div>
              <label htmlFor="phone-otp" className="block text-sm font-medium text-stone-700 mb-1">
                SMS code
              </label>
              <input
                id="phone-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify phone'}
            </button>
          </form>

          {phone && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${resending ? 'animate-spin' : ''}`} />
              Resend SMS code
            </button>
          )}

          <Link
            to="/login?portal=family"
            className="mt-6 inline-flex items-center text-teal-600 hover:text-teal-700 font-medium"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
