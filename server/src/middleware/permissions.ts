import { UserRole } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

/**
 * Granular permission actions (Proposed Additions RBAC matrix).
 * M1: stub matrix for 6 proposal roles + admins — extend per module in M2–M5.
 */
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export type PermissionResource =
  | 'organization'
  | 'clinic'
  | 'department'
  | 'user'
  | 'patient'
  | 'care_episode'
  | 'care_plan'
  | 'task'
  | 'booking'
  | 'clinical_note'
  | 'shift_note'
  | 'profile'
  | 'consultation_request'
  | 'quotation'
  | 'document'
  | 'any';

type ResourcePermissions = Partial<Record<PermissionAction, boolean>>;
type RoleMatrix = Partial<Record<PermissionResource, ResourcePermissions>>;

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'support_admin'];

/**
 * M1 stub — aligned with MILESTONE_SPECS.md § RBAC Matrix (6 proposal roles).
 * Admins / super_admin bypass via hasPermission().
 */
const ROLE_PERMISSIONS: Partial<Record<UserRole, RoleMatrix>> = {
  family: {
    profile: { view: true, edit: true },
    consultation_request: { view: true, create: true },
    care_plan: { view: true, approve: true },
    quotation: { view: true, approve: true },
    booking: { view: true, create: true },
    document: { view: true },
  },
  patient: {
    profile: { view: true, edit: true },
    care_plan: { view: true },
    booking: { view: true },
    document: { view: true },
  },
  care_coordinator: {
    patient: { view: true },
    care_episode: { view: true, create: true, edit: true, delete: true },
    care_plan: { view: true, create: true, edit: true, approve: true },
    task: { view: true, create: true, edit: true },
    clinical_note: { view: true, create: true, edit: true },
    booking: { view: true, edit: true },
    profile: { view: true },
  },
  org_admin: {
    organization: { view: true },
    clinic: { view: true },
    department: { view: true },
    patient: { view: true, edit: true },
    user: { view: true, create: true, edit: true },
    care_episode: { view: true },
    profile: { view: true, edit: true },
  },
  clinical_staff: {
    patient: { view: true },
    care_episode: { view: true },
    care_plan: { view: true, edit: true, approve: true },
    clinical_note: { view: true, create: true, edit: true },
    booking: { view: true },
    profile: { view: true, edit: true },
  },
  support_worker: {
    task: { view: true },
    shift_note: { view: true, create: true, edit: true },
    profile: { view: true, edit: true },
  },
  staff: {
    booking: { view: true, edit: true },
    patient: { view: true },
    profile: { view: true, edit: true },
  },
};

const ADMIN_MATRIX: RoleMatrix = {
  organization: { view: true, create: true, edit: true, delete: true },
  clinic: { view: true, create: true, edit: true, delete: true },
  department: { view: true, create: true, edit: true, delete: true },
  user: { view: true, create: true, edit: true, delete: true },
  patient: { view: true, create: true, edit: true },
  care_episode: { view: true, create: true, edit: true, delete: true },
  care_plan: { view: true, create: true, edit: true, delete: true, approve: true },
  task: { view: true, create: true, edit: true, delete: true },
  booking: { view: true, create: true, edit: true, delete: true },
  clinical_note: { view: true, create: true, edit: true, delete: true },
  shift_note: { view: true, create: true, edit: true, delete: true },
  document: { view: true, create: true, edit: true, delete: true, approve: true },
  consultation_request: { view: true, create: true, edit: true },
  quotation: { view: true, approve: true },
  profile: { view: true, edit: true },
};

/** Legacy marketplace roles mapped to proposal-role permission matrices (STUB-003). */
const LEGACY_ROLE_MAP: Partial<Record<UserRole, UserRole>> = {
  provider: 'clinical_staff',
  doctor: 'clinical_staff',
  nurse: 'clinical_staff',
  physiotherapist: 'clinical_staff',
  occupational_therapist: 'clinical_staff',
  speech_therapist: 'clinical_staff',
  psychologist: 'clinical_staff',
  dietitian: 'clinical_staff',
  therapist: 'clinical_staff',
  clinical_staff: 'clinical_staff',
  support_worker: 'support_worker',
  cleaner: 'support_worker',
  gardener: 'support_worker',
  driver: 'support_worker',
  companion: 'support_worker',
  nanny: 'support_worker',
  caregiver: 'support_worker',
  client: 'family',
  consumer: 'family',
};

function resolveRoleMatrix(role: UserRole): RoleMatrix | undefined {
  const mapped = LEGACY_ROLE_MAP[role] ?? role;
  return ROLE_PERMISSIONS[mapped];
}

function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function hasPermission(
  role: UserRole,
  action: PermissionAction,
  resource: PermissionResource,
): boolean {
  if (!isValidUserRole(role)) return false;
  if (ADMIN_ROLES.includes(role)) return true;

  const matrix = resolveRoleMatrix(role);
  if (!matrix) return false;

  if (matrix.any?.[action]) return true;

  return matrix[resource]?.[action] === true;
}

export function canView(role: UserRole, resource: PermissionResource): boolean {
  return hasPermission(role, 'view', resource);
}

export function canCreate(role: UserRole, resource: PermissionResource): boolean {
  return hasPermission(role, 'create', resource);
}

export function canEdit(role: UserRole, resource: PermissionResource): boolean {
  return hasPermission(role, 'edit', resource);
}

export function canDelete(role: UserRole, resource: PermissionResource): boolean {
  return hasPermission(role, 'delete', resource);
}

export function canApprove(role: UserRole, resource: PermissionResource): boolean {
  return hasPermission(role, 'approve', resource);
}

/** Returns the effective permission map for a role (for debugging / admin UI). */
export function getPermissionsForRole(role: UserRole): RoleMatrix {
  if (!isValidUserRole(role)) return {};
  if (ADMIN_ROLES.includes(role)) return ADMIN_MATRIX;
  return resolveRoleMatrix(role) ?? {};
}

export function requirePermission(action: PermissionAction, resource: PermissionResource) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }

    if (!isValidUserRole(req.user.role)) {
      res.status(403).json({ message: 'Forbidden. Invalid role.' });
      return;
    }

    if (!hasPermission(req.user.role, action, resource)) {
      res.status(403).json({
        message: 'Forbidden. Insufficient permissions.',
        required: { action, resource },
      });
      return;
    }

    next();
  };
}

/** Shorthand middleware factories */
export const requireView = (resource: PermissionResource) => requirePermission('view', resource);
export const requireCreate = (resource: PermissionResource) => requirePermission('create', resource);
export const requireEdit = (resource: PermissionResource) => requirePermission('edit', resource);
export const requireDelete = (resource: PermissionResource) => requirePermission('delete', resource);
export const requireApprove = (resource: PermissionResource) => requirePermission('approve', resource);
