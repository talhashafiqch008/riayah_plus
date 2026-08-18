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
import { fetchAdminComplianceStats } from '../../../lib/api/admin';
import { apiErrorMessage } from '../../../lib/format';

export default function AdminComplianceScreen() {
  const query = useQuery({
    queryKey: ['admin-compliance'],
    queryFn: fetchAdminComplianceStats,
  });

  const stats = query.data ?? {};
  const entries =
    stats && typeof stats === 'object' && !Array.isArray(stats)
      ? Object.entries(stats as Record<string, unknown>)
      : [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title="Compliance" subtitle="Org compliance snapshot" />
      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
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
              tintColor="#0D9488"
            />
          }
        >
          <View className="flex-row flex-wrap gap-3">
            {entries.length === 0 ? (
              <Card className="w-full">
                <Text className="text-sm text-stone-500">No compliance stats available.</Text>
              </Card>
            ) : (
              entries.map(([key, value]) => (
                <Card key={key} className="w-[47%]">
                  <Text className="text-xs text-stone-500">{key.replace(/_/g, ' ')}</Text>
                  <Text className="mt-1 text-xl font-semibold text-stone-900">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
                  </Text>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
