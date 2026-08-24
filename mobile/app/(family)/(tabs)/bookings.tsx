import { useEffect, useState } from 'react';
import {
  FlatList,
  Linking,
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
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, StatusBadge } from '../../../components/ui';
import {
  FAMILY,
  FamilyTabHero,
  familyCardStyle,
  familyPressSpring,
  familyReleaseSpring,
} from '../../../components/family/FamilyChrome';
import { listAssessments, type Assessment } from '../../../lib/api/care';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import {
  FAMILY_ASSESSMENT_STATUS_FILTERS,
  familyAssessmentStatusLabel,
} from '../../../lib/familyLanguage';

function findingsEntries(findings: Assessment['findings']) {
  if (!findings) return [];
  return Object.entries(findings).filter(
    ([, value]) => value != null && String(value).trim() !== '',
  );
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
  }, []);
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

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: FAMILY.stone400,
        }}
      >
        {label}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 14, color: FAMILY.stone900 }}>{value || '—'}</Text>
    </View>
  );
}

function BookingCard({
  item,
  expanded,
  onToggle,
}: {
  item: Assessment;
  expanded: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const findings = findingsEntries(item.findings);

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.97, familyPressSpring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, familyReleaseSpring);
        }}
        onPress={onToggle}
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
              <Ionicons name="calendar-outline" size={18} color={FAMILY.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    fontWeight: '700',
                    color: FAMILY.stone900,
                    letterSpacing: -0.2,
                    textTransform: 'capitalize',
                  }}
                >
                  {(item.type ?? 'consultation').replace(/_/g, ' ')}
                </Text>
                <StatusBadge
                  status={item.status}
                  label={familyAssessmentStatusLabel(item.status)}
                />
              </View>
              <Text style={{ marginTop: 2, fontSize: 14, color: FAMILY.stone500 }} numberOfLines={1}>
                {item.episode?.title || 'Care journey'}
              </Text>
              <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={12} color={FAMILY.stone400} />
                <Text style={{ fontSize: 12, color: FAMILY.stone500 }}>
                  {formatDateTime(item.scheduledAt)}
                  {item.assessor?.name ? ` · ${item.assessor.name}` : ''}
                </Text>
              </View>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#D6D3D1"
            />
          </View>

          {expanded ? (
            <View
              style={{
                marginTop: 16,
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: FAMILY.stone200,
                paddingTop: 16,
              }}
            >
              <DetailRow label="Care journey" value={item.episode?.title} />
              <DetailRow label="Scheduled" value={formatDateTime(item.scheduledAt)} />
              <DetailRow label="Clinician" value={item.assessor?.name} />
              {findings.length > 0 ? (
                <View style={{ gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                      color: FAMILY.stone400,
                      marginBottom: 2,
                    }}
                  >
                    Visit notes
                  </Text>
                  {findings.map(([key, value]) => (
                    <Text key={key} style={{ fontSize: 14, color: '#44403C' }}>
                      <Text style={{ color: FAMILY.stone500, textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}:{' '}
                      </Text>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Text>
                  ))}
                </View>
              ) : null}
              {item.recommendations ? (
                <DetailRow label="Recommendations" value={item.recommendations} />
              ) : null}
              {item.reportUrl ? (
                <Pressable
                  onPress={() => void Linking.openURL(item.reportUrl!)}
                  accessibilityRole="link"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name="document-outline" size={14} color={FAMILY.teal} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: FAMILY.teal }}>
                    Open visit summary
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyBookingsScreen() {
  const [status, setStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['family-assessments', status],
    queryFn: () => listAssessments({ status: status || undefined, limit: 50 }),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? rows.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Appointments" subtitle="Consultations booked for your care journeys" />

      <View style={{ borderBottomWidth: 1, borderBottomColor: FAMILY.stone200, backgroundColor: FAMILY.white }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {FAMILY_ASSESSMENT_STATUS_FILTERS.map((filter) => {
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
          ListHeaderComponent={
            rows.length > 0 ? (
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
                {total} appointment{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No appointments yet"
              subtitle="Book a consultation from your care journey."
              action={{
                label: 'Open care journey',
                onPress: () => router.push('/(family)/episodes'),
              }}
            />
          }
          extraData={expandedId}
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
