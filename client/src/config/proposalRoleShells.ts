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
  ClipboardPlus,
  Activity,
  UserPlus,
  Briefcase,
  UserCog,
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
      { name: 'Care request', href: '/family/onboarding', icon: ClipboardPlus },
      { name: 'Care Unit', href: '/family/care-unit', icon: Users },
      { name: 'Care Journey', href: '/family/episodes', icon: Activity },
      { name: 'Appointments', href: '/family/bookings', icon: Calendar },
      { name: 'Documents', href: '/family/documents', icon: FileText },
      { name: 'Care Plans', href: '/family/care-plans', icon: BookOpen },
      { name: 'Messages', href: '/family/messages', icon: MessageCircle },
    ],
    dashboard: {
      title: 'Family Home',
      description:
        'Request care, follow your care journey, and stay informed — our care team handles the clinical details.',
      stats: [
        { label: 'Active care journeys', value: '—' },
        { label: 'Upcoming appointments', value: '—' },
        { label: 'Unread alerts', value: '—' },
      ],
      nextSteps: [
        'Submit or update a care request',
        'Follow your care journey milestones',
        'Confirm upcoming appointments',
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
      { name: 'Episodes', href: '/coordinator/episodes', icon: Activity },
      { name: 'Care Plans', href: '/coordinator/plans', icon: ClipboardList },
      { name: 'Schedule', href: '/coordinator/schedule', icon: Calendar },
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
        'Review new intake requests',
        'Request missing documents from families',
        'Schedule consultations after episode creation',
        'Escalate urgency when clinically indicated',
      ],
    },
  },
  clinical: {
    key: 'clinical',
    portalTitle: 'Clinical Staff',
    roleBadge: 'Clinical Staff',
    basePath: '/clinical',
    allowedRoles: [
      'clinical_staff',
      'doctor',
      'nurse',
      'physiotherapist',
      'occupational_therapist',
      'speech_therapist',
      'psychologist',
      'dietitian',
      'therapist',
      'admin',
      'super_admin',
    ],
    navigation: [
      { name: 'Dashboard', href: '/clinical', icon: LayoutDashboard },
      { name: 'Schedule', href: '/clinical/schedule', icon: Calendar },
      { name: 'Patients', href: '/clinical/patients', icon: Users },
      { name: 'Session Notes', href: '/clinical/notes', icon: Stethoscope },
      { name: 'Care Plans', href: '/clinical/plans', icon: BookOpen },
      { name: 'Profile', href: '/clinical/profile', icon: UserCog },
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
      { name: 'Profile', href: '/support/profile', icon: UserCog },
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
  org: {
    key: 'org',
    portalTitle: 'Organization',
    roleBadge: 'Org Admin',
    basePath: '/org',
    allowedRoles: ['org_admin', 'admin', 'super_admin'],
    navigation: [
      { name: 'Dashboard', href: '/org', icon: LayoutDashboard },
      { name: 'Pending requests', href: '/org/pending', icon: Inbox },
      { name: 'Families', href: '/org/families', icon: Users },
      { name: 'Coordinators', href: '/org/coordinators', icon: UserPlus },
      { name: 'Staff', href: '/org/staff', icon: Briefcase },
    ],
    dashboard: {
      title: 'Organization Dashboard',
      description:
        'Manage families linked to your organization, invite coordinators and clinical staff, and route care requests.',
      stats: [
        { label: 'Families', value: '—' },
        { label: 'Coordinators', value: '—' },
        { label: 'Pending requests', value: '—' },
      ],
      nextSteps: [
        'Assign coordinators to new families',
        'Invite clinical and support staff',
        'Route pending care requests',
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
