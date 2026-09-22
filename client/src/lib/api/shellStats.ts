import { listAssessments } from './assessments';
import { getCarePlans } from './careseeker';
import { getDocumentsStatistics } from './documents';
import { listEpisodes } from './episodes';
import { listIntakeQueue } from './intake';
import { getUnreadNotificationCount } from './notifications';
import { listSessions } from './scheduling';
import { client } from './client';
import { getOrgDashboard } from './org';

export type ShellStat = { label: string; value: string; /** i18n key under family.stats.* when present */ id?: string };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

function endOfWeek(d = new Date()) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  return x;
}

function isSameDay(iso: string, day: Date) {
  const t = new Date(iso).getTime();
  return t >= startOfDay(day).getTime() && t <= endOfDay(day).getTime();
}

function formatNextAppointment(iso?: string | null): string {
  if (!iso) return 'None';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'None';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function safeCount(fn: () => Promise<number>, fallback = 0): Promise<number> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function safeString(fn: () => Promise<string>, fallback = '—'): Promise<string> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function fetchShellStats(shellKey: string): Promise<ShellStat[]> {
  switch (shellKey) {
    case 'family':
      return fetchFamilyStats();
    case 'coordinator':
      return fetchCoordinatorStats();
    case 'clinical':
      return fetchClinicalStats();
    case 'patient':
      return fetchPatientStats();
    case 'support':
      return fetchSupportStats();
    case 'org':
      return fetchOrgStats();
    default:
      return [];
  }
}

async function fetchFamilyStats(): Promise<ShellStat[]> {
  const [activeEpisodes, upcomingVisits, unread] = await Promise.all([
    safeCount(async () => {
      const res = await listEpisodes({ status: 'active', limit: 1 });
      return res.total ?? 0;
    }),
    safeCount(async () => {
      const sessions = await listSessions();
      const now = Date.now();
      return sessions.filter(
        (s) =>
          ['pending', 'accepted', 'in_progress'].includes(s.status) &&
          new Date(s.scheduledAt).getTime() >= now,
      ).length;
    }),
    safeCount(async () => {
      const count = await getUnreadNotificationCount();
      return typeof count === 'number' ? count : 0;
    }),
  ]);

  return [
    { id: 'activeJourneys', label: 'Active care journeys', value: String(activeEpisodes) },
    { id: 'upcomingSessions', label: 'Upcoming sessions', value: String(upcomingVisits) },
    { id: 'unreadAlerts', label: 'Unread alerts', value: String(unread) },
  ];
}

async function fetchCoordinatorStats(): Promise<ShellStat[]> {
  const [submitted, underReview, activeEpisodes, plansAwaiting] = await Promise.all([
    safeCount(async () => {
      const res = await listIntakeQueue({ status: 'submitted', limit: 1 });
      return res.total ?? 0;
    }),
    safeCount(async () => {
      const res = await listIntakeQueue({ status: 'under_review', limit: 1 });
      return res.total ?? 0;
    }),
    safeCount(async () => {
      const res = await listEpisodes({ status: 'active', limit: 1 });
      return res.total ?? 0;
    }),
    safeCount(async () => {
      const res = await getCarePlans();
      const plans = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return plans.filter(
        (p: { status?: string }) =>
          p.status === 'submitted_for_approval' || p.status === 'revision_requested',
      ).length;
    }),
  ]);

  return [
    { id: 'pendingIntake', label: 'Pending intake', value: String(submitted + underReview) },
    { id: 'activeEpisodes', label: 'Active episodes', value: String(activeEpisodes) },
    { id: 'plansAwaiting', label: 'Plans awaiting review', value: String(plansAwaiting) },
  ];
}

async function fetchClinicalStats(): Promise<ShellStat[]> {
  const scheduled = await listAssessments({ status: 'scheduled', limit: 100 }).catch(() => ({
    data: [] as Awaited<ReturnType<typeof listAssessments>>['data'],
    total: 0,
  }));
  const rows = scheduled.data ?? [];
  const now = new Date();
  const todaySessions = rows.filter((a) => isSameDay(a.scheduledAt, now)).length;
  const assignedPatients = new Set(rows.map((a) => a.patientId).filter(Boolean)).size;
  const notesDue = rows.filter((a) => new Date(a.scheduledAt).getTime() < now.getTime()).length;

  return [
    { id: 'todaysSessions', label: "Today's sessions", value: String(todaySessions) },
    { id: 'assignedPatients', label: 'Assigned patients', value: String(assignedPatients) },
    { id: 'notesDue', label: 'Notes due', value: String(notesDue) },
  ];
}

async function fetchPatientStats(): Promise<ShellStat[]> {
  const [carePlanStatus, nextAppointment, pendingDocs] = await Promise.all([
    safeString(async () => {
      const res = await getCarePlans();
      const plans = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (!plans.length) return 'None';
      const status = String(plans[0]?.status ?? 'unknown').replace(/_/g, ' ');
      return status.charAt(0).toUpperCase() + status.slice(1);
    }, 'None'),
    safeString(async () => {
      const res = await listAssessments({ status: 'scheduled', limit: 50 });
      const upcoming = (res.data ?? [])
        .filter((a) => new Date(a.scheduledAt).getTime() >= Date.now())
        .sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        );
      return formatNextAppointment(upcoming[0]?.scheduledAt);
    }, 'None'),
    safeCount(async () => {
      const res = await getDocumentsStatistics();
      const stats = res?.data ?? res;
      return typeof stats?.pending === 'number' ? stats.pending : 0;
    }),
  ]);

  return [
    { label: 'Care plan status', value: carePlanStatus },
    { label: 'Next appointment', value: nextAppointment },
    { label: 'Pending documents', value: String(pendingDocs) },
  ];
}

