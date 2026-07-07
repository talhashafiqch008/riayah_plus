export const PROVIDER_ROLES = [
  'provider', 'doctor', 'nurse', 'physiotherapist', 'occupational_therapist',
  'speech_therapist', 'psychologist', 'dietitian', 'support_worker', 'cleaner',
  'gardener', 'driver', 'companion', 'nanny', 'caregiver', 'therapist',
] as const;

export const CLIENT_ROLES = ['client', 'consumer', 'family'] as const;

/** Matches frontend/src/middleware.ts getRoleDashboard */
export function getRoleDashboard(role: string): string {
  const r = role?.toLowerCase() ?? '';
  if (PROVIDER_ROLES.includes(r as typeof PROVIDER_ROLES[number])) {
    return '/provider/dashboard';
  }
  switch (r) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'staff':
      return '/staff';
    case 'trainer':
      return '/trainer';
    case 'client':
    case 'consumer':
    case 'family':
      return '/careseeker';
    default:
      return '/';
  }
}
