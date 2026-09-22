import { useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, StatusBadge } from '../../../components/ui';
import { FAMILY, FamilyTabHero, familyCardStyle } from '../../../components/family/FamilyChrome';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';
import { apiErrorMessage } from '../../../lib/format';
import { familySessionStatusLabel, formatFamilyDateTime } from '../../../lib/familyLanguage';

export default function FamilyBookingsScreen() {
  const { t } = useTranslation('family');
  const [status, setStatus] = useState('');

  const filters = useMemo(
    () =>
      [
        { value: '', label: t('mobile.common.all') },
        { value: 'accepted', label: t('mobile.common.filterUpcoming') },
        { value: 'completed', label: t('mobile.common.filterDone') },
        { value: 'cancelled', label: t('mobile.common.filterCancelled') },
      ] as const,
    [t],
  );

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
        title={t('appointments.title')}
        subtitle={t('mobile.common.bookingsSubtitle')}
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
          {filters.map((filter) => {
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
        <Button onPress={() => router.push('/(family)/book-session' as never)}>
          {t('mobile.common.book')}
        </Button>
      </View>

      {query.isLoading ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: FAMILY.stone400, textAlign: 'center' }}>
            {t('mobile.common.loading')}
          </Text>
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('appointments.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.common.tryAgain'), onPress: () => void query.refetch() }}
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
              title={t('appointments.empty')}
              subtitle={t('mobile.common.emptySessionsHint')}
              action={{
                label: t('appointments.bookSession'),
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
  const { t } = useTranslation('family');
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
            {formatFamilyDateTime(item.scheduledAt)}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: FAMILY.stone500 }}>
            {item.provider?.name
              ? t('mobile.common.withProvider', { name: item.provider.name })
              : t('mobile.common.clinicianTba')}
            {item.durationMinutes
              ? ` · ${t('common.min', { count: item.durationMinutes })}`
              : ''}
          </Text>
          {isTelehealth ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="videocam-outline" size={14} color={FAMILY.teal} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: FAMILY.teal }}>
                {t('mobile.common.videoTapJoin')}
              </Text>
            </View>
          ) : null}
        </View>
        <StatusBadge status={item.status} label={familySessionStatusLabel(item.status)} />
      </View>
    </Pressable>
  );
}