async function fetchSupportStats(): Promise<ShellStat[]> {
  const [shiftsThisWeek, openTasks, notesPending] = await Promise.all([
    safeCount(async () => {
      const res = await client.get<{ data: { startedAt?: string; createdAt?: string }[] }>(
        '/shifts/history',
      );
      const rows = res.data?.data ?? [];
      const from = startOfWeek().getTime();
      const to = endOfWeek().getTime();
      return rows.filter((s) => {
        const t = new Date(s.startedAt ?? s.createdAt ?? 0).getTime();
        return t >= from && t < to;
      }).length;
    }),
    safeCount(async () => {
      const res = await client.get<{ data: unknown[]; meta?: { total?: number } }>('/tasks', {
        params: { status: 'pending', assignee: 'me', limit: 1 },
      });
      return res.data?.meta?.total ?? (res.data?.data?.length ?? 0);
    }),
    // Shift notes UI is still a placeholder — keep a real number (0) rather than "—".
    Promise.resolve(0),
  ]);

  return [
    { id: 'shiftsThisWeek', label: 'Shifts this week', value: String(shiftsThisWeek) },
    { id: 'openTasks', label: 'Open tasks', value: String(openTasks) },
    { id: 'notesPending', label: 'Notes pending', value: String(notesPending) },
  ];
}

async function fetchOrgStats(): Promise<ShellStat[]> {
  try {
    const dash = await getOrgDashboard();
    const stats = dash?.stats ?? dash ?? {};
    return [
      { id: 'families', label: 'Families', value: String(stats.families ?? 0) },
      { id: 'coordinators', label: 'Coordinators', value: String(stats.coordinators ?? 0) },
      {
        id: 'pendingRequests',
        label: 'Pending requests',
        value: String(stats.pendingIntakes ?? stats.pendingRequests ?? 0),
      },
    ];
  } catch {
    return [
      { id: 'families', label: 'Families', value: '0' },
      { id: 'coordinators', label: 'Coordinators', value: '0' },
      { id: 'pendingRequests', label: 'Pending requests', value: '0' },
    ];
  }
}
