import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminAuthState {
  user: ReturnType<typeof useAuth>['user'];
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

export function useAdminAuth(): AdminAuthState {
  const { user, loading: authLoading, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        navigate('/admin/login', { replace: true });
      }
      return;
    }

    const hasAdminRole =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'support_admin';
    setIsAdmin(hasAdminRole);
    setIsLoading(false);

    if (!hasAdminRole && pathname.startsWith('/admin') && pathname !== '/admin/login') {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, pathname, navigate]);

  const logout = useCallback(() => {
    authLogout();
    navigate('/admin/login', { replace: true });
  }, [authLogout, navigate]);

  return {
    user,
    isAdmin,
    isLoading: isLoading || authLoading,
    isAuthenticated: !!user,
    logout,
  };
}
