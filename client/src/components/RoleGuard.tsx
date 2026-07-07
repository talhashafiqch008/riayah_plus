
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isProviderRole } from '@/contexts/AuthContext';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: 'careseeker' | 'provider' | 'admin';
  isAuthPage?: boolean;
}

export function RoleGuard({ children, allowedRoles, isAuthPage = false }: RoleGuardProps) {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [showMessage, setShowMessage] = useState(false);

  const userRole = typeof user?.role === 'string' ? user.role.toLowerCase() : '';
  const isProvider = userRole === 'provider' || isProviderRole(userRole);
  const isCareseeker = ['careseeker', 'family', 'client'].includes(userRole);
  const isAdmin = userRole === 'admin';

  const hasAccess = useCallback(() => {
    if (!user) return isAuthPage;
    switch (allowedRoles) {
      case 'careseeker':
        return isCareseeker || isAdmin;
      case 'provider':
        return isProvider || isAdmin;
      case 'admin':
        return isAdmin;
      default:
        return false;
    }
  }, [user, isAuthPage, allowedRoles, isCareseeker, isAdmin, isProvider]);

  useEffect(() => {
    console.log('RoleGuard check:', { loading, userRole, isProvider, isCareseeker, isAdmin, allowedRoles, hasAccess: hasAccess() });
    if (!loading && user && !hasAccess() && !isAuthPage) {
      console.log('RoleGuard: Access denied, showing message');
      setShowMessage(true);
    }
  }, [loading, user, isAuthPage, isProvider, isCareseeker, hasAccess, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (showMessage) {
    const isWrongRole = isProvider && allowedRoles === 'careseeker';
    const isWrongRole2 = isCareseeker && allowedRoles === 'provider';

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
        >
          <div className="mx-auto size-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="size-8 text-amber-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            Wrong Account Type
          </h2>
          
          <p className="text-stone-600 mb-6">
            {isWrongRole && (
              <>You are currently logged in as a <strong>provider</strong>. This page is only available for careseekers. Please switch to your careseeker account or create one.</>
            )}
            {isWrongRole2 && (
              <>You are currently logged in as a <strong>careseeker</strong>. This page is only available for providers. Please switch to your provider account or create one.</>
            )}
            {!isWrongRole && !isWrongRole2 && (
              <>You don&apos;t have permission to access this page.</>
            )}
          </p>

          <div className="flex flex-col gap-3">
            {isWrongRole && (
              <>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/careseeker/login');
                  }}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="size-4" />
                  Switch to Careseeker Account
                </button>
                <button
                  onClick={() => navigate('/provider/dashboard')}
                  className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition-colors"
                >
                  Go to Provider Dashboard
                </button>
              </>
            )}
            {isWrongRole2 && (
              <>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/provider/login');
                  }}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="size-4" />
                  Switch to Provider Account
                </button>
                <button
                  onClick={() => navigate('/careseeker')}
                  className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition-colors"
                >
                  Go to Careseeker Dashboard
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-stone-400 mt-4">
            Please choose an option above to continue.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!hasAccess() && !isAuthPage) {
    return null;
  }

  return <>{children}</>;
}
