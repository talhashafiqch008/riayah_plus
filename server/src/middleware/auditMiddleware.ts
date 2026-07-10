import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/AuditService';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths (relative to /api) skipped by automatic HTTP audit logging. */
const SKIP_PATH_PREFIXES = [
  '/health',
  '/stripe/webhook',
  '/paytabs/webhook',
  '/webhook/whatsapp',
  '/livekit/webhook',
];

function shouldSkipAudit(req: Request): boolean {
  const path = req.path || '';
  return SKIP_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function resolveEntityId(req: Request): string | undefined {
  const params = req.params as Record<string, string | undefined>;
  return (
    params.id ??
    params.userId ??
    params.orgId ??
    params.clinicId ??
    params.bookingId ??
    params.episodeId
  );
}

function resolveEntity(req: Request): string | undefined {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length === 0) return undefined;
  // e.g. /admin/organizations/:id → Organization
  const resource = segments.find((s) => !s.startsWith(':') && s !== 'admin' && s !== 'api');
  if (!resource) return segments[0];
  return resource
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method) || shouldSkipAudit(req)) {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    if (res.locals.auditLogged) return;

    void AuditService.logHttpMutation({
      req,
      res,
      durationMs: Date.now() - startedAt,
      entity: resolveEntity(req),
      entityId: resolveEntityId(req),
    }).catch(() => {
      // Audit failures must not affect the API response path.
    });
  });

  next();
}

declare global {
  namespace Express {
    interface Locals {
      auditLogged?: boolean;
    }
  }
}
