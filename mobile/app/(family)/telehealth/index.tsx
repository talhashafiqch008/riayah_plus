import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import { EmptyState, StatusBadge } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';

function isJoinable(session: CareSession): boolean {
  return session.type === 'telehealth' && ['accepted', 'in_progress'].includes(session.status);
}

export default function FamilyTelehealthListScreen() {
  const toast = useToast();
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listSessions();
      setSessions(rows.filter((s) => s.type === 'telehealth'));
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Failed to load video sessions'), { type: 'danger' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter(isJoinable)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [sessions],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Video visits" subtitle="Join remote care sessions" showBack />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={FAMILY.teal} />
        </View>
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={FAMILY.teal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="videocam-outline"
              title="No video visits ready"
              subtitle="When a telehealth appointment is booked, it will appear here so you can join."
              action={{
                label: 'Back to appointments',
                onPress: () => router.replace('/(family)/bookings'),
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(family)/telehealth/${item.id}`)}
              className="mb-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-stone-900">Video visit</Text>
                  <Text className="mt-1 text-sm text-stone-600">{formatDateTime(item.scheduledAt)}</Text>
                  {item.provider?.name ? (
                    <Text className="mt-1 text-xs text-stone-400">With {item.provider.name}</Text>
                  ) : null}
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Text className="mt-3 text-sm font-semibold text-teal-700">Join visit</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
