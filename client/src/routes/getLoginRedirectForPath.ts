/**
 * Mirrors frontend/src/middleware.ts unauthenticated redirect behavior.
 */
export function getLoginRedirectForPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (path === '/admin/login') return '/';
    return '/admin/login';
  }

  if (path === '/provider' || path.startsWith('/provider/')) {
    if (path === '/provider/login' || path === '/provider/signup') return '/';
    return '/provider/login';
  }

  if (path === '/careseeker' || path.startsWith('/careseeker/')) {
    if (path === '/careseeker/login' || path === '/careseeker/phone-login') return '/';
    return '/careseeker/login';
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
