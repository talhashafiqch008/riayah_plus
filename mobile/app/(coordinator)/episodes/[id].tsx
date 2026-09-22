import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { ClinicianDropdown } from '../../../components/ClinicianDropdown';
import {
  allowedEpisodeTransitions,
  getEpisode,
  listClinicians,
  scheduleAssessment,
  updateEpisodeStatus,
} from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { buildFamilyJourneyMilestones } from '../../../lib/familyJourneyMilestones';
import { toastError } from '../../../lib/toast';

const CONSULTATION_TYPE_IDS = ['initial', 'follow_up', 'discharge'] as const;

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

function episodeStatusLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  status: string,
) {
  return t(`episodes.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
}

function staffRoleLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  role: string,
) {
  return t(`mobile.detail.staffRoles.${role}`, { defaultValue: role.replace(/_/g, ' ') });
}

export default function CoordinatorEpisodeDetailScreen() {
  const { t, i18n } = useTranslation('coordinator');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();

  const [assessorId, setAssessorId] = useState<string | null>(null);
  const [type, setType] = useState<string>('initial');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-QA' : 'en-AU';
  const days = useMemo(() => nextFourteenDays(dateLocale), [dateLocale]);

  const query = useQuery({
    queryKey: ['coordinator-episode', id],
    enabled: Boolean(id),
    queryFn: () => getEpisode(id!),
  });

  const episode = query.data;
  const isClosed = (episode?.status ?? '') === 'closed';
  const nextStatuses = episode ? allowedEpisodeTransitions(episode.status ?? '') : [];

  const cliniciansQuery = useQuery({
    queryKey: ['assessment-clinicians'],
    enabled: Boolean(episode) && !isClosed,
    retry: false,
    queryFn: listClinicians,
  });

  const transitionMutation = useMutation({
    mutationFn: (next: string) => {
      if (!id) throw new Error('Missing episode');
      return updateEpisodeStatus(id, next);
    },
    onSuccess: async (_data, next) => {
      await queryClient.invalidateQueries({ queryKey: ['coordinator-episode', id] });
      await queryClient.invalidateQueries({ queryKey: ['coordinator-episodes'] });
      await queryClient.invalidateQueries({ queryKey: ['coordinator-shell-stats'] });
      toast.show(
        t('mobile.detail.statusUpdatedToast', { status: episodeStatusLabel(t, next) }),
        { type: 'success' },
      );
    },
    onError: (e) => toastError(toast, e, t('intake.toasts.statusUpdateFailed')),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing episode');
      if (!assessorId) throw new Error(t('mobile.detail.pickClinician'));
      if (!date || !time) throw new Error(t('mobile.detail.pickDateTime'));
      return scheduleAssessment({
        episodeId: id,
        assessorId,
        type,
        scheduledAt: combineDateAndTime(date, time),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-episode', id] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-episodes'] });
      setDate(null);
      setTime(null);
      toast.show(t('episodeDetail.assessmentScheduled'), { type: 'success' });
    },
    onError: (e) => toastError(toast, e, t('episodeDetail.scheduleFailed')),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('mobile.detail.episodeFallback')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !episode) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('mobile.detail.episodeFallback')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('episodeDetail.notFound')}
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const milestones = buildFamilyJourneyMilestones(episode);
  const assessments = episode.assessments ?? [];
  const sessions = episode.sessions ?? [];
  const clinicians = cliniciansQuery.data ?? [];
  const canBook = !isClosed && clinicians.length > 0;

  const urgencyLabel = episode.urgencyLevel
    ? t(`intake.urgency.${episode.urgencyLevel}`, {
        defaultValue: episode.urgencyLevel.replace(/_/g, ' '),
      })
    : '—';

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={episode.title ?? t('mobile.detail.episodeFallback')}
        subtitle={episode.careRecipient?.name ?? episode.patient?.name ?? undefined}
        showBack
      />

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
        <View className="flex-row items-center justify-between">
          {episode.status ? (
            <StatusBadge
              status={episode.status}
              size="md"
              label={episodeStatusLabel(t, episode.status)}
            />
          ) : null}
          <Pressable onPress={() => router.push(`/(coordinator)/plans/new?episodeId=${episode.id}`)}>
            <Text className="text-sm font-semibold text-teal-700">
              {t('mobile.detail.newCarePlan')}
            </Text>
          </Pressable>
        </View>

        <Card className="mt-3" shadow>
          <Text className="text-sm font-semibold text-stone-900">
            {t('mobile.detail.careJourney')}
          </Text>
          <Text className="mt-0.5 text-sm text-stone-500">
            {t('mobile.detail.careJourneyCoordinatorHint')}
          </Text>
          <View className="mt-4 gap-3">
            {milestones.map((m, i) => (
              <View key={m.id} className="flex-row items-start gap-3">
                <View
                  className={`mt-0.5 h-7 w-7 items-center justify-center rounded-full ${
                    m.locked
                      ? 'border border-dashed border-stone-300 bg-stone-100'
                      : m.current
                        ? 'bg-teal-600'
                        : m.done
                          ? 'bg-teal-100'
                          : 'bg-stone-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      m.locked
                        ? 'text-stone-400'
                        : m.current
                          ? 'text-white'
                          : m.done
                            ? 'text-teal-800'
                            : 'text-stone-400'
                    }`}
                  >
                    {m.locked ? '·' : i + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text
                      className={`text-sm font-medium ${
                        m.locked
                          ? 'text-stone-400'
                          : m.current
                            ? 'text-teal-800'
                            : m.done
                              ? 'text-stone-900'
                              : 'text-stone-400'
                      }`}
                    >
                      {m.label}
                    </Text>
                    {m.locked ? <Chip label={t('mobile.detail.comingSoon')} /> : null}
                    {m.current && !m.locked ? (
                      <Chip label={t('mobile.detail.now')} tone="teal" />
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {nextStatuses.length > 0 ? (
            <View className="mt-5 border-t border-stone-100 pt-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('episodeDetail.advanceStatus')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {nextStatuses.map((next) => (
                  <Pressable
                    key={next}
                    disabled={transitionMutation.isPending}
                    onPress={() => transitionMutation.mutate(next)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2"
                  >
                    <Text className="text-xs font-semibold capitalize text-stone-700">
                      {transitionMutation.isPending && transitionMutation.variables === next
                        ? t('intake.detail.updating')
                        : t('mobile.detail.statusTransition', {
                            label: episodeStatusLabel(t, next),
                          })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text className="mt-4 text-sm text-stone-500">
              {t('mobile.detail.noStatusTransitions')}
            </Text>
          )}

          <View className="mt-4 border-t border-stone-100 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {t('episodeDetail.assignedCoordinator')}
            </Text>
            <Text className="mt-0.5 text-sm text-stone-800">
              {episode.coordinator?.name ?? t('mobile.detail.unassigned')}
            </Text>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">
            {t('episodeDetail.clinicalSummary')}
          </Text>
          <View className="mt-3 gap-3">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('episodeDetail.reasonForCare')}
              </Text>
              <Text className="mt-0.5 text-base text-stone-900">{episode.reasonForCare || '—'}</Text>
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('episodeDetail.urgency')}
              </Text>
              <Text className="mt-0.5 text-base capitalize text-stone-900">{urgencyLabel}</Text>
            </View>
            {(episode.diagnoses ?? []).length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {episode.diagnoses!.map((d) => (
                  <Chip key={d} label={d} tone="sky" />
                ))}
              </View>
            ) : null}
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          {t('mobile.detail.consultations')}
        </Text>
        {assessments.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">{t('mobile.detail.noConsultations')}</Text>
          </Card>
        ) : (
          assessments.map((a) => {
            const assessmentStatus = a.status ?? 'scheduled';
            return (
              <Card key={a.id} className="mb-2" shadow={false}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 font-medium capitalize text-stone-900">
                    {t(`assessmentTypes.${a.type ?? 'initial'}`, {
                      defaultValue: (a.type ?? 'consultation').replace(/_/g, ' '),
                    })}
                    {a.scheduledAt ? ` · ${formatDateTime(a.scheduledAt)}` : ''}
                  </Text>
                  <StatusBadge
                    status={assessmentStatus}
                    label={t(`mobile.detail.assessmentStatus.${assessmentStatus}`, {
                      defaultValue: assessmentStatus.replace(/_/g, ' '),
                    })}
                  />
                </View>
                {a.assessor?.name ? (
                  <Text className="mt-1 text-sm text-stone-500">
                    {a.assessor.role
                      ? t('mobile.detail.withPersonRole', {
                          name: a.assessor.name,
                          role: staffRoleLabel(t, a.assessor.role),
                        })
                      : t('mobile.detail.withPerson', { name: a.assessor.name })}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}

        {!isClosed ? (
          <Card className="mt-4" shadow>
            <Text className="text-sm font-semibold text-stone-900">
              {t('mobile.detail.bookConsultation')}
            </Text>
            {cliniciansQuery.isLoading ? (
              <ActivityIndicator color="#0D9488" className="mt-4" />
            ) : !canBook ? (
              <Text className="mt-2 text-sm text-stone-500">
                {t('mobile.detail.noCliniciansToBook')}
              </Text>
            ) : (
              <View className="mt-3 gap-4">
                <ClinicianDropdown
                  clinicians={clinicians}
                  value={assessorId}
                  onChange={setAssessorId}
                />

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('episodeDetail.type')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {CONSULTATION_TYPE_IDS.map((consultType) => {
                      const selected = type === consultType;
                      return (
                        <Pressable
                          key={consultType}
                          onPress={() => setType(consultType)}
                          className={`rounded-xl border px-3 py-2 ${
                            selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              selected ? 'font-medium text-teal-700' : 'text-stone-600'
                            }`}
                          >
                            {t(`assessmentTypes.${consultType}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
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
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('mobile.detail.time')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const selected = time === slot;
                      return (
                        <Pressable
                          key={slot}
                          onPress={() => setTime(slot)}
                          className={`rounded-xl border px-4 py-2 ${
                            selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              selected ? 'font-medium text-teal-700' : 'text-stone-600'
                            }`}
                          >
                            {slot}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Button
                  disabled={!assessorId || !date || !time}
                  isLoading={scheduleMutation.isPending}
                  onPress={() => scheduleMutation.mutate()}
                >
                  {t('intake.actions.scheduleConsultation')}
                </Button>
              </View>
            )}
          </Card>
        ) : null}

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          {t('episodeDetail.sessions')}
        </Text>
        {sessions.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">{t('episodeDetail.noSessions')}</Text>
          </Card>
        ) : (
          sessions.map((s) => {
            const sessionStatus = s.status ?? 'scheduled';
            return (
              <Card key={s.id} className="mb-2" shadow={false}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 font-medium text-stone-900">
                    {s.scheduledAt ? formatDateTime(s.scheduledAt) : t('mobile.detail.sessionFallback')}
                    {s.durationMinutes
                      ? ` · ${t('display.minutes', { count: s.durationMinutes })}`
                      : ''}
                  </Text>
                  <StatusBadge
                    status={sessionStatus}
                    label={t(`schedule.sessionStatus.${sessionStatus}`, {
                      defaultValue: sessionStatus.replace(/_/g, ' '),
                    })}
                  />
                </View>
                {s.provider?.name ? (
                  <Text className="mt-1 text-sm text-stone-500">
                    {t('mobile.detail.withPerson', { name: s.provider.name })}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
