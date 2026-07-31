import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboard } from '@/routes/getRoleDashboard';
import {
  ProposalPortalLoginPage,
  type ProposalPortalKey,
} from '@/pages/public/ProposalPortalLoginPage';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';

const PORTAL_KEYS = Object.keys(ROLE_SHELLS) as ProposalPortalKey[];

function isProposalPortal(value: string | null): value is ProposalPortalKey {
  return !!value && PORTAL_KEYS.includes(value as ProposalPortalKey);
}

/**
 * Generic /login entry point.
 *
 * - ?portal=family|patient|coordinator|clinical|support|org → branded proposal portal login
 * - ?role=admin → admin login
 * - default / legacy careseeker|provider roles → family portal login
 */
export default function LoginPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  const portal = params.get('portal');

  if (isProposalPortal(portal)) {
    if (isAuthenticated && user) {
      const role = (user.role ?? '').toLowerCase();
      const allowed = ROLE_SHELLS[portal].allowedRoles.map((r) => r.toLowerCase());
      if (allowed.includes(role)) {
        return <Navigate to={redirectTo || getRoleDashboard(role)} replace />;
      }
    }
    return <ProposalPortalLoginPage portal={portal} redirectTo={redirectTo} />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  const role = params.get('role');
  if (role === 'admin') return <Navigate to="/admin/login" replace />;

  // Default and retired marketplace roles → family portal login
  return <Navigate to="/login?portal=family" replace />;
}
