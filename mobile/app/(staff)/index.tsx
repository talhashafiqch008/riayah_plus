import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Avatar, Button, Card, EmptyState, ScreenHeader } from '../../components/ui';
import { SessionCard, type SessionCardSession } from '../../components/session/SessionCard';
import { ShiftTimer } from '../../components/shift/ShiftTimer';
import { apiClient } from '../../lib/api/client';
import { apiErrorMessage, formatDate, formatDateTime } from '../../lib/format';
import { CLINICAL_ROLES, useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';

interface StaffSession extends SessionCardSession {
  latitude?: number | string | null;
  longitude?: number | string | null;
  patientLat?: number | string | null;
  patientLng?: number | string | null;
  durationMinutes?: number | null;
  address?: string | null;
}

interface PendingTask {
  id: string;
  title: string;
  status: string;
  dueAt?: string | null;
  careEpisode?: {
    patient?: { name?: string | null } | null;
    careRecipient?: { name?: string | null } | null;
  } | null;
}

interface PatientChip {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocalKey(): string {
  return localDateKey(new Date().toISOString());
}

async function fetchSessions(): Promise<StaffSession[]> {
  const { data } = await apiClient.get<{ sessions?: StaffSession[] }>('/api/scheduling/sessions');
  return Array.isArray(data.sessions) ? data.sessions : [];
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
      {children}
    </Text>
  );
}

export default function StaffHomeScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const isClinical = role ? CLINICAL_ROLES.includes(role) : false;
  if (isClinical) return <ClinicalDashboard />;
  return <SupportWorkerDashboard />;
}

