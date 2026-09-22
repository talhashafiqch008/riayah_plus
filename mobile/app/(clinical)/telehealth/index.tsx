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
import { useTranslation } from 'react-i18next';
import { EmptyState, StatusBadge } from '../../../components/ui';
import { clinicalSessionStatus } from '../../../lib/clinicalI18n';
import { ROLE, RoleTabHero } from '../../../components/shell/RoleChrome';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';

function isJoinable(session: CareSession): boolean {
  return session.type === 'telehealth' && ['accepted', 'in_progress'].includes(session.status);
}

export default function ClinicalTelehealthListScreen() {
  const { t, i18n } = useTranslation('clinical');
  const toast = useToast();
  const [sessions, setSessions] = useState<CareSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listSessions();
      setSessions(rows.filter((s) => s.type === 'telehealth'));
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('telehealth.loadError')), { type: 'danger' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, toast]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: ROLE.stone50 }} edges={['top']}>
      <RoleTabHero
        title={t('nav.telehealth')}
        subtitle={t('mobile.more.telehealthDesc')}
        showBack
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ROLE.teal} />
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
              tintColor={ROLE.teal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="videocam-outline"
              title={t('mobile.detail.telehealthListEmptyTitle')}
              subtitle={t('mobile.detail.telehealthListEmptyHint')}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(clinical)/telehealth/${item.id}`)}
              className="mb-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-stone-900">
                    {item.client?.name ?? t('mobile.detail.patientVisit')}
                  </Text>
                  <Text className="mt-1 text-sm text-stone-600">{formatDateTime(item.scheduledAt)}</Text>
                </View>
                <StatusBadge
                  status={item.status}
                  label={clinicalSessionStatus(t, i18n, item.status)}
                />
              </View>
              <Text className="mt-3 text-sm font-semibold text-teal-700">{t('telehealth.openSession')}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
