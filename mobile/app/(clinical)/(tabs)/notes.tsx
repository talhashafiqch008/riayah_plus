import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { episodeStatusLabel, listEpisodes } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';

export default function ClinicalNotesHubScreen() {
  const query = useQuery({
    queryKey: ['clinical-notes-episodes'],
    queryFn: () => listEpisodes({ limit: 50 }),
  });

  const episodes = query.data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Session Notes" subtitle="Document visits and follow-ups" showBack={false} />

      <View className="border-b border-stone-100 bg-white px-4 pb-3 pt-3">
        <Text className="text-sm text-stone-500">
          Choose a care episode to view or add clinical notes. Notes are immutable after save.
        </Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load episodes"
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
          ListEmptyComponent={
            <EmptyState
              icon="medkit-outline"
              title="No episodes available yet"
              subtitle="Episodes appear after a coordinator starts a care journey for a patient in your organization."
            />
          }
          renderItem={({ item }) => (
            <Card
              className="mb-3"
              onPress={() => router.push(`/(clinical)/notes/${item.id}`)}
              shadow
            >
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                  <Ionicons name="medkit-outline" size={20} color="#0F766E" />
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-semibold text-stone-900">
                      {item.title ?? 'Episode'}
                    </Text>
                    {item.status ? (
                      <StatusBadge
                        status={item.status}
                        label={episodeStatusLabel(item.status)}
                      />
                    ) : null}
                  </View>
                  <Text className="mt-0.5 text-sm text-stone-500">
                    {item.careRecipient?.name ?? item.patient?.name ?? 'Patient'}
                    {item.coordinator?.name ? ` · Coord: ${item.coordinator.name}` : ''}
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
