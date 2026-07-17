import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'support_admin'];

/** Platform-wide roles that always bypass tenant filters. */
const PLATFORM_BYPASS_ROLES: UserRole[] = ['super_admin'];

export interface TenantContext {
  organizationId: string | null;
  clinicId: string | null;
  departmentId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Loads organization/clinic/department from the authenticated user onto req.tenant.
 * Use before handlers that should scope queries to the user's org.
 */
export async function attachTenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { organizationId: true, clinicId: true, departmentId: true },
    });

    req.tenant = {
      organizationId: user?.organizationId ?? null,
      clinicId: user?.clinicId ?? null,
      departmentId: user?.departmentId ?? null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Builds a Prisma `where` fragment scoped to the user's tenant.
 * - `super_admin` → `{}` (all tenants)
 * - `admin` / `support_admin` with no org → `{}` (platform-wide)
 * - `admin` / `support_admin` with org → scoped to that org
 * - Other roles without org → sentinel that matches nothing
 */
export function tenantWhere(req: Request): { organizationId?: string; clinicId?: string } {
  if (!req.user || PLATFORM_BYPASS_ROLES.includes(req.user.role)) {
    return {};
  }

  const orgId = req.tenant?.organizationId;

  // Platform admin / support_admin with no org assignment sees everything
  if (ADMIN_ROLES.includes(req.user.role) && !orgId) {
    return {};
  }

  if (!orgId) {
    return { organizationId: '__no_tenant__' };
  }

  const where: { organizationId: string; clinicId?: string } = { organizationId: orgId };
  if (req.tenant?.clinicId) {
    where.clinicId = req.tenant.clinicId;
  }
  return where;
}

/**
 * Organization-only fragment for models that lack `clinicId` (CareEpisode, IntakeRecord, etc.).
 */
export function tenantOrgWhere(req: Request): { organizationId?: string } {
  const tw = tenantWhere(req);
  if (!tw.organizationId) return {};
  return { organizationId: tw.organizationId };
}

export function requireTenantOrganization(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }

  if (PLATFORM_BYPASS_ROLES.includes(req.user.role)) {
    next();
    return;
  }

  if (ADMIN_ROLES.includes(req.user.role) && !req.tenant?.organizationId) {
    next();
    return;
  }

  if (!req.tenant?.organizationId) {
    res.status(403).json({ message: 'No organization assigned to this account.' });
    return;
  }

  next();
}
