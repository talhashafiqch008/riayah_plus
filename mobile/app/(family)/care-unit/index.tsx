import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
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
import { Chip, EmptyState, Input } from '../../../components/ui';
import {
  FAMILY,
  FamilyTabHero,
  familyCardStyle,
  familyPressSpring,
  familyReleaseSpring,
} from '../../../components/family/FamilyChrome';
import { listCareUnits, type CareUnit } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';
import { navForwardIcon } from '../../../lib/rtlIcons';

function locationLine(unit: CareUnit, noLocation: string, caregiverPrefix: string): string {
  const place = [unit.city, unit.country].filter(Boolean).join(', ') || noLocation;
  return unit.primaryCaregiverName
    ? `${place} · ${caregiverPrefix}: ${unit.primaryCaregiverName}`
    : place;
}

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
        { height: 96, borderRadius: 16, backgroundColor: FAMILY.stone200, marginBottom: 12 },
        style,
      ]}
    />
  );
}

function CareUnitCard({ item }: { item: CareUnit }) {
  const { t } = useTranslation('family');
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const patientCount = item.careRecipients?.length ?? 0;
  const requests = item._count?.intakeRecords ?? item.intakeRecords?.length ?? 0;
  const journeys = item._count?.careEpisodes ?? item.careEpisodes?.length ?? 0;

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
        onPress={() => router.push(`/(family)/care-unit/${item.id}`)}
        style={{ marginBottom: 12, padding: 16, ...familyCardStyle }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              marginTop: 2,
              borderRadius: 12,
              backgroundColor: FAMILY.teal50,
              padding: 10,
            }}
          >
            <Ionicons name="people-outline" size={20} color={FAMILY.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: FAMILY.stone900, letterSpacing: -0.2 }}>
              {item.name}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 14, color: FAMILY.stone500 }}>
              {locationLine(item, t('careUnit.location'), t('careUnit.accountHolder'))}
            </Text>
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip
                label={`${patientCount} ${patientCount === 1 ? t('careUnit.person') : t('careUnit.people')}`}
              />
              <Chip
                label={`${requests} ${requests === 1 ? t('episodes.journey') : t('episodes.journeys')}`}
                tone="amber"
              />
              {journeys > 0 ? (
                <Chip
                  label={
                    journeys === 1
                      ? t('mobile.common.journeyCount', { count: journeys })
                      : t('mobile.common.journeyCount_other', { count: journeys })
                  }
                  tone="green"
                />
              ) : null}
            </View>
          </View>
          <Ionicons name={navForwardIcon()} size={18} color="#D6D3D1" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyCareUnitListScreen() {
  const { t } = useTranslation('family');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['family-care-units', search.trim()],
    queryFn: () => listCareUnits({ search: search.trim() || undefined, limit: 50 }),
  });

  const units = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title={t('careUnit.listTitle')}
        subtitle={t('careUnit.listDescription')}
        showBack
      />

      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: FAMILY.stone200,
          backgroundColor: FAMILY.white,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Input
          placeholder={t('careUnit.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          leftIcon={<Ionicons name="search-outline" size={18} color="#A8A29E" />}
        />
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
          title={t('careUnit.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.common.tryAgain'), onPress: () => void query.refetch() }}
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
              tintColor={FAMILY.teal}
            />
          }
          ListHeaderComponent={
            units.length > 0 ? (
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
                {t(total === 1 ? 'careUnit.unitCount' : 'careUnit.unitCount_plural', {
                  count: total,
                })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={t('careUnit.empty')}
              subtitle={t('careUnit.listDescription')}
              action={{
                label: t('dashboard.startCareRequest'),
                onPress: () => router.push('/(onboarding)/step-1-care-unit'),
              }}
            />
          }
          renderItem={({ item }) => <CareUnitCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
}
