
import { Suspense, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { isApiError, isTwoFactorRequiredError } from '@/lib/errors';
import { getRoleDashboard } from '@/routes/getRoleDashboard';

function CareseekerLoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, complete2faLogin, user } = useAuth();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [pendingUserId, setPendingUserId] = useState('');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      toast.success('Email verified! You can now log in.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      const onboardingStatus = user.onboarding_status;
      if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
        navigate('/careseeker/onboarding');
      } else {
        navigate(getRoleDashboard(user.role ?? 'client'));
      }
    }
  }, [user, navigate]);

  const redirectAfterLogin = (loggedInUser: { role?: string; onboarding_status?: string }) => {
    const onboardingStatus = loggedInUser.onboarding_status;
    if (onboardingStatus && onboardingStatus !== 'complete' && onboardingStatus !== 'completed') {
      navigate('/careseeker/onboarding');
      return;
    }
    navigate(getRoleDashboard(loggedInUser.role ?? 'client'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);
      toast.success("Welcome back!");
      redirectAfterLogin(loggedInUser);
    } catch (error: unknown) {
      if (isTwoFactorRequiredError(error)) {
        setPendingUserId(error.twoFaToken);
        setStep('2fa');
        setTwoFactorCode('');
        toast.success('Enter the 6-digit code from your authenticator app.');
        return;
      }

      console.error("Login failed:", error);
      if (isApiError(error)) {
        if (error.statusCode === 403 && error.message?.toLowerCase().includes('email not verified')) {
          toast.error('Please verify your email before logging in.');
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        toast.error(error.message || 'Invalid email or password');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Invalid email or password');
      }
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
      toast.success('Welcome back!');
      redirectAfterLogin(loggedInUser);
    } catch (error: unknown) {
      if (isApiError(error)) {
        toast.error(error.message || 'Invalid verification code');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Invalid verification code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src="/logo.png" alt="Raiyah Plus" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl font-semibold text-stone-900 mb-2">
            {step === '2fa' ? 'Two-Factor Authentication' : 'Welcome to Raiyah Plus'}
          </h1>
          <p className="text-stone-600">
            {step === '2fa'
              ? 'Enter the code from your authenticator app'
              : 'Sign in to find and manage your care'}
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 ring-1 ring-stone-100/50">
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
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={`w-full px-4 py-3 border rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-transform duration-300 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-stone-300'}`}
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
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-transform duration-300 ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-stone-300'}`}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="size-4 accent-teal-600 border-stone-300 rounded focus:ring-teal-500" />
                  <span className="ml-2 text-stone-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-teal-600 hover:text-teal-700 font-semibold">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-teal-700 transition-transform duration-300 shadow-lg shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handle2faSubmit} className="space-y-6">
              <div className="flex justify-center">
                <div className="p-3 bg-teal-100 rounded-full">
                  <Shield className="size-8 text-teal-600" />
                </div>
              </div>

              <div>
                <label htmlFor="two-factor-code" className="block text-sm font-semibold text-stone-700 mb-2 text-center">
                  Authentication code
                </label>
                <input
                  id="two-factor-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.4em] px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full bg-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTwoFactorCode('');
                  setPendingUserId('');
                }}
                className="w-full text-sm text-stone-500 hover:text-stone-700"
              >
                ← Back to login
              </button>
            </form>
          )}

          {step === 'credentials' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t ring-1 ring-stone-200/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-stone-500">New to Raiyah Plus?</span>
                </div>
              </div>

              <button
                disabled
                className="block w-full text-center bg-stone-100 text-stone-400 font-semibold py-3 px-6 rounded-xl cursor-not-allowed text-sm"
              >
                Start Assessment — Coming Soon
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CareseekerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-teal-600" />
      </div>
    }>
      <CareseekerLoginForm />
    </Suspense>
  );
}
