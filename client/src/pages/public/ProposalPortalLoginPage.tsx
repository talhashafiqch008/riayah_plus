import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import { getRoleDashboard } from '@/routes/getRoleDashboard';
import { isApiError } from '@/lib/errors';

export type ProposalPortalKey = keyof typeof ROLE_SHELLS;

interface ProposalPortalLoginPageProps {
  portal: ProposalPortalKey;
  redirectTo?: string;
}

export function ProposalPortalLoginPage({ portal, redirectTo }: ProposalPortalLoginPageProps) {
  const shell = ROLE_SHELLS[portal];
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const role = (user.role ?? '').toLowerCase();
      const allowed = shell.allowedRoles.map((r) => r.toLowerCase());

      if (!allowed.includes(role)) {
        await logout();
        const message = `This portal is for ${shell.roleBadge} accounts. Please use the correct login for your role.`;
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(`Welcome to ${shell.portalTitle}`);
      navigate(redirectTo || getRoleDashboard(role), { replace: true });
    } catch (err: unknown) {
      if (isApiError(err) && err.statusCode === 403 && err.message?.toLowerCase().includes('email not verified')) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="Riayah Plus" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{shell.portalTitle}</h1>
          <p className="text-stone-500 mt-1">Sign in to your {shell.roleBadge} account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-stone-200/50 p-8 border border-stone-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

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
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="portal-password" className="block text-sm font-medium text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="portal-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
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

          <p className="mt-6 text-center text-sm text-stone-500">
            <Link to="/forgot-password" className="text-teal-600 hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
