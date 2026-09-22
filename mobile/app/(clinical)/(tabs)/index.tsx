import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RoleHome } from '../../../components/shell/RoleHome';
import { VoiceRecordWidget } from '../../../components/voice/VoiceRecordWidget';
import { listAssessments } from '../../../lib/api/assessments';

type ShellStat = { label: string; value: string; accent: 'teal' | 'stone' | 'amber' };

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

async function fetchClinicalStats(labels: {
  sessions: string;
  patients: string;
  notes: string;
}): Promise<ShellStat[]> {
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
    { label: labels.sessions, value: String(todaySessions), accent: 'teal' },
    { label: labels.patients, value: String(assignedPatients), accent: 'stone' },
    { label: labels.notes, value: String(notesDue), accent: 'amber' },
  ];
}

export default function ClinicalHomeScreen() {
  const { t } = useTranslation('clinical');

  const labels = useMemo(
    () => ({
      sessions: t('mobile.home.statsSessions'),
      patients: t('mobile.home.statsPatients'),
      notes: t('mobile.home.statsNotes'),
    }),
    [t],
  );

  const statsQuery = useQuery({
    queryKey: ['clinical-shell-stats', labels.sessions],
    queryFn: () => fetchClinicalStats(labels),
  });

  const stats = statsQuery.data ?? [
    { label: labels.sessions, value: '—', accent: 'teal' as const },
    { label: labels.patients, value: '—', accent: 'stone' as const },
    { label: labels.notes, value: '—', accent: 'amber' as const },
  ];

  const nextSteps = useMemo(
    () => [
      t('dashboard.steps.reviewSchedule'),
      t('dashboard.steps.completeNotes'),
      t('dashboard.steps.updateAssessments'),
    ],
    [t],
  );

  const quickLinks = useMemo(
    () =>
      [
        {
          name: t('nav.schedule'),
          href: '/(clinical)/schedule',
          hint: t('mobile.home.scheduleHint'),
          icon: 'calendar-outline' as const,
        },
        {
          name: t('nav.patients'),
          href: '/(clinical)/patients',
          hint: t('mobile.home.patientsHint'),
          icon: 'people-outline' as const,
        },
        {
          name: t('nav.notes'),
          href: '/(clinical)/notes',
          hint: t('mobile.home.notesHint'),
          icon: 'medkit-outline' as const,
        },
      ] as const,
    [t],
  );

  return (
    <RoleHome
      i18nNs="clinical"
      tagline={t('mobile.home.tagline')}
      notificationsHref="/(clinical)/notifications"
      profileHref="/(clinical)/profile"
      stats={stats}
      loading={statsQuery.isLoading && !statsQuery.data}
      refreshing={statsQuery.isFetching}
      isError={statsQuery.isError}
      onRefresh={() => void statsQuery.refetch()}
      onRetry={() => void statsQuery.refetch()}
      nextSteps={nextSteps}
      quickLinks={quickLinks}
      topWidget={
        <VoiceRecordWidget historyHref="/(clinical)/voice-recordings" i18nNs="clinical" />
      }
    />
  );
}
