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
import { listAssessments, type Assessment } from '../../../lib/api/assessments';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

const STATUS_FILTERS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: '', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

function patientName(row: Assessment): string {
  return row.patient?.name || row.episode?.title || 'Patient';
}

export default function ClinicalScheduleScreen() {
  const [status, setStatus] = useState('scheduled');

  const query = useQuery({
    queryKey: ['clinical-assessments', status],
    queryFn: () => listAssessments({ status: status || undefined, limit: 50 }),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? rows.length;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Schedule" subtitle="Assessments assigned to you" showBack={false} />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">
          Assessments assigned to you — complete with findings and report.
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
          title="Could not load assessments"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={rows}
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
            rows.length > 0 ? (
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {total} result{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No assessments"
              subtitle="Nothing in this filter yet. Assigned assessments appear here."
            />
          }
          renderItem={({ item }) => (
            <Card
              className="mb-3"
              onPress={() => router.push(`/(clinical)/schedule/${item.id}`)}
              shadow
            >
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                  <Ionicons name="clipboard-outline" size={20} color="#0F766E" />
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-semibold text-stone-900">{patientName(item)}</Text>
                    <StatusBadge
                      status={item.status}
                      label={item.status.replace(/_/g, ' ')}
                    />
                  </View>
                  <Text className="mt-0.5 text-sm capitalize text-stone-500">
                    {(item.type ?? 'assessment').replace(/_/g, ' ')}
                    {item.scheduledAt ? ` · ${formatDateTime(item.scheduledAt)}` : ''}
                  </Text>
                  {item.status === 'scheduled' ? (
                    <Text className="mt-1 text-sm font-medium text-teal-700">
                      Tap to complete
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
