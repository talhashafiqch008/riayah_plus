import { useQuery } from '@tanstack/react-query';
import { RoleHome } from '../../../components/shell/RoleHome';
import { getShiftHistory, listMyTasks } from '../../../lib/api/shifts';

type ShellStat = { label: string; value: string; accent: 'teal' | 'stone' | 'amber' };

const NEXT_STEPS = [
  'Check in to your next visit',
  'Complete assigned tasks',
  'Submit shift notes after visits',
];

const QUICK_LINKS = [
  {
    name: 'Visits',
    href: '/(support)/visits',
    hint: 'GPS check-in at the patient address',
    icon: 'location-outline' as const,
  },
  {
    name: 'My Shifts',
    href: '/(support)/shifts',
    hint: 'Start or end your shift',
    icon: 'time-outline' as const,
  },
  {
    name: 'Tasks',
    href: '/(support)/tasks',
    hint: 'Complete assigned care tasks',
    icon: 'checkmark-circle-outline' as const,
  },
] as const;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function endOfWeek(d = new Date()) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  return x;
}

async function fetchSupportStats(): Promise<ShellStat[]> {
  const [shiftsThisWeek, openTasks] = await Promise.all([
    (async () => {
      try {
        const rows = await getShiftHistory();
        const from = startOfWeek().getTime();
        const to = endOfWeek().getTime();
        return rows.filter((s) => {
          const t = new Date(s.startedAt ?? s.createdAt ?? 0).getTime();
          return t >= from && t < to;
        }).length;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const res = await listMyTasks({ status: 'pending', limit: 1 });
        return res.meta?.total ?? res.data.length;
      } catch {
        return 0;
      }
    })(),
  ]);

  return [
    { label: 'Shifts\nthis week', value: String(shiftsThisWeek), accent: 'teal' },
    { label: 'Open\ntasks', value: String(openTasks), accent: 'stone' },
    { label: 'Notes\npending', value: '0', accent: 'amber' },
  ];
}

export default function SupportHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['support-shell-stats'],
    queryFn: fetchSupportStats,
  });

  const stats = statsQuery.data ?? [
    { label: 'Shifts\nthis week', value: '—', accent: 'teal' as const },
    { label: 'Open\ntasks', value: '—', accent: 'stone' as const },
    { label: 'Notes\npending', value: '—', accent: 'amber' as const },
  ];

  return (
    <RoleHome
      tagline="Shifts, visits, and tasks for today."
      notificationsHref="/(support)/notifications"
      profileHref="/(support)/profile"
      stats={stats}
      loading={statsQuery.isLoading && !statsQuery.data}
      refreshing={statsQuery.isFetching}
      isError={statsQuery.isError}
      onRefresh={() => void statsQuery.refetch()}
      onRetry={() => void statsQuery.refetch()}
      nextSteps={NEXT_STEPS}
      quickLinks={QUICK_LINKS}
    />
  );
}
