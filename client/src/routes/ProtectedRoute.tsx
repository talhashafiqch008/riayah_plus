import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getLoginRedirectForPath } from './getLoginRedirectForPath';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={getLoginRedirectForPath(location.pathname)}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}
