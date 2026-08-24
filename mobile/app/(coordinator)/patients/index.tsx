import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import { listCareUnits, type CareUnit } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';

function locationLine(unit: CareUnit): string {
  const place = [unit.city, unit.country].filter(Boolean).join(', ') || 'No location';
  return unit.primaryCaregiverName ? `${place} · Caregiver: ${unit.primaryCaregiverName}` : place;
}

export default function CoordinatorPatientsScreen() {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['coordinator-care-units', search.trim()],
    queryFn: () => listCareUnits({ search: search.trim() || undefined, limit: 50 }),
  });

  const units = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Patients"
        subtitle="Care units in your organization"
        showBack
      />

      <View className="border-b border-stone-200 bg-white px-4 pb-4 pt-4">
        <Text className="mb-3 text-sm leading-5 text-stone-500">
          Browse care units and open patient profiles from intake.
        </Text>
        <Input
          placeholder="Search care units…"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          leftIcon={<Ionicons name="search-outline" size={18} color="#A8A29E" />}
        />
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load care units"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={units}
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
            units.length > 0 ? (
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {total} unit{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No care units yet"
              subtitle="Families in your organization will appear here after onboarding."
            />
          }
          renderItem={({ item }) => {
            const patientCount = item.careRecipients?.length ?? 0;
            const requests = item._count?.intakeRecords ?? item.intakeRecords?.length ?? 0;
            const journeys = item._count?.careEpisodes ?? item.careEpisodes?.length ?? 0;
            return (
              <Card
                className="mb-3"
                onPress={() => router.push(`/(coordinator)/patients/${item.id}`)}
                shadow
              >
                <View className="flex-row items-start gap-3">
                  <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                    <Ionicons name="people-outline" size={20} color="#0F766E" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-stone-900">{item.name}</Text>
                    <Text className="mt-0.5 text-sm text-stone-500">{locationLine(item)}</Text>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      <Chip
                        label={`${patientCount} ${patientCount === 1 ? 'patient' : 'patients'}`}
                      />
                      <Chip
                        label={`${requests} request${requests === 1 ? '' : 's'}`}
                        tone="amber"
                      />
                      {journeys > 0 ? (
                        <Chip
                          label={`${journeys} episode${journeys === 1 ? '' : 's'}`}
                          tone="green"
                        />
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
