import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isProtectedPath } from '@/routes/getLoginRedirectForPath';

/**
 * Blocks protected routes until the initial session check completes,
 * preventing a flash of protected content before auth resolves.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const { pathname } = useLocation();

  if (loading && isProtectedPath(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  return <>{children}</>;
}
