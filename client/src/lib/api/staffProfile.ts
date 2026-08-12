import { client } from './client';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

/** Resolve `/api/avatars/...` (or absolute) for <img src>. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/api/')) {
    const origin = API_BASE.replace(/\/api\/?$/, '');
    return origin ? `${origin}${url}` : url;
  }
  const base = API_BASE.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export type AvailabilitySchedule = {
  days?: number[];
  windows?: { start: string; end: string }[];
};

export type PublicStaffCard = {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
  email?: string;
  gender?: string | null;
  nationality?: string | null;
  languages?: string[];
  certifications?: string[];
  serviceAreas?: string[];
  specialties?: string[];
  yearsExperience?: number | null;
  bio?: string | null;
  mohLicenseNumber?: string | null;
  availabilitySchedule?: AvailabilitySchedule | null;
  age?: number | null;
};

export type StaffSelfProfile = PublicStaffCard & {
  phone?: string | null;
  dateOfBirth?: string | null;
  qatarId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export type StaffProfilePayload = {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  specialties?: string[];
  languages?: string[];
  certifications?: string[];
  serviceAreas?: string[];
  gender?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  qatarId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  mohLicenseNumber?: string | null;
  availabilitySchedule?: AvailabilitySchedule | null;
};

export async function getMyStaffProfile() {
  const { data } = await client.get<{ data: StaffSelfProfile }>('/users/me/profile');
  return data.data;
}

export async function updateMyStaffProfile(payload: StaffProfilePayload) {
  const { data } = await client.patch<{ data: StaffSelfProfile }>('/users/me/profile', payload);
  return data.data;
}

/** Upload exactly one profile image (field name `avatar`). */
export async function uploadMyStaffAvatar(file: File) {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await client.post<{ data: { avatar: string } }>('/users/me/avatar', form);
  return data.data;
}
