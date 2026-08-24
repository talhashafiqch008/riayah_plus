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
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  StatusBadge,
} from '../../../components/ui';
import { FamilyTabHero } from '../../../components/family/FamilyChrome';
import { ClinicianDropdown } from '../../../components/ClinicianDropdown';
import {
  getEpisode,
  listClinicians,
  scheduleAssessment,
} from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import {
  familyAssessmentStatusLabel,
  familyEpisodeStatusLabel,
} from '../../../lib/familyLanguage';
import { buildFamilyJourneyMilestones } from '../../../lib/familyJourneyMilestones';
import { toastError } from '../../../lib/toast';

const CONSULTATION_TYPES = [
  { id: 'initial', label: 'Initial' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'discharge', label: 'Discharge' },
] as const;

const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00'];

function nextFourteenDays() {
  const out: { iso: string; day: string; date: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString('en-AU', { weekday: 'short' }),
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

export default function FamilyEpisodeDetailScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();
  const toast = useToast();

  const [assessorId, setAssessorId] = useState<string | null>(null);
  const [type, setType] = useState<string>('initial');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const days = useMemo(() => nextFourteenDays(), []);

  const query = useQuery({
    queryKey: ['family-episode', episodeId],
    enabled: Boolean(episodeId),
    queryFn: () => getEpisode(episodeId!),
  });

  const episode = query.data;
  const isClosed = (episode?.status ?? '') === 'closed';

  const cliniciansQuery = useQuery({
    queryKey: ['assessment-clinicians'],
    enabled: Boolean(episode) && !isClosed,
    retry: false,
    queryFn: listClinicians,
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!episodeId) throw new Error('Missing care journey');
      if (!assessorId) throw new Error('Pick a clinician');
      if (!date || !time) throw new Error('Pick a date and time');
      return scheduleAssessment({
        episodeId,
        assessorId,
        type,
        scheduledAt: combineDateAndTime(date, time),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-episode', episodeId] });
      queryClient.invalidateQueries({ queryKey: ['family-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['family-assessments'] });
      setDate(null);
      setTime(null);
      toast.show('Consultation booked', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Booking failed'),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title="Care journey" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !episode) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title="Care journey" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Care journey not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const milestones = buildFamilyJourneyMilestones(episode);
  const assessments = episode.assessments ?? [];
  const sessions = episode.sessions ?? [];
  const clinicians = cliniciansQuery.data ?? [];
  const canBook = !isClosed && clinicians.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <FamilyTabHero
        title={episode.title ?? 'Care journey'}
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
        <View className="mb-3 flex-row justify-end">
          {episode.status ? (
            <StatusBadge
              status={episode.status}
              size="md"
              label={familyEpisodeStatusLabel(episode.status)}
            />
          ) : null}
        </View>

        <Card className="mt-3" shadow>
          <Text className="text-sm font-semibold text-stone-900">Your care journey</Text>
          <Text className="mt-0.5 text-sm text-stone-500">
            Simple milestones so you always know what comes next.
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
                    {m.locked ? <Chip label="Coming soon" /> : null}
                    {m.current && !m.locked ? <Chip label="Now" tone="teal" /> : null}
                  </View>
                  {m.description ? (
                    <Text
                      className={`mt-0.5 text-xs ${
                        m.locked ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      {m.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">Care summary</Text>
          <View className="mt-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Reason for care
            </Text>
            <Text className="mt-0.5 text-base text-stone-900">
              {episode.reasonForCare || '—'}
            </Text>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">Timeline</Text>
          <View className="mt-3 gap-3">
            <TimelineRow
              color="bg-amber-400"
              title="Care request received"
              subtitle={episode.createdAt ? formatDateTime(episode.createdAt) : '—'}
            />
            {episode.intakeReviewedAt ? (
              <TimelineRow
                color="bg-teal-500"
                title="Care team reviewed"
                subtitle={formatDateTime(episode.intakeReviewedAt)}
              />
            ) : null}
            <TimelineRow
              color={
                ['validated', 'active'].includes(episode.status ?? '')
                  ? 'bg-green-500'
                  : 'bg-stone-300'
              }
              title={`Current: ${familyEpisodeStatusLabel(episode.status ?? '')}`}
              subtitle={episode.updatedAt ? formatDateTime(episode.updatedAt) : '—'}
            />
            <TimelineRow
              color={assessments.length > 0 ? 'bg-sky-500' : 'bg-stone-200'}
              title="Consultations"
              subtitle={
                assessments.length > 0 ? `${assessments.length} booked` : 'None booked yet'
              }
            />
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Consultations
        </Text>
        {assessments.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">
              No consultations booked for this care journey yet.
            </Text>
          </Card>
        ) : (
          assessments.map((a) => (
            <Card key={a.id} className="mb-2" shadow={false}>
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-medium capitalize text-stone-900">
                  {(a.type ?? 'consultation').replace(/_/g, ' ')}
                  {a.scheduledAt ? ` · ${formatDateTime(a.scheduledAt)}` : ''}
                </Text>
                <StatusBadge
                  status={a.status ?? 'scheduled'}
                  label={familyAssessmentStatusLabel(a.status ?? 'scheduled')}
                />
              </View>
              {a.assessor?.name ? (
                <Text className="mt-1 text-sm text-stone-500">
                  With {a.assessor.name}
                  {a.assessor.role ? ` · ${a.assessor.role.replace(/_/g, ' ')}` : ''}
                </Text>
              ) : null}
            </Card>
          ))
        )}

        {!isClosed ? (
          <Card className="mt-4" shadow>
            <Text className="text-sm font-semibold text-stone-900">Book a consultation</Text>
            {cliniciansQuery.isLoading ? (
              <ActivityIndicator color="#0D9488" className="mt-4" />
            ) : !canBook ? (
              <Text className="mt-2 text-sm text-stone-500">
                No clinicians available to book right now. Your coordinator can schedule a
                consultation for you.
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
                    Type
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {CONSULTATION_TYPES.map((t) => {
                      const selected = type === t.id;
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => setType(t.id)}
                          className={`rounded-xl border px-3 py-2 ${
                            selected
                              ? 'border-teal-600 bg-teal-50'
                              : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              selected ? 'font-medium text-teal-700' : 'text-stone-600'
                            }`}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Date
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
                            selected
                              ? 'border-teal-600 bg-teal-50'
                              : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              selected ? 'text-teal-700' : 'text-stone-400'
                            }`}
                          >
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
                    Time
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {TIME_SLOTS.map((t) => {
                      const selected = time === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setTime(t)}
                          className={`rounded-xl border px-4 py-2 ${
                            selected
                              ? 'border-teal-600 bg-teal-50'
                              : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              selected ? 'font-medium text-teal-700' : 'text-stone-600'
                            }`}
                          >
                            {t}
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
                  Book consultation
                </Button>
              </View>
            )}
          </Card>
        ) : null}

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Sessions
        </Text>
        {sessions.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">
              No care sessions scheduled for this care journey yet.
            </Text>
          </Card>
        ) : (
          sessions.map((s) => (
            <Card key={s.id} className="mb-2" shadow={false}>
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-medium text-stone-900">
                  {s.scheduledAt ? formatDateTime(s.scheduledAt) : 'Session'}
                  {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                </Text>
                <StatusBadge status={s.status ?? 'scheduled'} />
              </View>
              {s.provider?.name ? (
                <Text className="mt-1 text-sm text-stone-500">With {s.provider.name}</Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineRow({
  color,
  title,
  subtitle,
}: {
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className={`mt-1.5 h-3 w-3 rounded-full ${color}`} />
      <View className="flex-1">
        <Text className="text-sm font-medium capitalize text-stone-900">{title}</Text>
        <Text className="mt-0.5 text-xs text-stone-500">{subtitle}</Text>
      </View>
    </View>
  );
}
