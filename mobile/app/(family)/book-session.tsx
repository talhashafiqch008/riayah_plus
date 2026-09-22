import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState } from '../../components/ui';
import { SelectDropdown } from '../../components/SelectDropdown';
import { FAMILY, FamilyTabHero } from '../../components/family/FamilyChrome';
import { listEpisodes } from '../../lib/api/care';
import {
  bookFamilySession,
  getFamilyAssignedClinician,
  listFamilyOpenSlots,
  type OpenSlot,
} from '../../lib/api/scheduling';
import { apiErrorMessage, activeDateLocale, formatTime } from '../../lib/format';
import { familyEnumLabel } from '../../lib/familyLanguage';
import { queryClient } from '../../lib/query/client';
import { toastError } from '../../lib/toast';

const DURATIONS = [30, 45, 60] as const;
type SessionType = 'telehealth' | 'in_person' | 'home_visit';

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextFourteenDays() {
  const out: { ymd: string; day: string; date: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      ymd: localYmd(d),
      day: d.toLocaleDateString(activeDateLocale(), { weekday: 'short' }),
      date: String(d.getDate()),
    });
  }
  return out;
}

function slotLabel(iso: string) {
  return formatTime(iso);
}

function slotStyle(status: OpenSlot['status'], selected: boolean) {
  if (status === 'booked') {
    return {
      wrap: 'border-stone-200 bg-stone-100 opacity-70',
      text: 'text-stone-400 line-through',
    };
  }
  if (status === 'past') {
    return {
      wrap: 'border-stone-200 bg-stone-50 opacity-60',
      text: 'text-stone-400',
    };
  }
  if (selected) {
    return { wrap: 'border-teal-600 bg-teal-50', text: 'font-medium text-teal-700' };
  }
  return { wrap: 'border-teal-200 bg-white', text: 'text-stone-700' };
}

