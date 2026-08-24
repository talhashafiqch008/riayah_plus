import { useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { EmptyState } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { ADMIN, adminCardStyle } from '../../../components/admin/AdminChrome';
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

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function RoleBar({
  label,
  count,
  max,
  index,
}: {
  label: string;
  count: number;
  max: number;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const ratio = max > 0 ? count / max : 0;
  const scaleX = useSharedValue(reduceMotion ? Math.max(ratio, 0.04) : 0.04);

  useEffect(() => {
    const next = Math.max(ratio, 0.04);
    if (reduceMotion) {
      scaleX.value = next;
      return;
    }
    scaleX.value = withDelay(
      index * 40,
      withTiming(next, { duration: 420, easing: EASE_OUT }),
    );
  }, [index, ratio, reduceMotion, scaleX]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: scaleX.value }] }));

  return (
    <View className="mb-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-sm text-stone-700">{label}</Text>
        <Text className="text-sm font-bold text-stone-900" style={{ fontVariant: ['tabular-nums'] }}>
          {count}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-stone-100">
        <Animated.View
          style={[
            {
              height: 8,
              width: '100%',
              borderRadius: 99,
              backgroundColor: ADMIN.teal,
              transformOrigin: 'left',
            },
            style,
          ]}
        />
      </View>
    </View>
  );
}

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
  const sortedRoles = byRole.slice().sort((x, y) => roleCount(y) - roleCount(x));
  const maxRole = Math.max(...sortedRoles.map(roleCount), 1);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title="Analytics" subtitle="Platform user and ops metrics" />
      {loading ? (
        <View className="flex-row flex-wrap gap-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="h-24 w-[47%]" style={adminCardStyle} />
          ))}
        </View>
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
              refreshing={(dash.isFetching || analytics.isFetching) && !loading}
              onRefresh={() => {
                void dash.refetch();
                void analytics.refetch();
              }}
              tintColor={ADMIN.teal}
            />
          }
        >
          <View className="flex-row flex-wrap gap-3">
            {headline.map((item) => (
              <View key={item.label} className="w-[47%] p-4" style={adminCardStyle}>
                <Text className="text-xs text-stone-500">{item.label}</Text>
                <Text
                  className="mt-1 text-2xl font-extrabold text-stone-900"
                  style={{ letterSpacing: -0.6, fontVariant: ['tabular-nums'] }}
                >
                  {String(item.value)}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-4 p-4" style={adminCardStyle}>
            <Text className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
              By role
            </Text>
            {sortedRoles.length === 0 ? (
              <Text className="text-sm text-stone-500">No role breakdown available.</Text>
            ) : (
              sortedRoles.map((row, i) => (
                <RoleBar
                  key={row.role}
                  index={i}
                  label={roleLabel(row.role)}
                  count={roleCount(row)}
                  max={maxRole}
                />
              ))
            )}
          </View>

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
              <View key={key} className="mt-3 p-4" style={adminCardStyle}>
                <Text className="text-xs text-stone-500">{humanizeKey(key)}</Text>
                <Text className="mt-1 text-base font-semibold text-stone-900">
                  {String(value)}
                </Text>
              </View>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
