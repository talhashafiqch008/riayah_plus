import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import { listCareUnits, type CareUnit } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';
import { navForwardIcon } from '../../../lib/rtlIcons';

function locationLine(
  unit: CareUnit,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const place =
    [unit.city, unit.country].filter(Boolean).join(', ') || t('patients.noLocation');
  return unit.primaryCaregiverName
    ? t('patients.caregiver', { name: unit.primaryCaregiverName })
    : place;
}

export default function CoordinatorPatientsScreen() {
  const { t } = useTranslation('coordinator');
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
        title={t('patients.title')}
        subtitle={t('mobile.home.patientsHint')}
        showBack
      />

      <View className="border-b border-stone-200 bg-white px-4 pb-4 pt-4">
        <Text className="mb-3 text-sm leading-5 text-stone-500">
          {t('mobile.detail.patientsBrowseHint')}
        </Text>
        <Input
          placeholder={t('patients.searchPlaceholder')}
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
          title={t('mobile.detail.careUnitsLoadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
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
                {t('patients.unitCount', { count: total })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={t('patients.empty')}
              subtitle={t('mobile.detail.noCareUnitsHint')}
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
                    <Text className="mt-0.5 text-sm text-stone-500">{locationLine(item, t)}</Text>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      <Chip label={t('patients.patientCount', { count: patientCount })} />
                      <Chip
                        label={t('patients.intakeCount', { count: requests })}
                        tone="amber"
                      />
                      {journeys > 0 ? (
                        <Chip
                          label={t('patients.episodeCount', { count: journeys })}
                          tone="green"
                        />
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name={navForwardIcon()} size={18} color="#D6D3D1" />
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
