import { Suspense, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth, isProviderRole } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { isApiError, isTwoFactorRequiredError } from '@/lib/errors';

function ProviderLoginForm() {
  const navigate = useNavigate();
  const { login, logout, complete2faLogin, user } = useAuth();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [pendingUserId, setPendingUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && isProviderRole(user.role ?? '')) {
      const onboardingStatus = user.onboarding_status;
      if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
        navigate('/provider/onboarding');
      } else {
        navigate('/provider/dashboard');
      }
    }
  }, [user, navigate]);

  const redirectProvider = (loggedInUser: { role?: string; onboarding_status?: string }) => {
    if (!isProviderRole(loggedInUser.role ?? '')) {
      void logout();
      toast.error('This portal is for provider accounts only (doctor, nurse, therapist, etc.).');
      setStep('credentials');
      return;
    }

    toast.success('Welcome back!');
    const onboardingStatus = loggedInUser.onboarding_status;
    if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
      navigate('/provider/onboarding');
    } else {
      navigate('/provider/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';
    if (!password.trim()) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);
      redirectProvider(loggedInUser);
    } catch (error: unknown) {
      if (isTwoFactorRequiredError(error)) {
        setPendingUserId(error.twoFaToken);
        setStep('2fa');
        setTwoFactorCode('');
        toast.success('Enter the 6-digit code from your authenticator app.');
        return;
      }
      if (isApiError(error)) toast.error(error.message || 'Invalid email or password');
      else if (error instanceof Error) toast.error(error.message);
      else toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      toast.error('Please enter the 6-digit code.');
      return;
    }
    setIsLoading(true);
    try {
      const loggedInUser = await complete2faLogin(pendingUserId, twoFactorCode);
      redirectProvider(loggedInUser);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message || 'Invalid verification code');
      else if (error instanceof Error) toast.error(error.message);
      else toast.error('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src="/logo.png" alt="Raiyah Plus" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl font-semibold text-stone-900 mb-2">
            {step === '2fa' ? 'Two-Factor Authentication' : 'Provider Portal'}
          </h1>
          <p className="text-stone-600">
            {step === '2fa'
              ? 'Enter the code from your authenticator app'
              : 'Sign in to manage your clients and schedule'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-100">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  className={`w-full px-4 py-3 border rounded-xl ${errors.email ? 'border-red-500' : 'border-stone-300'}`}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-stone-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl ${errors.password ? 'border-red-500' : 'border-stone-300'}`}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="size-4 accent-green-600 border-stone-300 rounded" />
                  <span className="ml-2 text-stone-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-green-600 hover:text-green-700 font-semibold">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handle2faSubmit} className="space-y-6">
              <div className="flex justify-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <Shield className="size-8 text-green-600" />
                </div>
              </div>
              <div>
                <label htmlFor="provider-2fa" className="block text-sm font-semibold text-stone-700 mb-2 text-center">
                  Authentication code
                </label>
                <input
                  id="provider-2fa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl text-center tracking-[0.4em] font-mono text-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl disabled:opacity-50"
              >
                {isLoading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTwoFactorCode('');
                }}
                className="w-full text-sm text-stone-500"
              >
                Back to password
              </button>
            </form>
          )}

          {step === 'credentials' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-stone-500">New provider?</span>
                </div>
              </div>
              <button
                disabled
                className="block w-full text-center bg-stone-100 text-stone-400 font-semibold py-3 px-6 rounded-xl cursor-not-allowed text-sm"
              >
                Join Our Network — Coming Soon
              </button>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-stone-600">
            Looking for care?{' '}
            <Link to="/careseeker/login" className="text-teal-600 hover:text-teal-700 font-semibold">
              Find Care Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProviderLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-green-600" />
        </div>
      }
    >
      <ProviderLoginForm />
    </Suspense>
  );
}