function SupportWorkerDashboard() {
  const isOnShift = useShiftStore((s) => s.isOnShift);
  const todayKey = todayLocalKey();

  const sessionsQuery = useQuery({
    queryKey: ['sessions-me'],
    queryFn: fetchSessions,
  });

  const tasksQuery = useQuery({
    queryKey: ['tasks-me-pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data?: PendingTask[] }>('/api/tasks', {
        params: { status: 'pending', assignee: 'me', limit: 3 },
      });
      return Array.isArray(data.data) ? data.data : [];
    },
  });

  const todaySessions = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    return list
      .filter((s) => localDateKey(s.scheduledAt) === todayKey)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [sessionsQuery.data, todayKey]);

  const tasks = tasksQuery.data ?? [];
  const isLoading = sessionsQuery.isLoading || tasksQuery.isLoading;
  const isError = sessionsQuery.isError && tasksQuery.isError;
  const isFetching = sessionsQuery.isFetching || tasksQuery.isFetching;

  const refetch = async () => {
    await Promise.all([sessionsQuery.refetch(), tasksQuery.refetch()]);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Dashboard"
        showBack={false}
        rightAction={{
          icon: 'notifications-outline',
          onPress: () => router.push('/(staff)/notifications'),
        }}
      />

      {isLoading && !sessionsQuery.data && !tasksQuery.data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(sessionsQuery.error ?? tasksQuery.error)}
          action={{ label: 'Try again', onPress: () => void refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor="#0D9488"
            />
          }
        >
          {isOnShift ? (
            <Card className="mx-4 mt-4 bg-teal-600" shadow={false}>
              <Text className="text-sm text-teal-100">On Shift</Text>
              <ShiftTimer className="mt-1" />
              <View className="mt-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onPress={() => router.push('/(staff)/shift')}
                >
                  Check Out
                </Button>
              </View>
            </Card>
          ) : (
            <Card className="mx-4 mt-4" shadow>
              <Text className="text-base font-semibold text-stone-900">Ready to start?</Text>
              <Text className="mt-1 text-sm text-stone-400">
                Open Shift to check in at your next session.
              </Text>
              <View className="mt-3">
                <Button size="sm" onPress={() => router.push('/(staff)/shift')}>
                  Go to Shift
                </Button>
              </View>
            </Card>
          )}

          <View className="mt-6">
            <SectionLabel>Today&apos;s Schedule</SectionLabel>
            <Text className="mb-3 px-4 text-sm text-stone-500">
              Today, {formatDate(new Date().toISOString())}
            </Text>
            {sessionsQuery.isError ? (
              <EmptyState
                icon="alert-circle-outline"
                title="Could not load sessions"
                subtitle={apiErrorMessage(sessionsQuery.error)}
                action={{ label: 'Try again', onPress: () => void sessionsQuery.refetch() }}
              />
            ) : todaySessions.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No sessions today"
                subtitle="Enjoy the quiet day — or check your full schedule."
              />
            ) : (
              todaySessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  variant="staff"
                  onPress={() => router.push(`/(staff)/schedule/${session.id}`)}
                />
              ))
            )}
          </View>

          <View className="mt-6">
            <View className="mb-2 flex-row items-center justify-between px-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Pending Tasks
              </Text>
              <Pressable onPress={() => router.push('/(staff)/tasks')} hitSlop={8}>
                <Text className="text-sm font-medium text-teal-600">View all</Text>
              </Pressable>
            </View>
            {tasksQuery.isError ? (
              <EmptyState
                icon="alert-circle-outline"
                title="Could not load tasks"
                subtitle={apiErrorMessage(tasksQuery.error)}
                action={{ label: 'Try again', onPress: () => void tasksQuery.refetch() }}
              />
            ) : tasks.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="No pending tasks"
                subtitle="You're all caught up."
              />
            ) : (
              tasks.slice(0, 3).map((task) => {
                const patientName =
                  task.careEpisode?.patient?.name ??
                  task.careEpisode?.careRecipient?.name ??
                  null;
                return (
                  <Card
                    key={task.id}
                    className="mb-2 mx-4"
                    shadow
                    onPress={() => router.push('/(staff)/tasks')}
                  >
                    <Text className="text-base font-semibold text-stone-900" numberOfLines={2}>
                      {task.title}
                    </Text>
                    {patientName ? (
                      <Text className="mt-0.5 text-sm text-stone-400">{patientName}</Text>
                    ) : null}
                    {task.dueAt ? (
                      <Text className="mt-1 text-xs text-stone-300">
                        Due {formatDateTime(task.dueAt)}
                      </Text>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ClinicalDashboard() {
  const todayKey = todayLocalKey();

  const sessionsQuery = useQuery({
    queryKey: ['sessions-me'],
    queryFn: fetchSessions,
  });

  const patientsQuery = useQuery({
    queryKey: ['patients-me', 4],
    queryFn: async (): Promise<PatientChip[] | null> => {
      try {
        const { data } = await apiClient.get('/api/patients/me', { params: { limit: 4 } });
        const raw =
          (data as { patients?: PatientChip[]; data?: PatientChip[] }).patients ??
          (data as { data?: PatientChip[] }).data ??
          data;
        if (!Array.isArray(raw)) return [];
        return raw.map((p) => ({
          id: String(p.id),
          name: p.name ?? 'Patient',
          avatarUrl: (p as PatientChip).avatarUrl ?? null,
        }));
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) return null;
        throw e;
      }
    },
    retry: (count, err) => {
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return count < 1;
    },
  });

  const todaySessions = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    return list
      .filter((s) => localDateKey(s.scheduledAt) === todayKey)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [sessionsQuery.data, todayKey]);

  const upcoming = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    return list
      .filter((s) => localDateKey(s.scheduledAt) > todayKey)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 3);
  }, [sessionsQuery.data, todayKey]);

  const patients = patientsQuery.data;
  const hidePatients = patients === null;
  const isLoading = sessionsQuery.isLoading;
  const isFetching = sessionsQuery.isFetching || patientsQuery.isFetching;

  const refetch = async () => {
    await Promise.all([
      sessionsQuery.refetch(),
      hidePatients ? Promise.resolve() : patientsQuery.refetch(),
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Dashboard"
        showBack={false}
        rightAction={{
          icon: 'notifications-outline',
          onPress: () => router.push('/(staff)/notifications'),
        }}
      />

      {isLoading && !sessionsQuery.data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : sessionsQuery.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(sessionsQuery.error)}
          action={{ label: 'Try again', onPress: () => void refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <View className="mt-4">
            <SectionLabel>Today</SectionLabel>
            <Text className="mb-3 px-4 text-sm text-stone-500">
              Today, {formatDate(new Date().toISOString())}
            </Text>
            {todaySessions.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No sessions today"
                subtitle="Nothing on the calendar for today."
              />
            ) : (
              todaySessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  variant="staff"
                  onPress={() => router.push(`/(staff)/schedule/${session.id}`)}
                />
              ))
            )}
          </View>

          <View className="mt-6">
            <View className="mb-2 flex-row items-center justify-between px-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Upcoming
              </Text>
              <Pressable onPress={() => router.push('/(staff)/schedule')} hitSlop={8}>
                <Text className="text-sm font-medium text-teal-600">View schedule</Text>
              </Pressable>
            </View>
            {upcoming.length === 0 ? (
              <EmptyState
                icon="time-outline"
                title="No upcoming sessions"
                subtitle="Your next bookings will appear here."
              />
            ) : (
              upcoming.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  variant="staff"
                  onPress={() => router.push(`/(staff)/schedule/${session.id}`)}
                />
              ))
            )}
          </View>

          {!hidePatients ? (
            <View className="mt-6">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  My Patients
                </Text>
                <Pressable onPress={() => router.push('/(staff)/patients')} hitSlop={8}>
                  <Text className="text-sm font-medium text-teal-600">View all</Text>
                </Pressable>
              </View>
              {patientsQuery.isLoading ? (
                <ActivityIndicator color="#0D9488" className="my-4" />
              ) : patientsQuery.isError ? (
                <EmptyState
                  icon="alert-circle-outline"
                  title="Could not load patients"
                  subtitle={apiErrorMessage(patientsQuery.error)}
                />
              ) : !patients || patients.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No patients yet"
                  subtitle="Assigned patients will show here."
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                >
                  {patients.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/(staff)/patients/${item.id}`)}
                      className="w-20 items-center"
                    >
                      <Avatar uri={item.avatarUrl} name={item.name} size="lg" />
                      <Text
                        className="mt-1 text-center text-xs text-stone-600"
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
