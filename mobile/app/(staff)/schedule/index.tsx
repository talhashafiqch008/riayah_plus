import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, ScreenHeader } from '../../../components/ui';
import { SessionCard, type SessionCardSession } from '../../../components/session/SessionCard';
import { apiClient } from '../../../lib/api/client';
import { apiErrorMessage, formatDate, formatTime, todayIsoDate } from '../../../lib/format';

type ViewMode = 'week' | 'day';

interface StaffSession extends SessionCardSession {
  durationMinutes?: number | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const TIMELINE_START_HOUR = 7;
const HOUR_HEIGHT = 60;

function localDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

async function fetchSessions(): Promise<StaffSession[]> {
  const { data } = await apiClient.get<{ sessions?: StaffSession[] }>('/api/scheduling/sessions');
  return Array.isArray(data.sessions) ? data.sessions : [];
}

export default function StaffScheduleScreen() {
  const [mode, setMode] = useState<ViewMode>('week');
  const [selectedDay, setSelectedDay] = useState(() => localDateKey(new Date()));

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        key: localDateKey(date),
        label: DAY_LABELS[date.getDay()],
        dayNum: date.getDate(),
      };
    });
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['sessions-me'],
    queryFn: fetchSessions,
  });

  const daySessions = useMemo(() => {
    const list = data ?? [];
    return list
      .filter((s) => localDateKey(s.scheduledAt) === selectedDay)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [data, selectedDay]);

  const selectedLabel = useMemo(() => {
    const match = weekDays.find((d) => d.key === selectedDay);
    if (match) return formatDate(match.date.toISOString());
    return formatDate(`${selectedDay}T12:00:00`);
  }, [selectedDay, weekDays]);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Schedule" showBack={false} />

      <View className="flex-row gap-2 px-4 py-3">
        {(['week', 'day'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className={`flex-1 items-center rounded-xl border py-2.5 ${
                active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
              }`}
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  active ? 'text-teal-700' : 'text-stone-600'
                }`}
              >
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'week' ? (
        <View className="mb-2 flex-row justify-between px-3">
          {weekDays.map((d) => {
            const active = d.key === selectedDay;
            const isToday = d.key === localDateKey(new Date()) || d.key === todayIsoDate();
            return (
              <Pressable
                key={d.key}
                onPress={() => setSelectedDay(d.key)}
                className={`w-[13%] items-center rounded-xl py-2 ${
                  active ? 'bg-teal-600' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-[10px] font-semibold uppercase ${
                    active ? 'text-teal-100' : 'text-stone-400'
                  }`}
                >
                  {d.label}
                </Text>
                <Text
                  className={`mt-0.5 text-base font-semibold ${
                    active ? 'text-white' : isToday ? 'text-teal-600' : 'text-stone-900'
                  }`}
                >
                  {d.dayNum}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text className="mb-2 px-4 text-sm text-stone-500">{selectedLabel}</Text>

      {isLoading && !data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(error)}
          action={{ label: 'Try again', onPress: () => void refetch() }}
        />
      ) : mode === 'day' ? (
        <DayTimeline
          sessions={daySessions}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
        />
      ) : (
        <FlatList
          data={daySessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor="#0D9488"
            />
          }
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              variant="staff"
              onPress={() => router.push(`/(staff)/schedule/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No sessions"
              subtitle="Nothing scheduled for this day."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function DayTimeline({
  sessions,
  refreshing,
  onRefresh,
}: {
  sessions: StaffSession[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const hours = Array.from({ length: 14 }, (_, i) => TIMELINE_START_HOUR + i);
  const totalHeight = hours.length * HOUR_HEIGHT;

  return (
    <FlatList
      data={[{ key: 'timeline' }]}
      keyExtractor={(item) => item.key}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />
      }
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      ListEmptyComponent={null}
      renderItem={() => (
        <View className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white" style={{ height: totalHeight }}>
          {hours.map((hour, idx) => (
            <View
              key={hour}
              className="absolute left-0 right-0 flex-row border-b border-stone-100"
              style={{ top: idx * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <Text className="w-12 pl-2 pt-1 text-[10px] text-stone-300">
                {String(hour).padStart(2, '0')}:00
              </Text>
            </View>
          ))}

          {sessions.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-sm text-stone-400">No sessions on this day.</Text>
            </View>
          ) : (
            sessions.map((session) => {
              const start = new Date(session.scheduledAt);
              const startHour = start.getHours() + start.getMinutes() / 60;
              const duration = session.durationMinutes ?? 60;
              const top = Math.max(0, (startHour - TIMELINE_START_HOUR) * HOUR_HEIGHT);
              const height = Math.max(36, (duration / 60) * HOUR_HEIGHT);
              const name = session.clientName ?? session.client?.name ?? 'Client';

              return (
                <Pressable
                  key={session.id}
                  onPress={() => router.push(`/(staff)/schedule/${session.id}`)}
                  className="absolute left-14 right-3 overflow-hidden rounded-xl bg-teal-50 px-2 py-1.5 border border-teal-100"
                  style={{ top, height }}
                >
                  <Text className="text-xs font-semibold text-teal-700" numberOfLines={1}>
                    {formatTime(session.scheduledAt)} · {name}
                  </Text>
                  <Text className="text-[10px] capitalize text-teal-600/80" numberOfLines={1}>
                    {(session.serviceType ?? session.type ?? 'session').replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    />
  );
}
