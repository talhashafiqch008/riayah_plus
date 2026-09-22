import { useMemo } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RoleHome } from '../../../components/shell/RoleHome';
import { VoiceRecordWidget } from '../../../components/voice/VoiceRecordWidget';
import { listCarePlans, listEpisodes, listIntakeQueue } from '../../../lib/api/care';

type ShellStat = { label: string; value: string; accent: 'teal' | 'stone' | 'amber' };

async function fetchCoordinatorStats(labels: {
  pending: string;
  episodes: string;
  plans: string;
}): Promise<ShellStat[]> {
  const [submitted, underReview, activeEpisodes, plansAwaiting] = await Promise.all([
    (async () => {
      try {
        const res = await listIntakeQueue({ status: 'submitted', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const res = await listIntakeQueue({ status: 'under_review', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const res = await listEpisodes({ status: 'active', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const plans = await listCarePlans();
        return plans.filter(
          (p) => p.status === 'submitted_for_approval' || p.status === 'revision_requested',
        ).length;
      } catch {
        return 0;
      }
    })(),
  ]);

  return [
    { label: labels.pending, value: String(submitted + underReview), accent: 'amber' },
    { label: labels.episodes, value: String(activeEpisodes), accent: 'teal' },
    { label: labels.plans, value: String(plansAwaiting), accent: 'stone' },
  ];
}

export default function CoordinatorHomeScreen() {
  const { t } = useTranslation('coordinator');

  const labels = useMemo(
    () => ({
      pending: t('mobile.home.statsPending'),
      episodes: t('mobile.home.statsEpisodes'),
      plans: t('mobile.home.statsPlans'),
    }),
    [t],
  );

  const statsQuery = useQuery({
    queryKey: ['coordinator-shell-stats', labels.pending],
    queryFn: () => fetchCoordinatorStats(labels),
  });

  const stats = statsQuery.data ?? [
    { label: labels.pending, value: '—', accent: 'amber' as const },
    { label: labels.episodes, value: '—', accent: 'teal' as const },
    { label: labels.plans, value: '—', accent: 'stone' as const },
  ];

  const nextSteps = useMemo(
    () => [
      t('dashboard.steps.reviewIntake'),
      t('dashboard.steps.requestDocs'),
      t('dashboard.steps.scheduleConsults'),
      t('dashboard.steps.escalate'),
    ],
    [t],
  );

  const quickLinks = useMemo(
    () =>
      [
        {
          name: t('nav.intake'),
          href: '/(coordinator)/intake',
          hint: t('mobile.home.intakeHint'),
          icon: 'document-text-outline' as const,
        },
        {
          name: t('nav.patients'),
          href: '/(coordinator)/patients',
          hint: t('mobile.home.patientsHint'),
          icon: 'people-outline' as const,
        },
        {
          name: t('nav.episodes'),
          href: '/(coordinator)/episodes',
          hint: t('mobile.home.episodesHint'),
          icon: 'heart-outline' as const,
        },
        {
          name: t('nav.plans'),
          href: '/(coordinator)/plans',
          hint: t('mobile.home.plansHint'),
          icon: 'clipboard-outline' as const,
        },
        {
          name: t('mobile.detail.visitGps'),
          href: '/(coordinator)/map',
          hint: t('mobile.home.gpsHint'),
          icon: 'location-outline' as const,
        },
      ] as const,
    [t],
  );

  return (
    <RoleHome
      i18nNs="coordinator"
      tagline={t('mobile.home.tagline')}
      notificationsHref="/(coordinator)/notifications"
      profileHref="/(coordinator)/profile"
      stats={stats}
      loading={statsQuery.isLoading && !statsQuery.data}
      refreshing={statsQuery.isFetching}
      isError={statsQuery.isError}
      onRefresh={() => void statsQuery.refetch()}
      onRetry={() => void statsQuery.refetch()}
      nextSteps={nextSteps}
      cta={{
        label: t('dashboard.openIntake'),
        onPress: () => router.push('/(coordinator)/intake'),
      }}
      quickLinks={quickLinks}
      topWidget={
        <VoiceRecordWidget historyHref="/(coordinator)/voice-recordings" i18nNs="coordinator" />
      }
    />
  );
}
