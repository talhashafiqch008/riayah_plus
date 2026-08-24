import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RoleHome } from '../../../components/shell/RoleHome';
import { listCarePlans, listEpisodes, listIntakeQueue } from '../../../lib/api/care';

type ShellStat = { label: string; value: string; accent: 'teal' | 'stone' | 'amber' };

const NEXT_STEPS = [
  'Review new intake requests',
  'Request missing documents from families',
  'Schedule consultations after episode creation',
  'Escalate urgency when clinically indicated',
];

const QUICK_LINKS = [
  {
    name: 'Intake Queue',
    href: '/(coordinator)/intake',
    hint: 'Review submitted requests',
    icon: 'document-text-outline' as const,
  },
  {
    name: 'Patients',
    href: '/(coordinator)/patients',
    hint: 'Care units in your organization',
    icon: 'people-outline' as const,
  },
  {
    name: 'Episodes',
    href: '/(coordinator)/episodes',
    hint: 'Advance status and schedule',
    icon: 'heart-outline' as const,
  },
  {
    name: 'Care Plans',
    href: '/(coordinator)/plans',
    hint: 'Build and submit plans',
    icon: 'clipboard-outline' as const,
  },
  {
    name: 'Visit GPS',
    href: '/(coordinator)/map',
    hint: 'Check-ins, check-outs, and live visits',
    icon: 'location-outline' as const,
  },
] as const;

async function fetchCoordinatorStats(): Promise<ShellStat[]> {
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
    { label: 'Pending\nintake', value: String(submitted + underReview), accent: 'amber' },
    { label: 'Active\nepisodes', value: String(activeEpisodes), accent: 'teal' },
    { label: 'Plans\nawaiting', value: String(plansAwaiting), accent: 'stone' },
  ];
}

export default function CoordinatorHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['coordinator-shell-stats'],
    queryFn: fetchCoordinatorStats,
  });

  const stats = statsQuery.data ?? [
    { label: 'Pending\nintake', value: '—', accent: 'amber' as const },
    { label: 'Active\nepisodes', value: '—', accent: 'teal' as const },
    { label: 'Plans\nawaiting', value: '—', accent: 'stone' as const },
  ];

  return (
    <RoleHome
      tagline="Intake, episodes, and plans for your panel."
      notificationsHref="/(coordinator)/notifications"
      profileHref="/(coordinator)/profile"
      stats={stats}
      loading={statsQuery.isLoading && !statsQuery.data}
      refreshing={statsQuery.isFetching}
      isError={statsQuery.isError}
      onRefresh={() => void statsQuery.refetch()}
      onRetry={() => void statsQuery.refetch()}
      nextSteps={NEXT_STEPS}
      cta={{ label: 'Open intake queue', onPress: () => router.push('/(coordinator)/intake') }}
      quickLinks={QUICK_LINKS}
    />
  );
}
