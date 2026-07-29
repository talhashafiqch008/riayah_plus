/**
 * Mirrors frontend/src/middleware.ts unauthenticated redirect behavior.
 * Retired marketplace roles (provider/careseeker) go to the family portal login.
 */
export function getLoginRedirectForPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (path === '/admin/login') return '/';
    return '/admin/login';
  }

  // Marketplace provider/careseeker portals retired → family login
  if (path === '/provider' || path.startsWith('/provider/')) {
    return '/login?portal=family';
  }

  if (path === '/careseeker' || path.startsWith('/careseeker/')) {
    return '/login?portal=family';
  }

  const proposalPrefixes = ['/family', '/patient', '/coordinator', '/clinical', '/support'];
  const match = proposalPrefixes.find((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (match) {
    return `/login?portal=${match.slice(1)}`;
  }

  return '/';
}

export function isProtectedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const prefixes = [
    '/admin',
    '/provider',
    '/careseeker',
    '/family',
    '/patient',
    '/coordinator',
    '/clinical',
    '/support',
    '/staff',
    '/trainer',
    '/dashboard',
    '/chat/',
    '/conversations',
    '/meeting/',
    '/room/',
    '/meet-ai',
  ];
  return prefixes.some(
    (prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix),
  );
}
