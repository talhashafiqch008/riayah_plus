import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { setPasswordFromInvite } from '@/lib/api/invite';
import { isApiError } from '@/lib/errors';
import { getLoginRedirectForPath } from '@/routes/getLoginRedirectForPath';

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !token) {
      toast.error('Invalid invite link. Ask your administrator to resend the invite.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await setPasswordFromInvite(email, token, password);
      toast.success(result.message || 'Password set. You can now log in.');
      // Role-aware portal login (e.g. org_admin → /login?portal=org, not family)
      navigate(getLoginRedirectForPath(result.redirectPath || '/'));
    } catch (error: unknown) {
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to set password.');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to set password. The link may have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h2 className="text-2xl font-semibold text-stone-900 mb-2">Invalid Invite Link</h2>
          <p className="text-stone-600 mb-6">
            This link is missing required information or has expired.
          </p>
          <Link to="/login" className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-stone-900 mb-2">Set your password</h1>
          <p className="text-stone-600">Create a password for {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-200 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
