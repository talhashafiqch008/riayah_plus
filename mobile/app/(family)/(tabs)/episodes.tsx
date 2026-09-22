import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, StatusBadge } from '../../../components/ui';
import {
  FAMILY,
  FamilyTabHero,
  familyCardStyle,
  familyPressSpring,
  familyReleaseSpring,
} from '../../../components/family/FamilyChrome';
import { listEpisodes } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';
import { navForwardIcon } from '../../../lib/rtlIcons';
import {
  familyEpisodeStatusFilters,
  familyEpisodeStatusLabel,
  formatFamilyDate,
} from '../../../lib/familyLanguage';

type Episode = {
  id: string;
  title?: string | null;
  status?: string | null;
  careRecipient?: { name?: string } | null;
  patient?: { name?: string } | null;
  createdAt?: string | null;
  reasonForCare?: string | null;
};

function SkeletonCard() {
  const shimmer = useSharedValue(0.4);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 750, easing: Easing.ease }),
        withTiming(0.4, { duration: 750, easing: Easing.ease }),
      ),
      -1,
      false,
    );
  }, [shimmer]);
  const style = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return (
    <Animated.View
      style={[
        { height: 88, borderRadius: 16, backgroundColor: FAMILY.stone200, marginBottom: 12 },
        style,
      ]}
    />
  );
}

function EpisodeCard({ item }: { item: Episode }) {
  const { t } = useTranslation('family');
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.97, familyPressSpring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, familyReleaseSpring);
        }}
        onPress={() => router.push(`/(family)/episodes/${item.id}`)}
        style={{ marginBottom: 12, ...familyCardStyle }}
      >
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View
              style={{
                marginTop: 2,
                height: 40,
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: FAMILY.teal50,
              }}
            >
              <Ionicons name="pulse-outline" size={20} color={FAMILY.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '700', color: FAMILY.stone900, letterSpacing: -0.2 }}>
                  {item.title ?? t('episodes.untitled')}
                </Text>
                {item.status ? (
                  <StatusBadge
                    status={item.status}
                    label={familyEpisodeStatusLabel(item.status)}
                  />
                ) : null}
              </View>
              <Text style={{ marginTop: 2, fontSize: 14, color: FAMILY.stone500 }}>
                {item.careRecipient?.name ?? item.patient?.name ?? t('mobile.common.careRecipient')}
                {item.createdAt
                  ? ` · ${t('mobile.common.started', { date: formatFamilyDate(item.createdAt) })}`
                  : ''}
              </Text>
              {item.reasonForCare ? (
                <Text
                  style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: '#57534E' }}
                  numberOfLines={2}
                >
                  {item.reasonForCare}
                </Text>
              ) : null}
            </View>
            <Ionicons name={navForwardIcon()} size={18} color="#D6D3D1" style={{ marginTop: 2 }} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyEpisodesScreen() {
  const { t } = useTranslation('family');
  const [status, setStatus] = useState('');
  const filters = familyEpisodeStatusFilters();

  const query = useQuery({
    queryKey: ['family-episodes', status],
    queryFn: () => listEpisodes({ status: status || undefined, limit: 50 }),
  });

  const episodes = query.data?.data ?? [];
  const total = query.data?.total ?? episodes.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title={t('episodes.title')}
        subtitle={t('mobile.common.journeysSubtitle')}
      />

      <View style={{ borderBottomWidth: 1, borderBottomColor: FAMILY.stone200, backgroundColor: FAMILY.white }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
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
                  paddingHorizontal: 16,
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
        </ScrollView>
      </View>

      {query.isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('episodes.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.common.tryAgain'), onPress: () => void query.refetch() }}
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
              tintColor={FAMILY.teal}
            />
          }
          ListHeaderComponent={
            episodes.length > 0 ? (
              <Text
                style={{
                  marginBottom: 14,
                  fontSize: 10,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 2.5,
                  color: FAMILY.stone400,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {t(total === 1 ? 'mobile.common.journeyCount' : 'mobile.common.journeyCount_other', {
                  count: total,
                })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('episodes.empty')}
              subtitle={t('mobile.common.journeysEmptyHint')}
              action={{
                label: t('dashboard.startCareRequest'),
                onPress: () => router.push('/(onboarding)/step-1-care-unit'),
              }}
            />
          }
          renderItem={({ item }) => <EpisodeCard item={item as Episode} />}
        />
      )}
    </SafeAreaView>
  );
}
