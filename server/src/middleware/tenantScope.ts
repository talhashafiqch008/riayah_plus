import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'support_admin'];

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

/** Roles that bypass tenant filters and see all org data. */
const TENANT_BYPASS_ROLES: UserRole[] = [...ADMIN_ROLES];

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

    if (TENANT_BYPASS_ROLES.includes(req.user.role)) {
      req.tenant = { organizationId: null, clinicId: null, departmentId: null };
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
 * Admins receive `{}` (no filter). Non-admins without an org get a filter that matches nothing.
 */
export function tenantWhere(req: Request): { organizationId?: string; clinicId?: string } {
  if (!req.user || TENANT_BYPASS_ROLES.includes(req.user.role)) {
    return {};
  }

  const orgId = req.tenant?.organizationId;
  if (!orgId) {
    return { organizationId: '__no_tenant__' };
  }

  const where: { organizationId: string; clinicId?: string } = { organizationId: orgId };
  if (req.tenant?.clinicId) {
    where.clinicId = req.tenant.clinicId;
  }
  return where;
}

export function requireTenantOrganization(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }

  if (TENANT_BYPASS_ROLES.includes(req.user.role)) {
    next();
    return;
  }

  if (!req.tenant?.organizationId) {
    res.status(403).json({ message: 'No organization assigned to this account.' });
    return;
  }

  next();
}
