import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RoleHome } from '../../../components/shell/RoleHome';
import { getShiftHistory, listMyTasks } from '../../../lib/api/shifts';

type ShellStat = { label: string; value: string; accent: 'teal' | 'stone' | 'amber' };

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

async function fetchSupportStats(labels: {
  shifts: string;
  tasks: string;
  notes: string;
}): Promise<ShellStat[]> {
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
    { label: labels.shifts, value: String(shiftsThisWeek), accent: 'teal' },
    { label: labels.tasks, value: String(openTasks), accent: 'stone' },
    { label: labels.notes, value: '0', accent: 'amber' },
  ];
}

export default function SupportHomeScreen() {
  const { t } = useTranslation('support');

  const labels = useMemo(
    () => ({
      shifts: t('mobile.home.statsShifts'),
      tasks: t('mobile.home.statsTasks'),
      notes: t('mobile.home.statsNotes'),
    }),
    [t],
  );

  const statsQuery = useQuery({
    queryKey: ['support-shell-stats', labels.shifts],
    queryFn: () => fetchSupportStats(labels),
  });

  const stats = statsQuery.data ?? [
    { label: labels.shifts, value: '—', accent: 'teal' as const },
    { label: labels.tasks, value: '—', accent: 'stone' as const },
    { label: labels.notes, value: '—', accent: 'amber' as const },
  ];

  const nextSteps = useMemo(
    () => [
      t('mobile.home.stepCheckIn'),
      t('dashboard.steps.completeTasks'),
      t('dashboard.steps.submitNotes'),
    ],
    [t],
  );

  const quickLinks = useMemo(
    () =>
      [
        {
          name: t('visits.title'),
          href: '/(support)/visits',
          hint: t('mobile.home.visitsHint'),
          icon: 'location-outline' as const,
        },
        {
          name: t('nav.shifts'),
          href: '/(support)/shifts',
          hint: t('mobile.home.shiftsHint'),
          icon: 'time-outline' as const,
        },
        {
          name: t('nav.tasks'),
          href: '/(support)/tasks',
          hint: t('mobile.home.tasksHint'),
          icon: 'checkmark-circle-outline' as const,
        },
      ] as const,
    [t],
  );

  return (
    <RoleHome
      i18nNs="support"
      tagline={t('mobile.home.tagline')}
      notificationsHref="/(support)/notifications"
      profileHref="/(support)/profile"
      stats={stats}
      loading={statsQuery.isLoading && !statsQuery.data}
      refreshing={statsQuery.isFetching}
      isError={statsQuery.isError}
      onRefresh={() => void statsQuery.refetch()}
      onRetry={() => void statsQuery.refetch()}
      nextSteps={nextSteps}
      quickLinks={quickLinks}
    />
  );
}
