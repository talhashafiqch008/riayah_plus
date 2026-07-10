
import { Suspense } from "react";
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { LogIn, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ADMIN_ROLES } from '@/routes/getRoleDashboard';

function isAdminRole(role: string | undefined): boolean {
  const r = (role ?? '').toLowerCase();
  return (ADMIN_ROLES as readonly string[]).includes(r);
}

function AdminLoginForm() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdminRole(user.role)) {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);

      if (isAdminRole(userData.role)) {
        toast.success('Welcome to Admin Panel');
        navigate(redirectPath);
      } else {
        await logout();
        const message = 'Access denied. Admin credentials required.';
        setError(message);
        toast.error(message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full size-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (user && isAdminRole(user.role)) {
    return null;
  }

 return (
 <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
 <div className="w-full max-w-md">
 <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-8">
 <div className="flex items-center gap-3 mb-8">
 <div className="p-2 bg-teal-50 rounded-lg">
 <Shield className="size-6 text-teal-600" />
 </div>
 <div>
 <h1 className="text-xl font-semibold text-stone-900">Admin Access</h1>
 <p className="text-sm text-stone-500">Raiyah Platform Administration</p>
 </div>
 </div>

 {error && (
 <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
 <AlertCircle className="size-5 text-red-500 mt-0.5 flex-shrink-0" />
 <p className="text-sm text-red-700">{error}</p>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label htmlFor="admin-email" className="block text-sm font-medium text-stone-700 mb-1.5">
 Email
 </label>
 <input
 id="admin-email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="admin@riayah.com"
 required
 className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-stone-400"
 />
 </div>

 <div>
 <label htmlFor="admin-password" className="block text-sm font-medium text-stone-700 mb-1.5">
 Password
 </label>
 <div className="relative">
 <input
 id="admin-password"
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Enter your password"
 required
 className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-stone-400"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <div className="animate-spin rounded-full size-4 border-2 border-white border-t-transparent" />
 ) : (
 <>
 <LogIn className="size-4" />
 Sign In
 </>
 )}
 </button>
 </form>

 <div className="mt-6 pt-4 border-t border-stone-100 text-center">
 <button
 onClick={() => navigate('/')}
 className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
 >
 Return to Main Site
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

export default function AdminLoginPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-stone-100 flex items-center justify-center">
 <div className="animate-spin rounded-full size-8 border-b-2 border-teal-600" />
 </div>
 }>
 <AdminLoginForm />
 </Suspense>
 );
}
