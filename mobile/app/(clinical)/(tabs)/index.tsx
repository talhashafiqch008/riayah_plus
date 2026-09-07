import { useQuery } from '@tanstack/react-query';
import { RoleHome } from '../../../components/shell/RoleHome';
import { VoiceRecordWidget } from '../../../components/voice/VoiceRecordWidget';
import { listAssessments } from '../../../lib/api/assessments';

type ShellStat = { label: string; value: string; accent: 'teal' | 'stone' | 'amber' };

const NEXT_STEPS = [
  'Review today’s schedule',
  'Complete session notes',
  'Update patient assessments',
];

const QUICK_LINKS = [
  {
    name: 'Schedule',
    href: '/(clinical)/schedule',
    hint: 'Assessments assigned to you',
    icon: 'calendar-outline' as const,
  },
  {
    name: 'Patients',
    href: '/(clinical)/patients',
    hint: 'Care episodes in your organization',
    icon: 'people-outline' as const,
  },
  {
    name: 'Session Notes',
    href: '/(clinical)/notes',
    hint: 'Document visits',
    icon: 'medkit-outline' as const,
  },
] as const;

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

function isSameDay(iso: string, day: Date) {
  const t = new Date(iso).getTime();
  return t >= startOfDay(day).getTime() && t <= endOfDay(day).getTime();
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
    { label: "Today's\nsessions", value: String(todaySessions), accent: 'teal' },
    { label: 'Assigned\npatients', value: String(assignedPatients), accent: 'stone' },
    { label: 'Notes\ndue', value: String(notesDue), accent: 'amber' },
  ];
}

export default function ClinicalHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['clinical-shell-stats'],
    queryFn: fetchClinicalStats,
  });

  const stats = statsQuery.data ?? [
    { label: "Today's\nsessions", value: '—', accent: 'teal' as const },
    { label: 'Assigned\npatients', value: '—', accent: 'stone' as const },
    { label: 'Notes\ndue', value: '—', accent: 'amber' as const },
  ];

  return (
    <RoleHome
      tagline="Schedule, patients, and session notes."
      notificationsHref="/(clinical)/notifications"
      profileHref="/(clinical)/profile"
      stats={stats}
      loading={statsQuery.isLoading && !statsQuery.data}
      refreshing={statsQuery.isFetching}
      isError={statsQuery.isError}
      onRefresh={() => void statsQuery.refetch()}
      onRetry={() => void statsQuery.refetch()}
      nextSteps={NEXT_STEPS}
      quickLinks={QUICK_LINKS}
      topWidget={<VoiceRecordWidget historyHref="/(clinical)/voice-recordings" />}
    />
  );
}
