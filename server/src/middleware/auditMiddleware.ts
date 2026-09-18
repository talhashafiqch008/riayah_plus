import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/AuditService';
import { logger } from '../config/logger';
import { sanitizeAuditEntity, sanitizeAuditEntityId } from '../utils/csvSafe';

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
  const raw =
    params.id ??
    params.userId ??
    params.orgId ??
    params.clinicId ??
    params.bookingId ??
    params.episodeId;
  return sanitizeAuditEntityId(raw);
}

function resolveEntity(req: Request): string | undefined {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length === 0) return undefined;
  // e.g. /admin/organizations/:id → Organization
  const resource = segments.find((s) => !s.startsWith(':') && s !== 'admin' && s !== 'api');
  return sanitizeAuditEntity(resource ?? segments[0]);
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
    }).catch((err) => {
      logger.error('audit_log_failure', {
        method: req.method,
        path: req.path,
        err: err instanceof Error ? err.message : String(err),
      });
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
