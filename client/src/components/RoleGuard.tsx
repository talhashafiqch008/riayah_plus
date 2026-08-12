
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, isProviderRole } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: 'careseeker' | 'provider' | 'admin';
  isAuthPage?: boolean;
}

export function RoleGuard({ children, allowedRoles, isAuthPage = false }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const userRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
  const isProvider = userRole === 'provider' || isProviderRole(userRole);
  const isCareseeker = ['careseeker', 'family', 'client'].includes(userRole);
  const isAdmin = userRole === 'admin';

  const hasAccess = (): boolean => {
    if (!user) return isAuthPage;
    switch (allowedRoles) {
      case 'careseeker': return isCareseeker || isAdmin;
      case 'provider':   return isProvider || isAdmin;
      case 'admin':      return isAdmin;
      default:           return false;
    }
  };

  useEffect(() => {
    if (loading || !user || isAuthPage || hasAccess()) return;

    // Redirect to the user's canonical dashboard so the protected URL is never exposed.
    if (isProvider) {
      navigate('/provider/dashboard', { replace: true });
    } else if (isCareseeker) {
      navigate('/careseeker', { replace: true });
    } else {
      navigate('/unauthorized', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAuthPage, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!hasAccess() && !isAuthPage) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
