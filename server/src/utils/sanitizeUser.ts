import { User, Prisma } from '@prisma/client';

/** Fields that must never leave the API boundary. */
export const USER_SECRET_FIELDS = [
  'passwordHash',
  'twoFactorSecret',
] as const;

type SecretField = (typeof USER_SECRET_FIELDS)[number];

/** AUTH-04: strip credential material from any user-shaped object. */
export function sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, SecretField> {
  const { passwordHash: _ph, twoFactorSecret: _ts, ...safe } = user as T & {
    passwordHash?: unknown;
    twoFactorSecret?: unknown;
  };
  return safe as Omit<T, SecretField>;
}

export function sanitizeUsers<T extends Record<string, unknown>>(users: T[]): Omit<T, SecretField>[] {
  return users.map((u) => sanitizeUser(u));
}

/** Safe scalar projection for admin list/detail reads. */
export const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatar: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  isActive: true,
  processingRestricted: true,
  onboardingStatus: true,
  mustSetPassword: true,
  organizationId: true,
  assignedCoordinatorId: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

/**
 * AUTH-04: fields an admin may PATCH on a user.
 * Explicitly excludes passwordHash, twoFactorSecret, twoFactorEnabled, role elevation paths, etc.
 */
export const adminUserUpdateSchema = {
  name: true,
  email: true,
  phone: true,
  avatar: true,
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  processingRestricted: true,
  onboardingStatus: true,
  organizationId: true,
  assignedCoordinatorId: true,
} as const;

export type AdminUserUpdateKey = keyof typeof adminUserUpdateSchema;

export function pickAdminUserUpdate(body: Record<string, unknown>): Partial<Prisma.UserUpdateInput> {
  const data: Partial<Prisma.UserUpdateInput> = {};
  for (const key of Object.keys(adminUserUpdateSchema) as AdminUserUpdateKey[]) {
    if (body[key] !== undefined) {
      (data as Record<string, unknown>)[key] = body[key];
    }
  }
  return data;
}

/** Type helper — full User minus secrets. */
export type SafeUser = Omit<User, SecretField>;
