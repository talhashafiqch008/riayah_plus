import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, StatusBadge } from '../../../components/ui';
import { FAMILY, FamilyTabHero, familyCardStyle } from '../../../components/family/FamilyChrome';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'accepted', label: 'Upcoming' },
  { value: 'completed', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function FamilyBookingsScreen() {
  const [status, setStatus] = useState('');

  const query = useQuery({
    queryKey: ['family-sessions', status],
    queryFn: () => listSessions(),
  });

  const all = query.data ?? [];
  const rows = status
    ? all.filter((s) => {
        if (status === 'accepted') {
          return ['pending', 'accepted', 'in_progress'].includes(s.status);
        }
        return s.status === status;
      })
    : all;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title="Appointments"
        subtitle="Sessions with your assigned clinician"
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: FAMILY.stone200,
          backgroundColor: FAMILY.white,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 }}>
          {FILTERS.map((filter) => {
            const active = status === filter.value;
            return (
              <Pressable
                key={filter.value || 'all'}
                onPress={() => setStatus(filter.value)}
                style={{
                  borderRadius: 99,
                  borderWidth: 1,
                  borderColor: active ? FAMILY.teal : FAMILY.stone200,
                  backgroundColor: active ? FAMILY.teal50 : FAMILY.white,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: active ? '700' : '400',
                    color: active ? FAMILY.teal : FAMILY.stone500,
                  }}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Button onPress={() => router.push('/(family)/book-session' as never)}>Book</Button>
      </View>

      {query.isLoading ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: FAMILY.stone400, textAlign: 'center' }}>Loading…</Text>
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load appointments"
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
              tintColor={FAMILY.teal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No sessions yet"
              subtitle="Book an open slot with your assigned clinician, or wait for your coordinator to schedule one."
              action={{
                label: 'Book session',
                onPress: () => router.push('/(family)/book-session' as never),
              }}
            />
          }
          renderItem={({ item }) => <SessionCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function SessionCard({ item }: { item: CareSession }) {
  const isTelehealth = item.type === 'telehealth';
  return (
    <Pressable
      onPress={() => {
        if (isTelehealth) router.push(`/(family)/telehealth/${item.id}` as never);
      }}
      style={[familyCardStyle, { marginBottom: 12, padding: 14 }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: FAMILY.stone900 }}>
            {formatDateTime(item.scheduledAt)}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: FAMILY.stone500 }}>
            {item.provider?.name ? `With ${item.provider.name}` : 'Clinician TBA'}
            {item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}
          </Text>
          {isTelehealth ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="videocam-outline" size={14} color={FAMILY.teal} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: FAMILY.teal }}>
                Video visit — tap to join
              </Text>
            </View>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
      </View>
    </Pressable>
  );
}