export default function FamilyBookSessionScreen() {
  const { t, i18n } = useTranslation('family');
  const params = useLocalSearchParams<{ episodeId?: string }>();
  const toast = useToast();
  const days = useMemo(() => nextFourteenDays(), [i18n.language]);

  const [episodeId, setEpisodeId] = useState<string | null>(params.episodeId ?? null);
  const [sessionType, setSessionType] = useState<SessionType>('telehealth');
  const [durationMinutes, setDurationMinutes] = useState<(typeof DURATIONS)[number]>(60);
  const [dateYmd, setDateYmd] = useState<string | null>(days[0]?.ymd ?? null);
  const [slotStart, setSlotStart] = useState<string | null>(null);

  const episodesQuery = useQuery({
    queryKey: ['family-episodes'],
    queryFn: () => listEpisodes({ limit: 50 }),
  });

  const episodes = (episodesQuery.data?.data ?? []).filter((e) => e.status !== 'closed');
  const effectiveEpisodeId = episodeId ?? episodes[0]?.id ?? null;

  const episodeOptions = useMemo(
    () =>
      episodes.map((ep) => ({
        id: ep.id,
        label: ep.careRecipient?.name
          ? `${ep.title ?? t('episodes.untitled')} · ${ep.careRecipient.name}`
          : ep.title ?? t('episodes.untitled'),
      })),
    [episodes, t],
  );

  const sessionTypes = useMemo(
    (): { id: SessionType; label: string }[] => [
      { id: 'telehealth', label: t('bookSession.types.telehealth') },
      { id: 'in_person', label: t('bookSession.types.in_person') },
      { id: 'home_visit', label: t('bookSession.types.home_visit') },
    ],
    [t],
  );

  const clinicianQuery = useQuery({
    queryKey: ['family-clinician', effectiveEpisodeId],
    enabled: Boolean(effectiveEpisodeId),
    queryFn: () => getFamilyAssignedClinician(effectiveEpisodeId!),
  });

  const slotsQuery = useQuery({
    queryKey: ['family-open-slots', effectiveEpisodeId, dateYmd, durationMinutes],
    enabled: Boolean(effectiveEpisodeId && clinicianQuery.data?.clinician && dateYmd),
    queryFn: () =>
      listFamilyOpenSlots({
        episodeId: effectiveEpisodeId!,
        date: dateYmd!,
        durationMinutes,
      }),
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveEpisodeId || !slotStart) throw new Error(t('bookSession.pickSlot'));
      return bookFamilySession({
        episodeId: effectiveEpisodeId,
        scheduledAt: slotStart,
        durationMinutes,
        type: sessionType,
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['family-episode'] });
      void queryClient.invalidateQueries({ queryKey: ['scheduling-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['family-open-slots'] });
      toast.show(t('bookSession.booked'), { type: 'success' });
      const invoiceId =
        data.invoice &&
        typeof data.invoice === 'object' &&
        'invoiceId' in data.invoice &&
        typeof (data.invoice as { invoiceId?: unknown }).invoiceId === 'string'
          ? (data.invoice as { invoiceId: string }).invoiceId
          : undefined;
      if (invoiceId) {
        router.replace(`/(family)/invoices/${invoiceId}` as never);
        return;
      }
      router.replace('/(family)/bookings' as never);
    },
    onError: (e) => toastError(toast, e, t('bookSession.bookingFailed')),
  });

  const clinician = clinicianQuery.data?.clinician ?? null;
  const slots = slotsQuery.data?.slots ?? [];
  const availableCount = slots.filter((s) => s.status === 'available').length;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <FamilyTabHero
        title={t('bookSession.title')}
        subtitle={t('bookSession.description')}
        showBack
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {episodesQuery.isLoading ? (
          <ActivityIndicator color={FAMILY.teal} className="mt-8" />
        ) : episodes.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title={t('bookSession.noJourneys')}
            subtitle={t('bookSession.description')}
          />
        ) : (
          <View className="gap-4">
            <Card shadow>
              <SelectDropdown
                label={t('bookSession.careJourney')}
                placeholder={t('bookSession.careJourney')}
                options={episodeOptions}
                value={effectiveEpisodeId ?? ''}
                onChange={(id) => {
                  setEpisodeId(id);
                  setSlotStart(null);
                }}
                emptyText={t('bookSession.noJourneys')}
              />
            </Card>

            <Card shadow>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('bookSession.yourClinician')}
              </Text>
              {clinicianQuery.isLoading ? (
                <ActivityIndicator color={FAMILY.teal} className="mt-3" />
              ) : clinician ? (
                <Text className="mt-2 text-base font-semibold text-stone-900">
                  {clinician.name}
                  {clinician.role ? (
                    <Text className="font-normal text-stone-500">
                      {' '}
                      · {familyEnumLabel('role', String(clinician.role))}
                    </Text>
                  ) : null}
                </Text>
              ) : (
                <Text className="mt-2 text-sm text-stone-600">
                  {clinicianQuery.data?.message ?? t('bookSession.noClinician')}
                </Text>
              )}
            </Card>

            {clinician ? (
              <>
                <Card shadow>
                  <SelectDropdown
                    label={t('bookSession.sessionTypeLabel')}
                    placeholder={t('bookSession.selectType')}
                    options={sessionTypes}
                    value={sessionType}
                    onChange={(id) => setSessionType(id as SessionType)}
                    searchable={false}
                  />
                </Card>

                <Card shadow>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('bookSession.duration')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {DURATIONS.map((d) => {
                      const selected = durationMinutes === d;
                      return (
                        <Pressable
                          key={d}
                          onPress={() => {
                            setDurationMinutes(d);
                            setSlotStart(null);
                          }}
                          className={`rounded-xl border px-4 py-2 ${
                            selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${selected ? 'font-medium text-teal-700' : 'text-stone-600'}`}
                          >
                            {t('bookSession.durationMin', { count: d })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>

                <Card shadow>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('bookSession.date')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {days.map((d) => {
                      const selected = dateYmd === d.ymd;
                      return (
                        <Pressable
                          key={d.ymd}
                          onPress={() => {
                            setDateYmd(d.ymd);
                            setSlotStart(null);
                          }}
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
                </Card>

                <Card shadow>
                  <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('bookSession.timesToday')}
                  </Text>
                  <Text className="mb-3 text-xs text-stone-500">
                    {t('bookSession.slotsLegend')}
                  </Text>
                  {slotsQuery.isLoading ? (
                    <ActivityIndicator color={FAMILY.teal} />
                  ) : slotsQuery.isError ? (
                    <Text className="text-sm text-rose-700">
                      {apiErrorMessage(slotsQuery.error, t('bookSession.loadSlotsError'))}
                    </Text>
                  ) : slots.length === 0 ? (
                    <Text className="text-sm text-stone-500">
                      {slotsQuery.data?.message ?? t('bookSession.noHours')}
                    </Text>
                  ) : (
                    <View className="gap-3">
                      {slotsQuery.data?.message && availableCount === 0 ? (
                        <Text className="text-sm text-amber-800">{slotsQuery.data.message}</Text>
                      ) : null}
                      <View className="flex-row flex-wrap gap-2">
                        {slots.map((s) => {
                          const status = s.status ?? 'available';
                          const selected = slotStart === s.start;
                          const selectable = status === 'available';
                          const style = slotStyle(status, selected);
                          return (
                            <Pressable
                              key={s.start}
                              disabled={!selectable}
                              onPress={() => setSlotStart(s.start)}
                              className={`rounded-xl border px-3 py-2 ${style.wrap}`}
                              accessibilityLabel={`${slotLabel(s.start)} ${status}`}
                            >
                              <Text className={`text-sm ${style.text}`}>{slotLabel(s.start)}</Text>
                              {status === 'booked' ? (
                                <Text className="mt-0.5 text-[10px] uppercase text-stone-400">
                                  {t('bookSession.slotBooked')}
                                </Text>
                              ) : status === 'past' ? (
                                <Text className="mt-0.5 text-[10px] uppercase text-stone-400">
                                  {t('bookSession.slotTooSoon')}
                                </Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Card>

                <Button
                  disabled={!slotStart}
                  isLoading={bookMutation.isPending}
                  onPress={() => bookMutation.mutate()}
                >
                  {t('bookSession.confirmBooking')}
                </Button>
                <Text className="text-center text-xs text-stone-500">
                  {sessionType === 'telehealth'
                    ? t('bookSession.telehealthPayHint')
                    : t('bookSession.visitConfirmHint')}
                </Text>
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
