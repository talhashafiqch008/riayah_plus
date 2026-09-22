import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { SelectDropdown } from '../../../components/SelectDropdown';
import {
  createCoordinatorDocumentRequest,
  getIntake,
  reviewIntake,
  updateIntakeStatus,
  updateIntakeUrgency,
  type IntakeRecord,
  type ServiceCategory,
  type UrgencyLevel,
} from '../../../lib/api/care';
import { apiClient } from '../../../lib/api/client';
import {
  buildCoordinatorNextActions,
  nextUrgencyLevel,
  type CoordinatorNextAction,
} from '../../../lib/coordinatorIntakeNextActions';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { queryClient } from '../../../lib/query/client';
import { toastError } from '../../../lib/toast';

const CONCERN_OPTIONS = [
  'falls risk',
  'mobility',
  'medication management',
  'cognitive decline',
  'pain',
  'caregiver burnout',
  'post-discharge support',
];

const URGENCY_INDICATOR_OPTIONS = [
  'recent_discharge',
  'recent_fall',
  'worsening_symptoms',
  'no_informal_support',
  'time_sensitive_therapy',
];

const RISK_FLAG_OPTIONS = ['falls', 'polypharmacy', 'isolation', 'wound_care', 'dysphagia'];

const SERVICE_VALUES: ServiceCategory[] = [
  'physiotherapy',
  'nursing',
  'occupational_therapy',
  'speech_therapy',
  'behavioral_support',
  'companion_care',
];

const DOC_REQUEST_TYPE_IDS = [
  'medical_report',
  'referral',
  'prior_assessment',
  'insurance',
  'other',
] as const;

const REVIEWABLE = new Set(['submitted', 'under_review']);

const URGENCY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function chipKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function chipLabel(t: TFn, value: string) {
  const key = chipKey(value);
  return t(`chips.${key}`, { defaultValue: value.replace(/_/g, ' ') });
}

function nextActionCopy(
  t: TFn,
  action: CoordinatorNextAction,
  intake: IntakeRecord,
): { label: string; description: string } {
  const docCount = intake.documents?.length ?? 0;
  const urgency = intake.urgencyLevel || 'medium';
  const urgencyRank = URGENCY_RANK[urgency] ?? 2;

  switch (action.id) {
    case 'review':
      if (intake.status === 'submitted') {
        return {
          label: t('mobile.detail.startReviewShort'),
          description: t('intake.nextActions.review.descSubmitted'),
        };
      }
      return {
        label: t('intake.nextActions.review.labelUnderReview'),
        description: t('intake.nextActions.review.descUnderReview'),
      };
    case 'documents':
      return {
        label:
          docCount === 0
            ? t('intake.nextActions.documents.labelMissing')
            : t('intake.nextActions.documents.labelAdditional'),
        description:
          docCount === 0
            ? t('intake.nextActions.documents.descMissing')
            : t('intake.nextActions.documents.descAdditional'),
      };
    case 'schedule':
      return {
        label: t('intake.nextActions.schedule.label'),
        description: t('intake.nextActions.schedule.description'),
      };
    case 'escalate':
      return {
        label: t('intake.nextActions.escalate.label'),
        description:
          urgencyRank < 3
            ? t('intake.nextActions.escalate.descRaise', {
                urgency: t(`intake.urgency.${urgency}`, { defaultValue: urgency }),
              })
            : t('intake.nextActions.escalate.descUrgent'),
      };
    default:
      return { label: action.label, description: action.description };
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
        {title}
      </Text>
      <Card shadow={false} className="border border-stone-100">
        {children}
      </Card>
    </View>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="mb-3 last:mb-0">
      <Text className="text-xs text-stone-400">{label}</Text>
      <Text className="mt-0.5 text-sm text-stone-900">{value?.trim() || '—'}</Text>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View className="mb-2 mr-2 rounded-full bg-teal-50 px-2.5 py-1">
      <Text className="text-xs font-medium text-teal-700">{label}</Text>
    </View>
  );
}

