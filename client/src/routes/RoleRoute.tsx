import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboard } from './getRoleDashboard';
import { getLoginRedirectForPath } from './getLoginRedirectForPath';

interface RoleRouteProps {
  allowedRoles: string[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={getLoginRedirectForPath(location.pathname)}
        state={{ from: location }}
        replace
      />
    );
  }

  const userRole = user.role?.toLowerCase() ?? '';
  const allowed = allowedRoles.map((r) => r.toLowerCase());

  if (!allowed.includes(userRole)) {
    return <Navigate to={getRoleDashboard(userRole)} replace />;
  }

  return <Outlet />;
}
