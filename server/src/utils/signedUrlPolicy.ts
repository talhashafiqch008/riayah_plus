/** Prefixes admins may sign via generic signed-URL endpoints (AUTHZ-08). */
export const ADMIN_SIGNABLE_PREFIXES = [
  'documents/',
  'intake/',
] as const;

export const MAX_SIGNED_URL_TTL_SECONDS = 3600;

export function clampSignedUrlTtl(raw: unknown, fallback = 3600): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), MAX_SIGNED_URL_TTL_SECONDS);
}

export function assertSignableObjectKey(key: string, opts: {
  userId: string;
  isAdmin: boolean;
}): void {
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
    throw new Error('INVALID_KEY');
  }

  if (opts.isAdmin) {
    const allowed = ADMIN_SIGNABLE_PREFIXES.some((p) => key.startsWith(p));
    if (!allowed) throw new Error('ADMIN_PREFIX_DENIED');
    return;
  }

  const owned =
    key.startsWith(`documents/${opts.userId}/`) ||
    key.startsWith(`intake/${opts.userId}/`);
  if (!owned) throw new Error('NOT_OWNED');
}