function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={`mb-2 mr-2 rounded-full border px-3 py-1.5 ${
        selected ? 'border-teal-600 bg-teal-600' : 'border-stone-200 bg-white'
      }`}
    >
      <Text className={`text-xs font-medium ${selected ? 'text-white' : 'text-stone-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function CoordinatorIntakeDetailScreen() {
  const { t } = useTranslation('coordinator');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();

  const [keyConcerns, setKeyConcerns] = useState<string[]>([]);
  const [urgencyIndicators, setUrgencyIndicators] = useState<string[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<ServiceCategory[]>([]);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [createEpisode, setCreateEpisode] = useState(true);
  const [episodeTitle, setEpisodeTitle] = useState('');

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [docRequestOpen, setDocRequestOpen] = useState(false);
  const [docType, setDocType] = useState('medical_report');
  const [docNote, setDocNote] = useState('');

  const docRequestTypes = useMemo(
    () =>
      DOC_REQUEST_TYPE_IDS.map((docId) => ({
        id: docId,
        label: t(`intake.docTypes.${docId}`),
      })),
    [t],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['intake', id],
    enabled: Boolean(id),
    queryFn: () => getIntake(id!),
  });

  useEffect(() => {
    if (!data) return;
    setSuggestedServices(
      data.serviceInterests?.length ? data.serviceInterests : (['nursing'] as ServiceCategory[]),
    );
    setKeyConcerns([]);
    setUrgencyIndicators([]);
    setRiskFlags([]);
    setNotes('');
    setCreateEpisode(true);
    setEpisodeTitle('');
  }, [data?.id]);

  const nextActions = useMemo(
    () => (data ? buildCoordinatorNextActions(data) : []),
    [data],
  );

  const canReview = data ? REVIEWABLE.has(data.status) : false;

  const startReviewMutation = useMutation({
    mutationFn: () => updateIntakeStatus(id!, 'under_review'),
    onSuccess: async () => {
      toast.show(t('intake.toasts.markedUnderReview'), { type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['intake', id] });
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
    },
    onError: (e) => toastError(toast, e, t('intake.toasts.statusUpdateFailed')),
  });

  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('Missing intake');
      if (data.urgencyLevel === 'urgent') throw new Error(t('intake.toasts.alreadyUrgent'));
      const next = nextUrgencyLevel(data.urgencyLevel as UrgencyLevel | null);
      return updateIntakeUrgency(id!, next);
    },
    onSuccess: async (updated) => {
      const level = updated.urgencyLevel ?? 'higher';
      toast.show(t('intake.toasts.urgencyRaised', { level: t(`intake.urgency.${level}`, { defaultValue: level }) }), {
        type: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['intake', id] });
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
    },
    onError: (e) => toastError(toast, e, t('intake.toasts.escalateFailed')),
  });

  const docRequestMutation = useMutation({
    mutationFn: async () => {
      if (!data?.familyUser?.id) throw new Error(t('intake.toasts.noFamilyUser'));
      return createCoordinatorDocumentRequest({
        targetUserId: data.familyUser.id,
        documentType: docType,
        description: docNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.show(t('mobile.detail.docRequestSentToFamily'), { type: 'success' });
      setDocRequestOpen(false);
      setDocNote('');
    },
    onError: (e) => toastError(toast, e, t('mobile.detail.docRequestFailed')),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (keyConcerns.length === 0) throw new Error(t('intake.toasts.needConcern'));
      if (urgencyIndicators.length === 0) throw new Error(t('intake.toasts.needUrgency'));
      if (suggestedServices.length === 0) throw new Error(t('intake.toasts.needService'));
      return reviewIntake(id!, {
        keyConcerns,
        urgencyIndicators,
        suggestedServiceCategories: suggestedServices,
        riskFlags,
        createEpisode,
        episodeTitle: episodeTitle.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: async (result) => {
      toast.show(
        createEpisode ? t('mobile.detail.validatedEpisodeCreated') : t('intake.toasts.validated'),
        { type: 'success' },
      );
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['intake', id] });
      const episodeId = result.episode?.id ?? result.intake.careEpisode?.id;
      if (createEpisode && episodeId) {
        router.replace(`/(coordinator)/episodes/${episodeId}`);
      }
    },
    onError: (e) => toastError(toast, e, t('intake.toasts.reviewFailed')),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const reason = rejectReason.trim();
      if (reason.length < 5) throw new Error(t('mobile.detail.withdrawReasonMin'));
      return updateIntakeStatus(id!, 'withdrawn', reason);
    },
    onSuccess: async () => {
      toast.show(t('mobile.detail.intakeRejected'), { type: 'success' });
      setRejectOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
      router.back();
    },
    onError: (e) => toastError(toast, e),
  });

  const allergies = useMemo(() => {
    const payload = data?.wizardPayload ?? {};
    return asStringList(payload.allergies ?? payload.allergyList);
  }, [data?.wizardPayload]);

  const openDocument = useCallback(
    async (doc: { id: string; url?: string }) => {
      try {
        if (doc.url?.startsWith('http')) {
          await Linking.openURL(doc.url);
          return;
        }
        const res = await apiClient.get(`/api/intake/documents/${doc.id}/download`);
        const url = res.data?.data?.url ?? res.data?.url;
        if (typeof url === 'string' && url.startsWith('http')) {
          await Linking.openURL(url);
          return;
        }
        toast.show(t('mobile.detail.documentPreviewUnavailable'), { type: 'normal' });
      } catch (e) {
        toastError(toast, e, t('intake.toasts.docOpenFailed'));
      }
    },
    [t, toast],
  );

  const handleNextAction = (actionId: string) => {
    if (actionId === 'review') {
      if (data?.status === 'submitted') {
        startReviewMutation.mutate();
      }
      return;
    }
    if (actionId === 'documents') {
      setDocRequestOpen(true);
      return;
    }
    if (actionId === 'escalate') {
      escalateMutation.mutate();
      return;
    }
    if (actionId === 'schedule' && data?.careEpisode?.id) {
      router.push(`/(coordinator)/episodes/${data.careEpisode.id}`);
    }
  };

  const patientName = data?.careRecipient?.name ?? t('intake.detail.patient');
  const caregiverName = data?.primaryCaregiverName ?? data?.familyUser?.name ?? null;

  const reviewHintSuffix = createEpisode ? t('mobile.detail.structuredReviewEpisodeSuffix') : '';

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top', 'bottom']}>
      <ScreenHeader title={t('mobile.detail.intakeTitle')} showBack />

      {isLoading && !data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError || !data ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('mobile.detail.intakeLoadError')}
          subtitle={apiErrorMessage(error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void refetch() }}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-4 flex-row items-center gap-3">
            <Avatar name={patientName} size="lg" />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-stone-900">{patientName}</Text>
              <Text className="text-sm text-stone-400">
                {data.careUnit?.name ?? t('intake.detail.careUnit')}
                {data.submittedAt ? ` · ${formatDate(data.submittedAt)}` : ''}
              </Text>
            </View>
            <StatusBadge
              status={data.status}
              size="md"
              label={t(`intake.status.${data.status}`, {
                defaultValue: data.status.replace(/_/g, ' '),
              })}
            />
          </View>

          {nextActions.length > 0 ? (
            <Section title={t('intake.nextActions.title')}>
              <View className="gap-2">
                {nextActions.map((action) => {
                  const copy = nextActionCopy(t, action, data);
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() => handleNextAction(action.id)}
                      disabled={
                        (action.id === 'review' && startReviewMutation.isPending) ||
                        (action.id === 'escalate' && escalateMutation.isPending)
                      }
                      className={`rounded-xl border px-3 py-3 ${
                        action.primary
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          action.primary ? 'text-teal-800' : 'text-stone-900'
                        }`}
                      >
                        {copy.label}
                      </Text>
                      <Text className="mt-0.5 text-xs text-stone-500">{copy.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ) : null}

          <Section title={t('intake.detail.patient')}>
            <Field label={t('patientDetail.name')} value={data.careRecipient?.name} />
            <Field
              label={t('patientDetail.dateOfBirth')}
              value={
                data.careRecipient?.dateOfBirth
                  ? formatDate(data.careRecipient.dateOfBirth)
                  : null
              }
            />
            <Field label={t('patientDetail.gender')} value={data.careRecipient?.gender} />
          </Section>

          <Section title={t('mobile.detail.caregiver')}>
            <Field label={t('patientDetail.name')} value={caregiverName} />
            <Field label={t('patients.phone')} value={data.primaryCaregiverPhone} />
            <Field label={t('mobile.detail.email')} value={data.familyUser?.email} />
            <Field label={t('patients.relation')} value={data.primaryCaregiverRelation} />
          </Section>

          <Section title={t('intake.detail.reasonForCare')}>
            <Text className="text-sm leading-5 text-stone-800">{data.reasonForCare}</Text>
            {data.urgencyLevel ? (
              <View className="mt-3 self-start">
                <StatusBadge
                  status={data.urgencyLevel}
                  label={t(`intake.urgency.${data.urgencyLevel}`, {
                    defaultValue: data.urgencyLevel.replace(/_/g, ' '),
                  })}
                />
              </View>
            ) : null}
          </Section>

          <Section title={t('mobile.detail.medical')}>
            {(data.diagnoses?.length ?? 0) > 0 ? (
              <View className="mb-2 flex-row flex-wrap">
                {data.diagnoses.map((d) => (
                  <Pill key={d} label={d} />
                ))}
              </View>
            ) : (
              <Text className="mb-2 text-sm text-stone-400">
                {t('mobile.detail.noDiagnosesListed')}
              </Text>
            )}
            <Field label={t('intake.detail.medications')} value={data.currentMeds} />
            <Field label={t('intake.detail.medicalHistory')} value={data.medicalHistory} />
            {allergies.length > 0 ? (
              <View className="mt-1 flex-row flex-wrap">
                {allergies.map((a) => (
                  <Pill key={a} label={a} />
                ))}
              </View>
            ) : (
              <Field label={t('mobile.detail.allergies')} value={null} />
            )}
          </Section>

          <Section title={t('mobile.detail.servicesRequested')}>
            {(data.serviceInterests?.length ?? 0) > 0 ? (
              <View className="flex-row flex-wrap">
                {data.serviceInterests!.map((s) => (
                  <Pill
                    key={s}
                    label={t(`intake.services.${s}`, { defaultValue: s.replace(/_/g, ' ') })}
                  />
                ))}
              </View>
            ) : (
              <Text className="text-sm text-stone-400">{t('mobile.detail.noneSelected')}</Text>
            )}
          </Section>

          <Section title={t('intake.detail.documents', { count: data.documents?.length ?? 0 })}>
            {(data.documents?.length ?? 0) === 0 ? (
              <Text className="text-sm text-stone-400">{t('mobile.detail.noDocumentsUploaded')}</Text>
            ) : (
              data.documents!.map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => void openDocument(doc)}
                  className="mb-2 flex-row items-center gap-3 rounded-xl bg-stone-50 px-3 py-3"
                >
                  <Ionicons name="document-outline" size={20} color="#0D9488" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-stone-900" numberOfLines={1}>
                      {doc.name}
                    </Text>
                    {doc.category ? (
                      <Text className="text-xs text-stone-400">
                        {t(`intake.docTypes.${doc.category}`, {
                          defaultValue: doc.category.replace(/_/g, ' '),
                        })}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="download-outline" size={18} color="#A8A29E" />
                </Pressable>
              ))
            )}
            {canReview ? (
              <Button
                variant="secondary"
                className="mt-2"
                onPress={() => setDocRequestOpen(true)}
              >
                {t('intake.actions.requestDocs')}
              </Button>
            ) : null}
          </Section>

          {canReview ? (
            <Section title={t('intake.detail.structuredReview')}>
              <Text className="mb-3 text-sm text-stone-500">
                {t('mobile.detail.structuredReviewHint', { suffix: reviewHintSuffix })}
              </Text>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('intake.detail.keyConcerns')}
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {CONCERN_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={chipLabel(t, c)}
                    selected={keyConcerns.includes(c)}
                    onToggle={() => setKeyConcerns((prev) => toggleInList(prev, c))}
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('intake.detail.urgencyIndicators')}
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {URGENCY_INDICATOR_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={chipLabel(t, c)}
                    selected={urgencyIndicators.includes(c)}
                    onToggle={() => setUrgencyIndicators((prev) => toggleInList(prev, c))}
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('intake.detail.suggestedServices')}
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {SERVICE_VALUES.map((s) => (
                  <ChipToggle
                    key={s}
                    label={t(`intake.services.${s}`)}
                    selected={suggestedServices.includes(s)}
                    onToggle={() =>
                      setSuggestedServices((prev) => toggleInList(prev, s))
                    }
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('intake.detail.riskFlags')}
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {RISK_FLAG_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={chipLabel(t, c)}
                    selected={riskFlags.includes(c)}
                    onToggle={() => setRiskFlags((prev) => toggleInList(prev, c))}
                  />
                ))}
              </View>

              <Text className="mb-1 text-sm text-stone-700">{t('intake.detail.notes')}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder={t('intake.detail.notesPlaceholder')}
                placeholderTextColor="#A8A29E"
                className="mb-4 min-h-[88px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
              />

              <Pressable
                className="mb-3 flex-row items-center gap-2"
                onPress={() => setCreateEpisode((v) => !v)}
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${
                    createEpisode
                      ? 'border-teal-600 bg-teal-600'
                      : 'border-stone-300 bg-white'
                  }`}
                >
                  {createEpisode ? (
                    <Text className="text-xs font-bold text-white">✓</Text>
                  ) : null}
                </View>
                <Text className="flex-1 text-sm text-stone-700">
                  {t('intake.detail.createEpisodeOnValidate')}
                </Text>
              </Pressable>

              {createEpisode ? (
                <TextInput
                  value={episodeTitle}
                  onChangeText={setEpisodeTitle}
                  placeholder={t('intake.episodeTitlePlaceholder')}
                  placeholderTextColor="#A8A29E"
                  className="mb-4 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
                />
              ) : null}

              <View className="gap-2">
                <Button
                  isLoading={reviewMutation.isPending}
                  onPress={() => reviewMutation.mutate()}
                >
                  {t('mobile.detail.submitStructuredReview')}
                </Button>
                <Button
                  variant="destructive"
                  onPress={() => {
                    setRejectReason('');
                    setRejectOpen(true);
                  }}
                >
                  {t('mobile.detail.rejectIntake')}
                </Button>
              </View>
            </Section>
          ) : (
            <Section title={t('mobile.detail.statusSection')}>
              <Text className="text-sm text-stone-600">{t('intake.detail.notOpen')}</Text>
              {data.careEpisode?.id ? (
                <Button
                  className="mt-3"
                  variant="secondary"
                  onPress={() =>
                    router.push(`/(coordinator)/episodes/${data.careEpisode!.id}`)
                  }
                >
                  {t('intake.actions.openEpisode')}
                </Button>
              ) : null}
            </Section>
          )}

          {isFetching ? (
            <ActivityIndicator color="#0D9488" className="mt-2" />
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={docRequestOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDocRequestOpen(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-stone-200" />
            <Text className="text-lg font-semibold text-stone-900">
              {t('intake.actions.requestDocs')}
            </Text>
            <Text className="mt-1 text-sm text-stone-400">
              {t('mobile.detail.requestDocumentsHint')}
            </Text>
            <View className="mt-4 gap-3">
              <SelectDropdown
                label={t('intake.detail.documentType')}
                options={docRequestTypes}
                value={docType}
                onChange={setDocType}
                searchable={false}
              />
              <TextInput
                value={docNote}
                onChangeText={setDocNote}
                multiline
                placeholder={t('mobile.detail.optionalNoteForFamily')}
                placeholderTextColor="#A8A29E"
                className="min-h-[72px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
                textAlignVertical="top"
              />
            </View>
            <View className="mt-4 flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => setDocRequestOpen(false)}
                disabled={docRequestMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                isLoading={docRequestMutation.isPending}
                onPress={() => docRequestMutation.mutate()}
              >
                {t('intake.actions.sendRequest')}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={rejectOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectOpen(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-stone-200" />
            <Text className="text-lg font-semibold text-stone-900">
              {t('mobile.detail.rejectIntake')}
            </Text>
            <Text className="mt-1 text-sm text-stone-400">
              {t('mobile.detail.rejectIntakeHint')}
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder={t('mobile.detail.rejectReasonPlaceholder')}
              placeholderTextColor="#A8A29E"
              className="mt-4 min-h-[80px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
            />
            <View className="mt-4 flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => setRejectOpen(false)}
                disabled={rejectMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                isLoading={rejectMutation.isPending}
                onPress={() => rejectMutation.mutate()}
              >
                {t('mobile.detail.reject')}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
