import { adminApi } from '@/lib/admin/api';
import { client } from './client';

export type AdminNavBadges = {
  unassignedFamilies: number;
};

export type OrgNavBadges = {
  pendingIntakes: number;
  familiesNeedingCoordinator: number;
  coordinatorsAwaitingPassword: number;
  staffAwaitingPassword?: number;
};

export type CoordinatorNavBadges = {
  pendingIntake: number;
  plansNeedingAttention?: number;
};

export type ClinicalNavBadges = {
  scheduledAssessments: number;
};

export type SupportNavBadges = {
  openTasks: number;
  activeShift: number;
};

export type FamilyNavBadges = {
  scheduledAppointments: number;
  plansAwaitingReview: number;
};

/** href → count for sidebar badges */
export type NavBadgeMap = Record<string, number>;

function formatCount(n: number): number {
  return n > 0 ? n : 0;
}

export async function fetchAdminNavBadges(): Promise<NavBadgeMap> {
  const res = await adminApi.get('/admin/nav-badges');
  const data = (res?.data ?? res) as AdminNavBadges;
  return {
    '/admin/families': formatCount(data.unassignedFamilies ?? 0),
  };
}

export async function fetchOrgNavBadges(): Promise<NavBadgeMap> {
  const { data } = await client.get<{ data: OrgNavBadges }>('/org/nav-badges');
  const b = data.data ?? (data as unknown as OrgNavBadges);
  return {
    '/org/pending': formatCount(b.pendingIntakes ?? 0),
    '/org/families': formatCount(b.familiesNeedingCoordinator ?? 0),
    '/org/coordinators': formatCount(b.coordinatorsAwaitingPassword ?? 0),
    '/org/staff': formatCount(b.staffAwaitingPassword ?? 0),
  };
}

export async function fetchCoordinatorNavBadges(): Promise<NavBadgeMap> {
  try {
    const { data } = await client.get<{ data: CoordinatorNavBadges }>(
      '/shells/coordinator/nav-badges',
    );
    const b = data.data ?? (data as unknown as CoordinatorNavBadges);
    return {
      '/coordinator/intake': formatCount(b.pendingIntake ?? 0),
      '/coordinator/plans': formatCount(b.plansNeedingAttention ?? 0),
    };
  } catch {
    const { data } = await client.get<{ data: CoordinatorNavBadges }>('/intake/nav-badges');
    const b = data.data ?? (data as unknown as CoordinatorNavBadges);
    return {
      '/coordinator/intake': formatCount(b.pendingIntake ?? 0),
    };
  }
}

export async function fetchClinicalNavBadges(): Promise<NavBadgeMap> {
  const { data } = await client.get<{ data: ClinicalNavBadges }>('/shells/clinical/nav-badges');
  const b = data.data ?? (data as unknown as ClinicalNavBadges);
  return {
    '/clinical/schedule': formatCount(b.scheduledAssessments ?? 0),
  };
}

export async function fetchSupportNavBadges(): Promise<NavBadgeMap> {
  const { data } = await client.get<{ data: SupportNavBadges }>('/shells/support/nav-badges');
  const b = data.data ?? (data as unknown as SupportNavBadges);
  return {
    '/support/tasks': formatCount(b.openTasks ?? 0),
    '/support/shifts': formatCount(b.activeShift ?? 0),
  };
}

export async function fetchFamilyNavBadges(): Promise<NavBadgeMap> {
  const { data } = await client.get<{ data: FamilyNavBadges }>('/shells/family/nav-badges');
  const b = data.data ?? (data as unknown as FamilyNavBadges);
  return {
    '/family/bookings': formatCount(b.scheduledAppointments ?? 0),
    '/family/care-plans': formatCount(b.plansAwaitingReview ?? 0),
  };
}

export async function fetchPatientNavBadges(): Promise<NavBadgeMap> {
  const { data } = await client.get<{ data: FamilyNavBadges }>('/shells/patient/nav-badges');
  const b = data.data ?? (data as unknown as FamilyNavBadges);
  return {
    '/patient/appointments': formatCount(b.scheduledAppointments ?? 0),
    '/patient/care-plan': formatCount(b.plansAwaitingReview ?? 0),
  };
}

export async function fetchNavBadgesForShell(shellKey: string): Promise<NavBadgeMap> {
  try {
    switch (shellKey) {
      case 'org':
        return await fetchOrgNavBadges();
      case 'coordinator':
        return await fetchCoordinatorNavBadges();
      case 'clinical':
        return await fetchClinicalNavBadges();
      case 'support':
        return await fetchSupportNavBadges();
      case 'family':
        return await fetchFamilyNavBadges();
      case 'patient':
        return await fetchPatientNavBadges();
      default:
        return {};
    }
  } catch {
    return {};
  }
}

export function badgeLabel(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}
