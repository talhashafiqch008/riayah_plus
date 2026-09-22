import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RoleHome } from '../../../components/shell/RoleHome';
import { getOrgDashboard } from '../../../lib/api/org';

export default function OrgHomeScreen() {
  const { t } = useTranslation('org');

  const query = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: getOrgDashboard,
  });

  const stats = useMemo(
    () => [
      {
        label: t('mobile.home.statsFamilies'),
        value: query.data?.stats.families ?? '—',
        accent: 'teal' as const,
      },
      {
        label: t('mobile.home.statsCoordinators'),
        value: query.data?.stats.coordinators ?? '—',
        accent: 'stone' as const,
      },
      {
        label: t('mobile.home.statsPending'),
        value: query.data?.stats.pendingIntakes ?? '—',
        accent: 'amber' as const,
      },
    ],
    [t, query.data],
  );

  const nextSteps = useMemo(
    () => [
      t('dashboard.steps.assignCoordinators'),
      t('dashboard.steps.inviteStaff'),
      t('dashboard.steps.routePending'),
    ],
    [t],
  );

  const quickLinks = useMemo(
    () =>
      [
        {
          name: t('nav.pending'),
          href: '/(org)/requests',
          hint: t('mobile.home.pendingHint'),
          icon: 'file-tray-outline' as const,
        },
        {
          name: t('nav.families'),
          href: '/(org)/families',
          hint: t('mobile.home.familiesHint'),
          icon: 'people-outline' as const,
        },
        {
          name: t('nav.coordinators'),
          href: '/(org)/coordinators',
          hint: t('mobile.home.coordinatorsHint'),
          icon: 'person-add-outline' as const,
        },
        {
          name: t('mobile.home.visitGps'),
          href: '/(org)/gps',
          hint: t('mobile.home.gpsHint'),
          icon: 'location-outline' as const,
        },
      ] as const,
    [t],
  );

  return (
    <RoleHome
      i18nNs="org"
      tagline={t('mobile.home.tagline')}
      notificationsHref="/(org)/notifications"
      profileHref="/(org)/profile"
      stats={stats}
      loading={query.isLoading && query.data == null}
      refreshing={query.isFetching}
      isError={query.isError}
      onRefresh={() => void query.refetch()}
      onRetry={() => void query.refetch()}
      nextSteps={nextSteps}
      quickLinks={quickLinks}
    />
  );
}
