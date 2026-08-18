import { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import {
  endShift,
  getActiveShift,
  getShiftHistory,
  startShift,
} from '../../../lib/api/shifts';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

const CLOSED_VISITS = new Set(['cancelled', 'completed', 'rejected', 'no_show']);

function nextOpenVisit(sessions: CareSession[]): CareSession | null {
  const now = Date.now();
  const open = sessions
    .filter((s) => !CLOSED_VISITS.has(s.status) && !s.checkOutAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return open.find((s) => new Date(s.scheduledAt).getTime() >= now - 60 * 60 * 1000) ?? open[0] ?? null;
}

export default function SupportShiftsScreen() {
  const toast = useToast();
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['support-shifts'],
    queryFn: async () => {
      const [active, history] = await Promise.all([getActiveShift(), getShiftHistory()]);
      return { active, history };
    },
  });

  const visitsQuery = useQuery({
    queryKey: ['support-visits'],
    queryFn: () => listSessions(),
  });

  const nextVisit = nextOpenVisit(visitsQuery.data ?? []);

  const startMutation = useMutation({
    mutationFn: () => startShift(),
    onSuccess: async (result) => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['support-shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['support-shell-stats'] });
      toast.show(result.message ?? 'Shift started', { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Start failed');
      setActionError(msg);
      toastError(toast, e, 'Start failed');
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const active = query.data?.active;
      if (!active) throw new Error('No active shift');
      return endShift(active.id);
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['support-shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['support-shell-stats'] });
      toast.show('Shift ended', { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'End failed');
      setActionError(msg);
      toastError(toast, e, 'End failed');
    },
  });

  const active = query.data?.active ?? null;
  const history = query.data?.history ?? [];
  const busy = startMutation.isPending || endMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="My Shifts"
        showBack={false}
        rightAction={{
          icon: 'checkmark-circle-outline',
          onPress: () => router.push('/(support)/tasks'),
        }}
      />

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load shifts"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <Text className="mb-3 text-sm text-stone-500">
            Start your shift, then GPS check in at the patient address for each visit.
          </Text>

          {actionError ? (
            <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <Text className="text-sm text-red-700">{actionError}</Text>
            </View>
          ) : null}

          {nextVisit ? (
            <Card
              className="mb-4"
              onPress={() => router.push(`/(support)/visits/${nextVisit.id}`)}
            >
              <Text className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                Next visit
              </Text>
              <Text className="mt-1 text-base font-semibold text-stone-900">
                {nextVisit.client?.name ?? 'Patient'}
              </Text>
              <Text className="mt-1 text-sm text-stone-500">
                {formatDateTime(nextVisit.scheduledAt)}
              </Text>
              <Text className="mt-2 text-sm font-medium text-teal-700">
                {nextVisit.checkInAt ? 'Open visit check-in' : 'GPS check-in'}
              </Text>
            </Card>
          ) : null}

          <Card className="mb-6" shadow>
            <Text className="font-semibold text-stone-900">Active shift</Text>
            {active ? (
              <View className="mt-2">
                <StatusBadge status={active.status} label={active.status.replace(/_/g, ' ')} />
                <Text className="mt-2 text-sm text-stone-700">
                  Started: {formatDateTime(active.startedAt)}
                </Text>
                <View className="mt-4">
                  <Button
                    variant="destructive"
                    isLoading={busy}
                    onPress={() => {
                      setActionError(null);
                      endMutation.mutate();
                    }}
                  >
                    End shift
                  </Button>
                </View>
              </View>
            ) : (
              <View className="mt-2">
                <Text className="text-sm text-stone-500">No shift in progress.</Text>
                <View className="mt-4">
                  <Button
                    isLoading={busy}
                    onPress={() => {
                      setActionError(null);
                      startMutation.mutate();
                    }}
                  >
                    Start shift
                  </Button>
                </View>
              </View>
            )}
          </Card>

          <Text className="mb-2 font-semibold text-stone-900">History</Text>
          {history.length === 0 ? (
            <Text className="text-sm text-stone-500">No past shifts.</Text>
          ) : (
            history.map((s) => (
              <Card key={s.id} className="mb-2" shadow={false}>
                <View className="flex-row items-center justify-between gap-2">
                  <StatusBadge status={s.status} label={s.status.replace(/_/g, ' ')} />
                </View>
                <Text className="mt-1 text-sm text-stone-500">
                  {formatDateTime(s.startedAt)}
                  {s.endedAt ? ` → ${formatDateTime(s.endedAt)}` : ''}
                </Text>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
