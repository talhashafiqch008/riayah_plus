import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import { getRoleDashboard } from '@/routes/getRoleDashboard';
import { isApiError, isTwoFactorRequiredError } from '@/lib/errors';

export type ProposalPortalKey = keyof typeof ROLE_SHELLS;

interface ProposalPortalLoginPageProps {
  portal: ProposalPortalKey;
  redirectTo?: string;
}

export function ProposalPortalLoginPage({ portal, redirectTo }: ProposalPortalLoginPageProps) {
  const shell = ROLE_SHELLS[portal];
  const { login, logout, complete2faLogin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [pendingUserId, setPendingUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const finishPortalLogin = async (user: { role?: string }) => {
    const role = (user.role ?? '').toLowerCase();
    const allowed = shell.allowedRoles.map((r) => r.toLowerCase());

    if (!allowed.includes(role)) {
      await logout();
      setStep('credentials');
      setTwoFactorCode('');
      const message = `This portal is for ${shell.roleBadge} accounts. Please use the correct login for your role.`;
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(`Welcome to ${shell.portalTitle}`);
    navigate(redirectTo || getRoleDashboard(role), { replace: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      await finishPortalLogin(user);
    } catch (err: unknown) {
      if (isTwoFactorRequiredError(err)) {
        setPendingUserId(err.twoFaToken);
        setStep('2fa');
        setTwoFactorCode('');
        toast.success('Enter the 6-digit code from your authenticator app.');
        return;
      }

      if (
        isApiError(err) &&
        err.statusCode === 403 &&
        err.message?.toLowerCase().includes('email not verified')
      ) {
        toast.error('Please verify your email before logging in.');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      toast.error('Please enter the 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await complete2faLogin(pendingUserId, twoFactorCode);
      await finishPortalLogin(user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img
              src="/logo.png"
              alt="Riayah Plus"
              width={64}
              height={64}
              className="h-16 w-auto mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">
            {step === '2fa' ? 'Two-Factor Authentication' : shell.portalTitle}
          </h1>
          <p className="text-stone-500 mt-1">
            {step === '2fa'
              ? 'Enter the code from your authenticator app'
              : `Sign in to your ${shell.roleBadge} account`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-stone-200/50 p-8 border border-stone-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="portal-email" className="block text-sm font-medium text-stone-700 mb-1">
                  Email
                </label>
                <input
                  id="portal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label
                  htmlFor="portal-password"
                  className="block text-sm font-medium text-stone-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="portal-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handle2faSubmit} className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-teal-50 p-3">
                  <Shield className="size-8 text-teal-600" />
                </div>
              </div>
              <div>
                <label
                  htmlFor="portal-2fa"
                  className="mb-1 block text-center text-sm font-medium text-stone-700"
                >
                  Authentication code
                </label>
                <input
                  id="portal-2fa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTwoFactorCode('');
                  setError('');
                }}
                className="w-full text-sm text-stone-500 hover:text-stone-700"
              >
                Back to password
              </button>
            </form>
          )}

          {step === 'credentials' && (
            <p className="mt-6 text-center text-sm text-stone-500">
              <Link to="/forgot-password" className="text-teal-600 hover:underline">
                Forgot password?
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
