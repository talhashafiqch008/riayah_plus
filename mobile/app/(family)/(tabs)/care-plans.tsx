import { useEffect, useMemo } from 'react';
import {
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
import {
  carePlanStatusLabel,
  listCarePlans,
  normalizeCarePlanStatus,
  type CarePlan,
} from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';

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
        { height: 80, borderRadius: 16, backgroundColor: FAMILY.stone200, marginBottom: 12 },
        style,
      ]}
    />
  );
}

function PlanCard({
  plan,
  highlight,
}: {
  plan: CarePlan;
  highlight?: boolean;
}) {
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
        onPress={() => router.push(`/(family)/care-plans/${plan.id}`)}
        style={[
          { marginBottom: 12, ...familyCardStyle },
          highlight ? { borderWidth: 1.5, borderColor: FAMILY.amber } : null,
        ]}
      >
        {highlight ? (
          <View
            style={{
              backgroundColor: FAMILY.amber50,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#FDE68A',
              borderTopLeftRadius: 14.5,
              borderTopRightRadius: 14.5,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E', letterSpacing: 0.1 }}>
              Action required
            </Text>
          </View>
        ) : null}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 }}>
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
                <Ionicons name="document-text-outline" size={18} color={FAMILY.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: FAMILY.stone900, letterSpacing: -0.2 }}>
                  {plan.title}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 13, color: FAMILY.stone500 }}>
                  {plan.goals?.length ?? 0} goals · {plan.items?.length ?? 0} services · v
                  {plan.version}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusBadge
                status={normalizeCarePlanStatus(plan.status)}
                label={carePlanStatusLabel(plan.status)}
              />
              <Ionicons name="chevron-forward" size={16} color="#D6D3D1" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyCarePlansScreen() {
  const query = useQuery({
    queryKey: ['family-care-plans'],
    queryFn: () => listCarePlans(),
  });

  const plans = useMemo(
    () => (query.data ?? []).filter((p) => p.isCurrentVersion !== false),
    [query.data],
  );

  const awaiting = useMemo(
    () => plans.filter((p) => normalizeCarePlanStatus(p.status) === 'submitted_for_approval'),
    [plans],
  );
  const others = useMemo(
    () => plans.filter((p) => normalizeCarePlanStatus(p.status) !== 'submitted_for_approval'),
    [plans],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title="Care Plans"
        subtitle="Review, approve, or request changes"
        right={
          awaiting.length > 0 ? (
            <View
              style={{
                borderRadius: 99,
                backgroundColor: FAMILY.amber,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  color: FAMILY.white,
                  fontSize: 11,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {awaiting.length} pending
              </Text>
            </View>
          ) : null
        }
      />

      {query.isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load care plans"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor={FAMILY.teal}
            />
          }
        >
          {plans.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No care plans to review yet"
              subtitle="Your coordinator will share a plan once it is ready."
            />
          ) : (
            <>
              {awaiting.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <View
                      style={{ height: 6, width: 6, borderRadius: 99, backgroundColor: FAMILY.amber }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 2.5,
                        color: FAMILY.amber,
                      }}
                    >
                      Needs your action
                    </Text>
                  </View>
                  {awaiting.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} highlight />
                  ))}
                </>
              ) : null}

              {others.length > 0 ? (
                <>
                  <Text
                    style={{
                      marginBottom: 14,
                      marginTop: awaiting.length > 0 ? 8 : 0,
                      fontSize: 10,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 2.5,
                      color: FAMILY.stone400,
                    }}
                  >
                    Other plans
                  </Text>
                  {others.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
