import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboard } from '@/routes/getRoleDashboard';

/**
 * Generic /login entry point.
 *
 * Handles three cases:
 *  1. Already authenticated → redirect to the user's canonical dashboard.
 *  2. ?role=careseeker → redirect to /careseeker/login
 *  3. ?role=provider   → redirect to /provider/signup
 *  4. No role param    → default to /careseeker/login (most common)
 */
export default function LoginPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [params] = useSearchParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  // Case 1: already authenticated
  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  // Case 2 & 3: query-param role redirects
  const role = params.get('role');
  if (role === 'careseeker') return <Navigate to="/careseeker/login" replace />;
  if (role === 'provider')   return <Navigate to="/provider/signup" replace />;
  if (role === 'admin')      return <Navigate to="/admin/login" replace />;

  // Case 4: default
  return <Navigate to="/careseeker/login" replace />;
}
