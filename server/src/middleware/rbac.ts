import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'support_admin'];

const PROVIDER_ROLES: UserRole[] = [
  'provider',
  'doctor',
  'nurse',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'support_worker',
  'cleaner',
  'gardener',
  'driver',
  'companion',
  'nanny',
  'caregiver',
  'therapist',
  'clinical_staff',
  'care_coordinator',
];

const CLIENT_ROLES: UserRole[] = ['client', 'consumer', 'family', 'patient'];

function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }
    if (!isValidUserRole(req.user.role)) {
      res.status(403).json({ message: 'Forbidden. Invalid role.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
      return;
    }
    next();
  };
}

// Alias that accepts a string array for new routes
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated.' });
      return;
    }
    if (!isValidUserRole(req.user.role)) {
      res.status(403).json({ message: 'Forbidden. Invalid role.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }

  if (!isValidUserRole(req.user.role)) {
    res.status(403).json({ message: 'Forbidden. Invalid role.' });
    return;
  }

  // STUB-006: role-only — do not accept x-admin-request header as a backdoor
  if (!ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  next();
}

export function requireProvider(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed = [...PROVIDER_ROLES, ...ADMIN_ROLES];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Provider access required.' });
    return;
  }
  next();
}

export function requireClient(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed = [...CLIENT_ROLES, ...ADMIN_ROLES];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Client access required.' });
    return;
  }
  next();
}

export function requireTrainer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed: UserRole[] = ['trainer', ...ADMIN_ROLES];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Trainer access required.' });
    return;
  }
  next();
}

export function requireCareCoordinator(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed: UserRole[] = ['care_coordinator', ...ADMIN_ROLES];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Care coordinator access required.' });
    return;
  }
  next();
}

export function requireOrgAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed: UserRole[] = ['org_admin', ...ADMIN_ROLES];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Organization admin access required.' });
    return;
  }
  next();
}

/** Family account holders + coordinators/admins (care-unit write surface). */
export function requireFamilyOrCoordinator(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed: UserRole[] = [
    'family',
    'client',
    'consumer',
    'patient',
    'care_coordinator',
    ...ADMIN_ROLES,
  ];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Family or care coordinator access required.' });
    return;
  }
  next();
}

/** Any user with a care role — blocks marketplace-only roles (trainer, provider) from clinical read endpoints. */
export function requireCareUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed: UserRole[] = [
    'family',
    'client',
    'consumer',
    'patient',
    'care_coordinator',
    'clinical_staff',
    'doctor',
    'nurse',
    'physiotherapist',
    'occupational_therapist',
    'speech_therapist',
    'psychologist',
    'dietitian',
    'therapist',
    ...ADMIN_ROLES,
  ];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Care access required.' });
    return;
  }
  next();
}

/** Clinical staff completing assessments, or coordinators/admins. */
export function requireClinicalOrCoordinator(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }
  const allowed: UserRole[] = [
    'clinical_staff',
    'doctor',
    'nurse',
    'physiotherapist',
    'occupational_therapist',
    'speech_therapist',
    'psychologist',
    'dietitian',
    'therapist',
    'care_coordinator',
    ...ADMIN_ROLES,
  ];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({ message: 'Clinical or care coordinator access required.' });
    return;
  }
  next();
}
