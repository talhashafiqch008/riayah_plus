
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthRedirect({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 const navigate = useNavigate();

 useEffect(() => {
 if (!loading && user) {
 const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
 if (role === 'admin') navigate('/admin', { replace: true });
 else if (role === 'provider') navigate('/provider/dashboard', { replace: true });
 else navigate('/careseeker', { replace: true });
 }
 }, [user, loading, navigate]);

 return <>{children}</>;
}
