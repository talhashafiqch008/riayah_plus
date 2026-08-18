import { useState } from 'react';
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
import { listEpisodes } from '../../../lib/api/care';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import {
  FAMILY_EPISODE_STATUS_FILTERS,
  familyEpisodeStatusLabel,
} from '../../../lib/familyLanguage';

export default function FamilyEpisodesScreen() {
  const [status, setStatus] = useState('');

  const query = useQuery({
    queryKey: ['family-episodes', status],
    queryFn: () => listEpisodes({ status: status || undefined, limit: 50 }),
  });

  const episodes = query.data?.data ?? [];
  const total = query.data?.total ?? episodes.length;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Care Journey" showBack={false} />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">
          Follow your care journey from request received through active care.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {FAMILY_EPISODE_STATUS_FILTERS.map((filter) => {
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
                  className={`text-sm ${
                    active ? 'font-medium text-teal-700' : 'text-stone-600'
                  }`}
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
          title="Could not load care journeys"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListHeaderComponent={
            episodes.length > 0 ? (
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {total} journey{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="No care journeys yet"
              subtitle="After you submit a care request, your care team will start one."
              action={{
                label: 'Start a care request',
                onPress: () => router.push('/(onboarding)/step-1-care-unit'),
              }}
            />
          }
          renderItem={({ item }) => (
            <Card
              className="mb-3"
              onPress={() => router.push(`/(family)/episodes/${item.id}`)}
              shadow
            >
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                  <Ionicons name="pulse-outline" size={20} color="#0F766E" />
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-semibold text-stone-900">
                      {item.title ?? 'Care journey'}
                    </Text>
                    {item.status ? (
                      <StatusBadge
                        status={item.status}
                        label={familyEpisodeStatusLabel(item.status)}
                      />
                    ) : null}
                  </View>
                  <Text className="mt-0.5 text-sm text-stone-500">
                    {item.careRecipient?.name ?? item.patient?.name ?? 'Care recipient'}
                    {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ''}
                  </Text>
                  {item.reasonForCare ? (
                    <Text className="mt-1 text-sm text-stone-600" numberOfLines={2}>
                      {item.reasonForCare}
                    </Text>
                  ) : null}
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
