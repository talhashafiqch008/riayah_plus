import { useQuery } from '@tanstack/react-query';
import { RoleHome } from '../../../components/shell/RoleHome';
import { getOrgDashboard } from '../../../lib/api/org';

const NEXT_STEPS = [
  'Assign coordinators to new families',
  'Invite clinical and support staff',
  'Route pending care requests',
];

const QUICK_LINKS = [
  {
    name: 'Pending requests',
    href: '/(org)/requests',
    hint: 'Route unassigned care requests',
    icon: 'file-tray-outline' as const,
  },
  {
    name: 'Families',
    href: '/(org)/families',
    hint: 'Assign a primary coordinator',
    icon: 'people-outline' as const,
  },
  {
    name: 'Coordinators',
    href: '/(org)/coordinators',
    hint: 'Invite and activate coordinators',
    icon: 'person-add-outline' as const,
  },
  {
    name: 'Visit GPS',
    href: '/(org)/gps',
    hint: 'Staff check-ins and check-outs',
    icon: 'location-outline' as const,
  },
] as const;

export default function OrgHomeScreen() {
  const query = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: getOrgDashboard,
  });

  const stats = [
    {
      label: 'Families',
      value: query.data?.stats.families ?? '—',
      accent: 'teal' as const,
    },
    {
      label: 'Coordinators',
      value: query.data?.stats.coordinators ?? '—',
      accent: 'stone' as const,
    },
    {
      label: 'Pending\nrequests',
      value: query.data?.stats.pendingIntakes ?? '—',
      accent: 'amber' as const,
    },
  ];

  return (
    <RoleHome
      tagline="Families, staff, and care requests — in one place."
      notificationsHref="/(org)/notifications"
      profileHref="/(org)/profile"
      stats={stats}
      loading={query.isLoading && query.data == null}
      refreshing={query.isFetching}
      isError={query.isError}
      onRefresh={() => void query.refetch()}
      onRetry={() => void query.refetch()}
      nextSteps={NEXT_STEPS}
      quickLinks={QUICK_LINKS}
    />
  );
}
