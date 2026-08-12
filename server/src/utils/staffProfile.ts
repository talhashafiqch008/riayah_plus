import { Prisma } from '@prisma/client';

/** Public fields safe for families / episode cards (no qatarId / emergency / raw DOB). */
export const staffPublicUserSelect = {
  id: true,
  name: true,
  role: true,
  avatar: true,
  providerProfileExt: {
    select: {
      bio: true,
      yearsExperience: true,
      specialties: true,
      languages: true,
      certifications: true,
      serviceAreas: true,
      mohLicenseNumber: true,
      gender: true,
      nationality: true,
      availabilitySchedule: true,
      dateOfBirth: true,
    },
  },
} satisfies Prisma.UserSelect;

/** Full profile for the owning staff member (includes internal fields). */
export const staffSelfProfileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatar: true,
  providerProfileExt: {
    select: {
      bio: true,
      yearsExperience: true,
      specialties: true,
      languages: true,
      certifications: true,
      serviceAreas: true,
      mohLicenseNumber: true,
      gender: true,
      nationality: true,
      availabilitySchedule: true,
      dateOfBirth: true,
      qatarId: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
    },
  },
} satisfies Prisma.UserSelect;

export type StaffProfileExt = {
  bio?: string | null;
  yearsExperience?: number | null;
  specialties?: string[];
  languages?: string[];
  certifications?: string[];
  serviceAreas?: string[];
  mohLicenseNumber?: string | null;
  gender?: string | null;
  nationality?: string | null;
  availabilitySchedule?: unknown;
  dateOfBirth?: Date | string | null;
  qatarId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export type StaffUserRow = {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  providerProfileExt?: StaffProfileExt | null;
};

export function ageFromDob(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Public card shape — DOB never exposed, only derived age. */
export function toPublicStaffCard(user: StaffUserRow) {
  const p = user.providerProfileExt;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatar: user.avatar ?? null,
    email: user.email ?? undefined,
    gender: p?.gender ?? null,
    nationality: p?.nationality ?? null,
    languages: p?.languages ?? [],
    certifications: p?.certifications ?? [],
    serviceAreas: p?.serviceAreas ?? [],
    specialties: p?.specialties ?? [],
    yearsExperience: p?.yearsExperience ?? null,
    bio: p?.bio ?? null,
    mohLicenseNumber: p?.mohLicenseNumber ?? null,
    availabilitySchedule: p?.availabilitySchedule ?? null,
    age: ageFromDob(p?.dateOfBirth ?? null),
  };
}

export function toSelfStaffProfile(user: StaffUserRow) {
  const publicCard = toPublicStaffCard(user);
  const p = user.providerProfileExt;
  return {
    ...publicCard,
    phone: user.phone ?? null,
    dateOfBirth: p?.dateOfBirth
      ? (typeof p.dateOfBirth === 'string'
          ? p.dateOfBirth.slice(0, 10)
          : p.dateOfBirth.toISOString().slice(0, 10))
      : null,
    qatarId: p?.qatarId ?? null,
    emergencyContactName: p?.emergencyContactName ?? null,
    emergencyContactPhone: p?.emergencyContactPhone ?? null,
  };
}
