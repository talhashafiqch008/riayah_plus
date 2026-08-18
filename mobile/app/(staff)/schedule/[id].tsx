import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { apiClient } from '../../../lib/api/client';
import {
  apiErrorMessage,
  formatDate,
  formatDateTime,
  formatTime,
} from '../../../lib/format';
import { CLINICAL_ROLES, useAuthStore } from '../../../stores/authStore';

interface SessionDetail {
  id: string;
  scheduledAt: string;
  status: string;
  type?: string;
  durationMinutes?: number | null;
  notes?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  patientLat?: number | string | null;
  patientLng?: number | string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  clientName?: string;
  client?: { id?: string; name?: string; avatar?: string | null; address?: string | null };
  episode?: { id?: string; title?: string | null; patientId?: string | null } | null;
  livekitRoomId?: string | null;
}

const ACTIONABLE = new Set(['pending', 'accepted', 'scheduled', 'in_progress']);

function clientName(session: SessionDetail): string {
  return session.clientName ?? session.client?.name ?? 'Client';
}

function locationLabel(session: SessionDetail): string {
  const type = (session.type ?? '').toLowerCase();
  if (type === 'telehealth') return 'Telehealth';
  return session.address ?? session.client?.address ?? 'In person';
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const isClinical = role ? CLINICAL_ROLES.includes(role) : false;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['session', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient.get<{ session?: SessionDetail; data?: SessionDetail }>(
        `/api/scheduling/sessions/${id}`,
      );
      const session = res.data.session ?? res.data.data ?? (res.data as unknown as SessionDetail);
      if (!session?.id) throw new Error('Session not found');
      return session;
    },
  });

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Session" />
        <EmptyState icon="alert-circle-outline" title="Missing session" subtitle="No session id." />
      </SafeAreaView>
    );
  }

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Session" />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Session" />
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(error)}
          action={{ label: 'Try again', onPress: () => void refetch() }}
        />
      </SafeAreaView>
    );
  }

  const name = clientName(data);
  const type = (data.type ?? 'session').toLowerCase();
  const isTelehealth = type === 'telehealth';
  const canAct = ACTIONABLE.has(data.status) && !data.checkOutAt;
  const isCompleted = data.status === 'completed' || Boolean(data.checkOutAt);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Session" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="mx-4 mt-4" shadow>
          <View className="flex-row items-start gap-3">
            <Avatar uri={data.client?.avatar} name={name} size="lg" />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-stone-900">{name}</Text>
              {data.episode?.title ? (
                <Text className="mt-0.5 text-sm text-stone-400">{data.episode.title}</Text>
              ) : null}
              <View className="mt-2 self-start">
                <StatusBadge status={data.status} />
              </View>
            </View>
          </View>

          <View className="mt-4 gap-2 border-t border-stone-100 pt-4">
            <InfoRow
              icon="calendar-outline"
              label="Date"
              value={formatDate(data.scheduledAt)}
            />
            <InfoRow
              icon="time-outline"
              label="Time"
              value={`${formatTime(data.scheduledAt)}${
                data.durationMinutes ? ` · ${data.durationMinutes} min` : ''
              }`}
            />
            <InfoRow
              icon={isTelehealth ? 'videocam-outline' : 'location-outline'}
              label="Location"
              value={locationLabel(data)}
            />
            <InfoRow
              icon="medical-outline"
              label="Type"
              value={type.replace(/_/g, ' ')}
            />
            {data.checkInAt ? (
              <InfoRow
                icon="log-in-outline"
                label="Checked in"
                value={formatDateTime(data.checkInAt)}
              />
            ) : null}
            {data.checkOutAt ? (
              <InfoRow
                icon="log-out-outline"
                label="Checked out"
                value={formatDateTime(data.checkOutAt)}
              />
            ) : null}
          </View>
        </Card>

        <View className="mt-6">
          <Text className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Session notes
          </Text>
          <Card className="mx-4" shadow={false}>
            {data.notes ? (
              <Text className="text-sm leading-5 text-stone-700">{data.notes}</Text>
            ) : (
              <Text className="text-sm text-stone-400">
                {isCompleted ? 'No notes recorded.' : 'No notes yet.'}
              </Text>
            )}
          </Card>
        </View>

        {canAct ? (
          <View className="mt-6 gap-3 px-4">
            {isTelehealth ? (
              <Button onPress={() => router.push(`/(staff)/telehealth/${data.id}`)}>
                {isClinical ? 'Start Telehealth' : 'Join Telehealth'}
              </Button>
            ) : (
              <Button onPress={() => router.push('/(staff)/shift')}>Check In</Button>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <Ionicons name={icon} size={18} color="#A8A29E" style={{ marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-xs uppercase tracking-wider text-stone-300">{label}</Text>
        <Text className="mt-0.5 text-sm capitalize text-stone-800">{value}</Text>
      </View>
    </View>
  );
}
