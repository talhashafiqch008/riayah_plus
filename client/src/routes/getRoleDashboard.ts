export const PROPOSAL_ROLES = [
  'family',
  'patient',
  'care_coordinator',
  'clinical_staff',
  'support_worker',
  'admin',
] as const;

export const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin'] as const;

/** Marketplace / legacy provider roles (not proposal clinical_staff or support_worker). */
export const PROVIDER_ROLES = [
  'provider', 'doctor', 'nurse', 'physiotherapist', 'occupational_therapist',
  'speech_therapist', 'psychologist', 'dietitian', 'cleaner',
  'gardener', 'driver', 'companion', 'nanny', 'caregiver', 'therapist',
] as const;

export const CLIENT_ROLES = ['client', 'consumer'] as const;

const PROPOSAL_DASHBOARDS: Record<string, string> = {
  family: '/family',
  patient: '/patient',
  care_coordinator: '/coordinator',
  clinical_staff: '/clinical',
  doctor: '/clinical',
  nurse: '/clinical',
  physiotherapist: '/clinical',
  occupational_therapist: '/clinical',
  speech_therapist: '/clinical',
  psychologist: '/clinical',
  dietitian: '/clinical',
  therapist: '/clinical',
  support_worker: '/support',
  org_admin: '/org',
};

export function getRoleDashboard(role: string): string {
  const r = role?.toLowerCase() ?? '';

  if (r in PROPOSAL_DASHBOARDS) {
    return PROPOSAL_DASHBOARDS[r];
  }

  // Remaining marketplace-only provider roles (cleaner, gardener, etc.)
  if (PROVIDER_ROLES.includes(r as typeof PROVIDER_ROLES[number])) {
    return '/provider/dashboard';
  }

  switch (r) {
    case 'admin':
    case 'super_admin':
    case 'support_admin':
      return '/admin';
    case 'staff':
      return '/staff';
    case 'trainer':
      return '/trainer';
    case 'client':
    case 'consumer':
      return '/careseeker';
    default:
      return '/';
  }
}

export function isProposalRole(role: string): boolean {
  const r = role?.toLowerCase() ?? '';
  return r in PROPOSAL_DASHBOARDS || ADMIN_ROLES.includes(r as typeof ADMIN_ROLES[number]);
}
