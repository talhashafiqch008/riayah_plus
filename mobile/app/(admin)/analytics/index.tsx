import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import {
  fetchAdminDashboard,
  fetchAdminUserAnalytics,
} from '../../../lib/api/admin';
import { apiErrorMessage } from '../../../lib/format';

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function roleLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleCount(row: { _count?: number | { _all?: number }; count?: number }): number {
  if (typeof row._count === 'number') return row._count;
  if (row._count && typeof row._count === 'object' && row._count._all != null) {
    return Number(row._count._all);
  }
  if (typeof row.count === 'number') return row.count;
  return 0;
}

type RoleRow = { role: string; _count?: number | { _all?: number }; count?: number };

export default function AdminAnalyticsScreen() {
  const dash = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
  });
  const analytics = useQuery({
    queryKey: ['admin-user-analytics'],
    queryFn: fetchAdminUserAnalytics,
  });

  const loading = dash.isLoading || analytics.isLoading;
  const error = dash.error || analytics.error;

  const d = (dash.data ?? {}) as Record<string, unknown>;
  const a = (analytics.data ?? {}) as Record<string, unknown>;

  const headline = [
    { label: 'Total users', value: a.totalUsers ?? d.users },
    { label: 'New this month', value: a.newThisMonth },
    { label: 'Active providers', value: a.activeProviders },
    { label: 'Active bookings', value: d.bookings },
    { label: 'Active episodes', value: d.activeEpisodes },
    { label: 'Pending docs', value: d.pendingDocs },
    { label: 'Pending payouts', value: d.pendingPayouts },
    { label: 'Overdue invoices', value: d.overdueInvoices },
  ].filter((x) => x.value !== undefined && x.value !== null);

  const byRole: RoleRow[] = Array.isArray(a.byRole) ? (a.byRole as RoleRow[]) : [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title="Analytics" subtitle="Platform user & ops metrics" />
      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load analytics"
          subtitle={apiErrorMessage(error)}
          action={{
            label: 'Try again',
            onPress: () => {
              void dash.refetch();
              void analytics.refetch();
            },
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={dash.isFetching || analytics.isFetching}
              onRefresh={() => {
                void dash.refetch();
                void analytics.refetch();
              }}
              tintColor="#0D9488"
            />
          }
        >
          <View className="flex-row flex-wrap gap-3">
            {headline.map((item) => (
              <Card key={item.label} className="w-[47%]">
                <Text className="text-xs text-stone-500">{item.label}</Text>
                <Text className="mt-1 text-xl font-semibold text-stone-900">
                  {String(item.value)}
                </Text>
              </Card>
            ))}
          </View>

          <Card className="mt-4" shadow={false}>
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
              By Role
            </Text>
            {byRole.length === 0 ? (
              <Text className="text-sm text-stone-500">No role breakdown available.</Text>
            ) : (
              byRole
                .slice()
                .sort((x, y) => roleCount(y) - roleCount(x))
                .map((row) => (
                  <View
                    key={row.role}
                    className="mb-2 flex-row items-center justify-between border-b border-stone-50 pb-2"
                  >
                    <Text className="text-sm text-stone-700">{roleLabel(row.role)}</Text>
                    <Text className="text-sm font-semibold text-stone-900">
                      {roleCount(row)}
                    </Text>
                  </View>
                ))
            )}
          </Card>

          {/* Any leftover scalar fields from APIs we didn't map */}
          {Object.entries({ ...d, ...a })
            .filter(
              ([key, v]) =>
                ![
                  'users',
                  'bookings',
                  'activeEpisodes',
                  'pendingDocs',
                  'pendingPayouts',
                  'overdueInvoices',
                  'totalUsers',
                  'newThisMonth',
                  'activeProviders',
                  'byRole',
                ].includes(key) &&
                v !== null &&
                v !== undefined &&
                typeof v !== 'object',
            )
            .map(([key, value]) => (
              <Card key={key} className="mt-3" shadow={false}>
                <Text className="text-xs text-stone-500">{humanizeKey(key)}</Text>
                <Text className="mt-1 text-base font-semibold text-stone-900">
                  {String(value)}
                </Text>
              </Card>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
