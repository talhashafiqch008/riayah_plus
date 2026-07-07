import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboard } from '@/routes/getRoleDashboard';

export default function DashboardRedirectPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return <Navigate to={getRoleDashboard(user.role)} replace />;
}
