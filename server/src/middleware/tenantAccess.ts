import { Request } from 'express';
import { AppError } from './errorHandler';
import { tenantOrgWhere, tenantWhere } from './tenantScope';

/**
 * Apply organization tenant filter onto a Prisma where object.
 * Throws 403 when the user has no organization (sentinel).
 * No-op for platform bypass roles (empty tenantOrgWhere).
 */
export function mergeTenantOrg<T extends object>(
  req: Request,
  where: T,
): void {
  const tw = tenantOrgWhere(req);
  if (!tw.organizationId) return;
  if (tw.organizationId === '__no_tenant__') {
    throw new AppError('No organization assigned to this account.', 403);
  }
  (where as Record<string, unknown>).organizationId = tw.organizationId;
}

/**
 * Assert a row's organizationId is visible to the current tenant.
 * Family/self checks should run separately before calling this for coordinators.
 */
export function assertTenantOrgAccess(
  req: Request,
  rowOrganizationId: string | null | undefined,
): void {
  const tw = tenantWhere(req);
  if (!tw.organizationId) return; // platform bypass
  if (tw.organizationId === '__no_tenant__') {
    throw new AppError('No organization assigned to this account.', 403);
  }
  if (rowOrganizationId !== tw.organizationId) {
    throw new AppError('Forbidden.', 403);
  }
}
