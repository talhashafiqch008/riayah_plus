import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { carePlanStatusLabel, listCarePlans } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'submitted_for_approval', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'revision_requested', label: 'Revision requested' },
  { value: 'completed', label: 'Completed' },
] as const;

export default function ClinicalCarePlansScreen() {
  const [status, setStatus] = useState('');

  const query = useQuery({
    queryKey: ['clinical-care-plans'],
    queryFn: () => listCarePlans(),
  });

  const plans = useMemo(
    () => (query.data ?? []).filter((p) => p.isCurrentVersion !== false),
    [query.data],
  );

  const filtered = useMemo(
    () => (status ? plans.filter((p) => p.status === status) : plans),
    [plans, status],
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Care Plans" showBack />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">
          Review plans for your organization and add an optional clinical co-sign.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = status === filter.value;
            return (
              <Pressable
                key={filter.value || 'all'}
                onPress={() => setStatus(filter.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${active ? 'font-medium text-teal-700' : 'text-stone-600'}`}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load care plans"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title="No care plans to review yet"
              subtitle="Plans appear after a coordinator creates and submits one for an episode in your org."
            />
          }
          renderItem={({ item }) => (
            <Card
              className="mb-3"
              onPress={() => router.push(`/(clinical)/plans/${item.id}`)}
              shadow
            >
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                  <Ionicons name="book-outline" size={20} color="#0F766E" />
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-semibold text-stone-900">{item.title}</Text>
                    <StatusBadge
                      status={item.status}
                      label={carePlanStatusLabel(item.status, 'staff')}
                    />
                  </View>
                  <Text className="mt-0.5 text-sm text-stone-500">
                    {item.episode?.title || 'Episode'}
                    {' · '}
                    {item.goals?.length ?? 0} goals · {item.items?.length ?? 0} services · v
                    {item.version}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
