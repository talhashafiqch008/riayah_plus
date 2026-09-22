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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { listEpisodes } from '../../../lib/api/care';
import { clinicalEpisodeStatus } from '../../../lib/clinicalI18n';
import { apiErrorMessage } from '../../../lib/format';
import { navForwardIcon } from '../../../lib/rtlIcons';

export default function ClinicalNotesHubScreen() {
  const { t, i18n } = useTranslation('clinical');
  const query = useQuery({
    queryKey: ['clinical-notes-episodes'],
    queryFn: () => listEpisodes({ limit: 50 }),
  });

  const episodes = query.data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={t('notes.title')}
        subtitle={t('notes.description')}
        showBack={false}
      />

      <View className="border-b border-stone-100 bg-white px-4 pb-3 pt-3">
        <Text className="text-sm text-stone-500">{t('notes.description')}</Text>
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('notes.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
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
              title={t('notes.empty')}
              subtitle={t('notes.emptyHint')}
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
                      {item.title ?? t('common.episode')}
                    </Text>
                    {item.status ? (
                      <StatusBadge
                        status={item.status}
                        label={clinicalEpisodeStatus(t, i18n, item.status)}
                      />
                    ) : null}
                  </View>
                  <Text className="mt-0.5 text-sm text-stone-500">
                    {item.careRecipient?.name ?? item.patient?.name ?? t('common.patient')}
                  </Text>
                </View>
                <Ionicons name={navForwardIcon()} size={18} color="#D6D3D1" />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
