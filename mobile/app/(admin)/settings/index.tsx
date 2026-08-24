import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { ADMIN, adminCardStyle } from '../../../components/admin/AdminChrome';
import { fetchAdminSettings } from '../../../lib/api/admin';
import { apiErrorMessage } from '../../../lib/format';

export default function AdminSettingsScreen() {
  const query = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchAdminSettings,
  });

  const settings = query.data?.data ?? query.data ?? {};
  const entries =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? Object.entries(settings as Record<string, unknown>)
      : [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title="Settings" subtitle="Platform configuration (read-only)" />
      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load settings"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
              tintColor={ADMIN.teal}
            />
          }
        >
          {entries.length === 0 ? (
            <View className="p-4" style={adminCardStyle}>
              <Text className="text-sm text-stone-500">
                No settings payload returned. Edit settings on the web admin console.
              </Text>
            </View>
          ) : (
            entries.map(([key, value]) => (
              <View key={key} className="mb-3 p-4" style={adminCardStyle}>
                <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {key}
                </Text>
                <Text className="mt-1 text-sm text-stone-800">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
