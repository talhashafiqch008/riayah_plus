import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  MessageCircle,
  Users,
  ClipboardList,
  Clock,
  Stethoscope,
  Heart,
  Inbox,
  BookOpen,
} from 'lucide-react';

export interface RoleShellNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface RoleShellConfig {
  key: string;
  portalTitle: string;
  roleBadge: string;
  basePath: string;
  allowedRoles: string[];
  navigation: RoleShellNavItem[];
  dashboard: {
    title: string;
    description: string;
    stats: { label: string; value: string }[];
    nextSteps: string[];
  };
}

export const ROLE_SHELLS: Record<string, RoleShellConfig> = {
  family: {
    key: 'family',
    portalTitle: 'Family Portal',
    roleBadge: 'Family',
    basePath: '/family',
    allowedRoles: ['family', 'admin', 'super_admin'],
    navigation: [
      { name: 'Dashboard', href: '/family', icon: LayoutDashboard },
      { name: 'Care Plans', href: '/family/care-plans', icon: BookOpen },
      { name: 'Bookings', href: '/family/bookings', icon: Calendar },
      { name: 'Documents', href: '/family/documents', icon: FileText },
      { name: 'Messages', href: '/family/messages', icon: MessageCircle },
    ],
    dashboard: {
      title: 'Family Dashboard',
      description:
        'Manage care for your loved ones — view plans, appointments, and documents in one place.',
      stats: [
        { label: 'Active care plans', value: '—' },
        { label: 'Upcoming visits', value: '—' },
        { label: 'Open messages', value: '—' },
      ],
      nextSteps: [
        'Review your active care plan',
        'Confirm upcoming appointments',
        'Upload or sign required documents',
      ],
    },
  },
  patient: {
    key: 'patient',
    portalTitle: 'Patient Portal',
    roleBadge: 'Patient',
    basePath: '/patient',
    allowedRoles: ['patient', 'admin', 'super_admin'],
    navigation: [
      { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
      { name: 'My Care Plan', href: '/patient/care-plan', icon: BookOpen },
      { name: 'Appointments', href: '/patient/appointments', icon: Calendar },
      { name: 'Documents', href: '/patient/documents', icon: FileText },
      { name: 'Messages', href: '/patient/messages', icon: MessageCircle },
    ],
    dashboard: {
      title: 'Patient Dashboard',
      description: 'Your personal view of care — plans, appointments, and health documents.',
      stats: [
        { label: 'Care plan status', value: '—' },
        { label: 'Next appointment', value: '—' },
        { label: 'Pending documents', value: '—' },
      ],
      nextSteps: [
        'View your current care plan',
        'Check upcoming appointments',
        'Message your care coordinator',
      ],
    },
  },
  coordinator: {
    key: 'coordinator',
    portalTitle: 'Care Coordinator',
    roleBadge: 'Coordinator',
    basePath: '/coordinator',
    allowedRoles: ['care_coordinator', 'admin', 'super_admin'],
    navigation: [
      { name: 'Dashboard', href: '/coordinator', icon: LayoutDashboard },
      { name: 'Intake Queue', href: '/coordinator/intake', icon: Inbox },
      { name: 'Patients', href: '/coordinator/patients', icon: Users },
      { name: 'Care Plans', href: '/coordinator/plans', icon: ClipboardList },
      { name: 'Messages', href: '/coordinator/messages', icon: MessageCircle },
    ],
    dashboard: {
      title: 'Coordinator Dashboard',
      description:
        'Review intake submissions, assign clinicians, and manage care episodes for your panel.',
      stats: [
        { label: 'Pending intake', value: '—' },
        { label: 'Active episodes', value: '—' },
        { label: 'Plans awaiting review', value: '—' },
      ],
      nextSteps: [
        'Process new intake submissions',
        'Review care plans pending approval',
        'Follow up on assigned patients',
      ],
    },
  },
  clinical: {
    key: 'clinical',
    portalTitle: 'Clinical Staff',
    roleBadge: 'Clinical Staff',
    basePath: '/clinical',
    allowedRoles: ['clinical_staff', 'admin', 'super_admin'],
    navigation: [
      { name: 'Dashboard', href: '/clinical', icon: LayoutDashboard },
      { name: 'Schedule', href: '/clinical/schedule', icon: Calendar },
      { name: 'Patients', href: '/clinical/patients', icon: Users },
      { name: 'Session Notes', href: '/clinical/notes', icon: Stethoscope },
      { name: 'Messages', href: '/clinical/messages', icon: MessageCircle },
    ],
    dashboard: {
      title: 'Clinical Dashboard',
      description:
        'Your daily clinical workspace — schedule, assigned patients, and session documentation.',
      stats: [
        { label: "Today's sessions", value: '—' },
        { label: 'Assigned patients', value: '—' },
        { label: 'Notes due', value: '—' },
      ],
      nextSteps: [
        'Review today’s schedule',
        'Complete session notes',
        'Update patient assessments',
      ],
    },
  },
  support: {
    key: 'support',
    portalTitle: 'Support Worker',
    roleBadge: 'Support Worker',
    basePath: '/support',
    allowedRoles: ['support_worker', 'admin', 'super_admin'],
    navigation: [
      { name: 'Dashboard', href: '/support', icon: LayoutDashboard },
      { name: 'My Shifts', href: '/support/shifts', icon: Clock },
      { name: 'Tasks', href: '/support/tasks', icon: ClipboardList },
      { name: 'Shift Notes', href: '/support/notes', icon: FileText },
      { name: 'Messages', href: '/support/messages', icon: MessageCircle },
    ],
    dashboard: {
      title: 'Support Worker Dashboard',
      description:
        'View assigned shifts and tasks, document visits, and stay connected with your care team.',
      stats: [
        { label: 'Shifts this week', value: '—' },
        { label: 'Open tasks', value: '—' },
        { label: 'Notes pending', value: '—' },
      ],
      nextSteps: [
        'Check in to your next shift',
        'Complete assigned tasks',
        'Submit shift notes after visits',
      ],
    },
  },
};

export const PROPOSAL_SHELL_KEYS = Object.keys(ROLE_SHELLS);

export function getShellByPath(pathname: string): RoleShellConfig | undefined {
  return Object.values(ROLE_SHELLS).find(
    (shell) => pathname === shell.basePath || pathname.startsWith(`${shell.basePath}/`),
  );
}

export function getShellNavLabel(shell: RoleShellConfig, pathname: string): string {
  const item = shell.navigation.find(
    (nav) =>
      nav.href === shell.basePath
        ? pathname === shell.basePath
        : pathname === nav.href || pathname.startsWith(`${nav.href}/`),
  );
  return item?.name ?? shell.portalTitle;
}
