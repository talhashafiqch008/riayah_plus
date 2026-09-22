import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, Input, ScreenHeader, StatusBadge } from '../../../components/ui';
import { SelectDropdown } from '../../../components/SelectDropdown';
import { listEpisodes, type CareEpisode } from '../../../lib/api/care';
import {
  bookRecurringSessions,
  bookSession,
  listAvailability,
  listScheduleStaff,
  listSessions,
  replaceAvailability,
  type AvailabilitySlot,
  type ScheduleStaffOption,
} from '../../../lib/api/scheduling';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

type SlotDraft = { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean };
type SessionType = 'telehealth' | 'in_person' | 'home_visit';

const DEFAULT_SLOTS: SlotDraft[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
];

const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00'];

function nextFourteenDays(locale: string) {
  const out: { iso: string; day: string; date: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString(locale, { weekday: 'short' }),
      date: String(d.getDate()),
    });
  }
  return out;
}

function combineDateAndTime(dateIso: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${dateIso}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export default function CoordinatorScheduleScreen() {
  const { t, i18n } = useTranslation('coordinator');
  const toast = useToast();
  const days = useMemo(() => nextFourteenDays(i18n.language), [i18n.language]);

  const sessionTypes = useMemo(
    (): { id: SessionType; label: string }[] => [
      { id: 'telehealth', label: t('schedule.telehealthVideo') },
      { id: 'in_person', label: t('schedule.inPerson') },
      { id: 'home_visit', label: t('schedule.homeVisit') },
    ],
    [t],
  );

  const episodeStatusLabel = (status: string) =>
    t(`episodes.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });

  const sessionStatusLabel = (status: string) =>
    t(`schedule.sessionStatus.${status}`, { defaultValue: status.replace(/_/g, ' ') });

  const sessionTypeLabel = (type: string) => {
    if (type === 'telehealth') return t('schedule.telehealth');
    if (type === 'in_person') return t('schedule.inPerson');
    if (type === 'home_visit') return t('schedule.homeVisit');
    return type.replace(/_/g, ' ');
  };

  const staffRoleLabel = (role: string) =>
    t(`mobile.detail.staffRoles.${role}`, { defaultValue: role.replace(/_/g, ' ') });

  const episodeOptionLabel = (ep: CareEpisode): string => {
    const patient = ep.careRecipient?.name || ep.patient?.name;
    const status = episodeStatusLabel(ep.status ?? '');
    const title = ep.title ?? t('mobile.detail.episodeFallback');
    return patient ? `${title} · ${patient} (${status})` : `${title} (${status})`;
  };

  const staffOptionLabel = (s: ScheduleStaffOption): string => {
    const langs = s.languages?.length ? ` · ${s.languages.slice(0, 2).join(', ')}` : '';
    return `${s.name} · ${staffRoleLabel(s.role ?? '')}${langs}`;
  };

  const [providerId, setProviderId] = useState('');
  const [episodeId, setEpisodeId] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('telehealth');
  const [slots, setSlots] = useState<SlotDraft[]>(DEFAULT_SLOTS);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState('60');
  const [recurCount, setRecurCount] = useState('1');
  const [assignTasks, setAssignTasks] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: ['schedule-staff'],
    queryFn: listScheduleStaff,
  });

  const episodesQuery = useQuery({
    queryKey: ['coordinator-episodes', ''],
    queryFn: () => listEpisodes({ limit: 50 }),
  });

  const staff = staffQuery.data ?? [];
  const episodes = episodesQuery.data?.data ?? [];

  const episodeOptions = useMemo(
    () =>
      episodes.map((ep) => ({
        id: ep.id,
        label: episodeOptionLabel(ep),
      })),
    [episodes, t],
  );

  const staffOptions = useMemo(
    () =>
      staff.map((s) => ({
        id: s.id,
        label: staffOptionLabel(s),
      })),
    [staff],
  );

  useEffect(() => {
    if (!providerId && staff.length === 1) setProviderId(staff[0].id);
  }, [staff, providerId]);

  useEffect(() => {
    if (!episodeId && episodes.length === 1) setEpisodeId(episodes[0].id);
  }, [episodes, episodeId]);

  const availabilityQuery = useQuery({
    queryKey: ['availability', providerId],
    enabled: Boolean(providerId),
    queryFn: () => listAvailability(providerId),
  });

  useEffect(() => {
    const loaded = availabilityQuery.data?.slots ?? [];
    if (!providerId) {
      setSlots(DEFAULT_SLOTS);
      return;
    }
    if (loaded.length) {
      setSlots(
        loaded.map((s: AvailabilitySlot) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.isAvailable,
        })),
      );
    } else if (availabilityQuery.isFetched) {
      setSlots(DEFAULT_SLOTS);
    }
  }, [availabilityQuery.data, availabilityQuery.isFetched, providerId]);

  const sessionsQuery = useQuery({
    queryKey: ['schedule-sessions', episodeId],
    enabled: Boolean(episodeId),
    queryFn: () => listSessions({ episodeId }),
  });

  const saveAvailMutation = useMutation({
    mutationFn: () => {
      if (!providerId) throw new Error(t('schedule.toasts.selectStaff'));
      return replaceAvailability(providerId, slots);
    },
    onSuccess: async () => {
      setFormError(null);
      await availabilityQuery.refetch();
      toast.show(t('schedule.toasts.savedAvailabilityShort'), { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, t('schedule.toasts.saveFailed'));
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!episodeId || !providerId || !date || !time) {
        throw new Error(t('schedule.toasts.selectBookFieldsMobile'));
      }
      const scheduledAt = combineDateAndTime(date, time);
      const durationMinutes = Number(duration) || 60;
      const count = Number(recurCount) || 1;
      if (count > 1) {
        return bookRecurringSessions({
          episodeId,
          providerId,
          scheduledAt,
          durationMinutes,
          type: sessionType,
          assignPendingTasks: assignTasks,
          recurrence: { frequency: 'weekly', count },
        });
      }
      return bookSession({
        episodeId,
        providerId,
        scheduledAt,
        durationMinutes,
        type: sessionType,
        assignPendingTasks: assignTasks,
      });
    },
    onSuccess: async (result) => {
      setFormError(null);
      await sessionsQuery.refetch();
      if (result && 'created' in result) {
        toast.show(t('schedule.toasts.createdSessions', { count: result.created }), {
          type: 'success',
        });
        if (result.skipped.length) {
          toast.show(t('schedule.toasts.skippedOccurrences', { count: result.skipped.length }), {
            type: 'warning',
          });
        }
      } else {
        toast.show(
          assignTasks
            ? t('schedule.toasts.sessionBookedTasks')
            : t('schedule.toasts.sessionBooked'),
          { type: 'success' },
        );
      }
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, t('schedule.toasts.bookingFailed'));
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
    },
  });

  const bootLoading = staffQuery.isLoading || episodesQuery.isLoading;
  const selectedStaff = staff.find((s) => s.id === providerId);

  if (bootLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('schedule.title')} />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (staffQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('schedule.title')} />
        <EmptyState
          icon="alert-circle-outline"
          title={t('mobile.schedule.loadErrorTitle')}
          subtitle={apiErrorMessage(staffQuery.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void staffQuery.refetch() }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('schedule.title')} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={staffQuery.isFetching || episodesQuery.isFetching}
            onRefresh={() => {
              void staffQuery.refetch();
              void episodesQuery.refetch();
              if (providerId) void availabilityQuery.refetch();
              if (episodeId) void sessionsQuery.refetch();
            }}
            tintColor="#0D9488"
          />
        }
      >
        <Text className="mb-4 text-sm text-stone-500">{t('schedule.description')}</Text>

        {formError ? (
          <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <Text className="text-sm text-red-700">{formError}</Text>
          </View>
        ) : null}

        <Card shadow>
          <Text className="font-semibold text-stone-900">{t('mobile.schedule.staffAvailability')}</Text>
          <View className="mt-3">
            {staff.length === 0 ? (
              <Text className="text-sm text-amber-700">{t('mobile.schedule.noSchedulableStaff')}</Text>
            ) : (
              <SelectDropdown
                label={t('mobile.schedule.staffMember')}
                placeholder={t('mobile.schedule.selectStaff')}
                options={staffOptions}
                value={providerId}
                onChange={setProviderId}
                emptyText={t('mobile.schedule.noStaffSearch')}
              />
            )}
          </View>
          {selectedStaff ? (
            <Text className="mt-2 text-sm text-stone-500">{selectedStaff.name}</Text>
          ) : null}

          <View className="mt-4 gap-2">
            {slots.map((s, i) => (
              <View key={i} className="rounded-xl border border-stone-100 p-3">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {t('mobile.schedule.day')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const selected = s.dayOfWeek === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() =>
                          setSlots((rows) =>
                            rows.map((r, j) => (j === i ? { ...r, dayOfWeek: d } : r)),
                          )
                        }
                        className={`rounded-xl border px-3 py-2 ${
                          selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            selected ? 'font-medium text-teal-700' : 'text-stone-600'
                          }`}
                        >
                          {t(`schedule.days.${d}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Input
                      label={t('mobile.schedule.start')}
                      value={s.startTime}
                      onChangeText={(v) =>
                        setSlots((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, startTime: v } : r)),
                        )
                      }
                      placeholder={t('mobile.schedule.timePlaceholderStart')}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label={t('mobile.schedule.end')}
                      value={s.endTime}
                      onChangeText={(v) =>
                        setSlots((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, endTime: v } : r)),
                        )
                      }
                      placeholder={t('mobile.schedule.timePlaceholderEnd')}
                    />
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() =>
                setSlots((rows) => [
                  ...rows,
                  { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isAvailable: true },
                ])
              }
            >
              <Text className="text-sm font-medium text-teal-700">{t('mobile.schedule.addRow')}</Text>
            </Pressable>
          </View>

          <View className="mt-4 gap-2">
            <Button
              variant="secondary"
              disabled={!providerId}
              isLoading={availabilityQuery.isFetching}
              onPress={() => void availabilityQuery.refetch()}
            >
              {t('mobile.schedule.reloadSlots')}
            </Button>
            <Button
              disabled={!providerId}
              isLoading={saveAvailMutation.isPending}
              onPress={() => saveAvailMutation.mutate()}
            >
              {t('mobile.schedule.saveSlots')}
            </Button>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="font-semibold text-stone-900">{t('schedule.bookSession')}</Text>

          <View className="mt-3 gap-4">
            {episodes.length === 0 ? (
              <Text className="text-sm text-amber-700">{t('mobile.schedule.noEpisodesYet')}</Text>
            ) : (
              <SelectDropdown
                label={t('mobile.schedule.careEpisode')}
                placeholder={t('mobile.schedule.selectEpisode')}
                options={episodeOptions}
                value={episodeId}
                onChange={setEpisodeId}
                emptyText={t('mobile.schedule.noEpisodesSearch')}
              />
            )}

            <SelectDropdown
              label={t('mobile.schedule.assignToStaff')}
              placeholder={t('mobile.schedule.selectStaff')}
              options={staffOptions}
              value={providerId}
              onChange={setProviderId}
              emptyText={t('mobile.schedule.noStaffSearch')}
            />

            <SelectDropdown
              label={t('schedule.sessionType')}
              placeholder={t('mobile.schedule.selectType')}
              options={sessionTypes}
              value={sessionType}
              onChange={(id) => setSessionType(id as SessionType)}
              searchable={false}
            />
          </View>

          <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('mobile.detail.date')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {days.map((d) => {
              const selected = date === d.iso;
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => setDate(d.iso)}
                  className={`min-w-[56px] items-center rounded-xl border px-3 py-2 ${
                    selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <Text className={`text-xs ${selected ? 'text-teal-700' : 'text-stone-400'}`}>
                    {d.day}
                  </Text>
                  <Text
                    className={`text-base font-semibold ${
                      selected ? 'text-teal-700' : 'text-stone-800'
                    }`}
                  >
                    {d.date}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('mobile.detail.time')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {TIME_SLOTS.map((t) => {
              const selected = time === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTime(t)}
                  className={`rounded-xl border px-4 py-2 ${
                    selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm ${selected ? 'font-medium text-teal-700' : 'text-stone-600'}`}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <Input
                label={t('schedule.duration')}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <Input
                label={t('schedule.weeklyOccurrences')}
                value={recurCount}
                onChangeText={setRecurCount}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Pressable
            className="mt-3 flex-row items-center gap-2"
            onPress={() => setAssignTasks((v) => !v)}
          >
            <View
              className={`h-5 w-5 items-center justify-center rounded border ${
                assignTasks ? 'border-teal-600 bg-teal-600' : 'border-stone-300 bg-white'
              }`}
            >
              {assignTasks ? <Text className="text-xs font-bold text-white">✓</Text> : null}
            </View>
            <Text className="flex-1 text-sm text-stone-700">
              {t('schedule.assignTasks')}
            </Text>
          </Pressable>

          <View className="mt-4 gap-2">
            <Button
              disabled={!episodeId || !providerId || !date || !time}
              isLoading={bookMutation.isPending}
              onPress={() => bookMutation.mutate()}
            >
              {t('schedule.book')}
            </Button>
            <Button
              variant="secondary"
              disabled={!episodeId}
              onPress={() => void sessionsQuery.refetch()}
            >
              {t('mobile.schedule.refreshSessions')}
            </Button>
          </View>

          <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('mobile.schedule.sessions')}
          </Text>
          {!episodeId ? (
            <Text className="text-sm text-stone-500">{t('mobile.schedule.selectEpisodeForSessions')}</Text>
          ) : sessionsQuery.isLoading ? (
            <ActivityIndicator color="#0D9488" />
          ) : (sessionsQuery.data ?? []).length === 0 ? (
            <Text className="text-sm text-stone-500">{t('mobile.schedule.noSessionsForEpisode')}</Text>
          ) : (
            (sessionsQuery.data ?? []).map((s) => (
              <View key={s.id} className="border-t border-stone-100 py-2">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 font-medium text-stone-900">
                    {formatDateTime(s.scheduledAt)}
                    {s.durationMinutes
                      ? ` · ${t('mobile.schedule.durationSuffix', { minutes: s.durationMinutes })}`
                      : ''}
                    {s.type ? ` · ${sessionTypeLabel(s.type)}` : ''}
                  </Text>
                  <StatusBadge status={s.status} label={sessionStatusLabel(s.status)} />
                </View>
                {s.provider?.name ? (
                  <Text className="mt-0.5 text-sm text-stone-500">{s.provider.name}</Text>
                ) : null}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
