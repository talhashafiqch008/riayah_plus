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
  type ServiceCategory,
  type UrgencyLevel,
} from '../../../lib/api/care';
import { apiClient } from '../../../lib/api/client';
import {
  buildCoordinatorNextActions,
  nextUrgencyLevel,
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

const SERVICE_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'occupational_therapy', label: 'Occupational therapy' },
  { value: 'speech_therapy', label: 'Speech therapy' },
  { value: 'behavioral_support', label: 'Behavioral support' },
  { value: 'companion_care', label: 'Companion care' },
];

const DOC_REQUEST_TYPES = [
  { id: 'medical_report', label: 'Medical report' },
  { id: 'referral', label: 'Referral' },
  { id: 'prior_assessment', label: 'Prior assessment' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'other', label: 'Other' },
];

const REVIEWABLE = new Set(['submitted', 'under_review']);

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
      <Text className="text-xs font-medium capitalize text-teal-700">
        {label.replace(/_/g, ' ')}
      </Text>
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
      <Text
        className={`text-xs font-medium capitalize ${
          selected ? 'text-white' : 'text-stone-700'
        }`}
      >
        {label.replace(/_/g, ' ')}
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
      toast.show('Marked under review', { type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['intake', id] });
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
    },
    onError: (e) => toastError(toast, e, 'Could not update status'),
  });

  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('Missing intake');
      if (data.urgencyLevel === 'urgent') throw new Error('Already at urgent');
      const next = nextUrgencyLevel(data.urgencyLevel as UrgencyLevel | null);
      return updateIntakeUrgency(id!, next);
    },
    onSuccess: async (updated) => {
      toast.show(`Urgency raised to ${updated.urgencyLevel ?? 'higher'}`, { type: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['intake', id] });
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
    },
    onError: (e) => toastError(toast, e, 'Could not escalate urgency'),
  });

  const docRequestMutation = useMutation({
    mutationFn: async () => {
      if (!data?.familyUser?.id) throw new Error('No family user on this intake to notify');
      return createCoordinatorDocumentRequest({
        targetUserId: data.familyUser.id,
        documentType: docType,
        description: docNote.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.show('Document request sent to family', { type: 'success' });
      setDocRequestOpen(false);
      setDocNote('');
    },
    onError: (e) => toastError(toast, e, 'Could not send document request'),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (keyConcerns.length === 0) throw new Error('Select at least one key concern');
      if (urgencyIndicators.length === 0) throw new Error('Select at least one urgency indicator');
      if (suggestedServices.length === 0) throw new Error('Select at least one suggested service');
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
        createEpisode
          ? 'Intake validated — care episode created'
          : 'Intake validated',
        { type: 'success' },
      );
      await queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['intake', id] });
      const episodeId = result.episode?.id ?? result.intake.careEpisode?.id;
      if (createEpisode && episodeId) {
        router.replace(`/(coordinator)/episodes/${episodeId}`);
      }
    },
    onError: (e) => toastError(toast, e, 'Review failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const reason = rejectReason.trim();
      if (reason.length < 5) throw new Error('Please provide a reason (min 5 characters)');
      return updateIntakeStatus(id!, 'withdrawn', reason);
    },
    onSuccess: async () => {
      toast.show('Intake rejected', { type: 'success' });
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
        toast.show('Document preview unavailable on device', { type: 'normal' });
      } catch (e) {
        toastError(toast, e, 'Could not open document');
      }
    },
    [toast],
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

  const patientName = data?.careRecipient?.name ?? 'Patient';
  const caregiverName = data?.primaryCaregiverName ?? data?.familyUser?.name ?? null;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top', 'bottom']}>
      <ScreenHeader title="Intake Detail" showBack />

      {isLoading && !data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError || !data ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(error)}
          action={{ label: 'Try again', onPress: () => void refetch() }}
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
                {data.careUnit?.name ?? 'Care unit'}
                {data.submittedAt ? ` · ${formatDate(data.submittedAt)}` : ''}
              </Text>
            </View>
            <StatusBadge status={data.status} size="md" />
          </View>

          {nextActions.length > 0 ? (
            <Section title="Next actions">
              <View className="gap-2">
                {nextActions.map((action) => (
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
                      {action.id === 'review' && data.status === 'submitted'
                        ? 'Start review'
                        : action.label}
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-500">{action.description}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}

          <Section title="Patient">
            <Field label="Name" value={data.careRecipient?.name} />
            <Field
              label="Date of birth"
              value={
                data.careRecipient?.dateOfBirth
                  ? formatDate(data.careRecipient.dateOfBirth)
                  : null
              }
            />
            <Field label="Gender" value={data.careRecipient?.gender} />
          </Section>

          <Section title="Caregiver">
            <Field label="Name" value={caregiverName} />
            <Field label="Phone" value={data.primaryCaregiverPhone} />
            <Field label="Email" value={data.familyUser?.email} />
            <Field label="Relation" value={data.primaryCaregiverRelation} />
          </Section>

          <Section title="Reason for care">
            <Text className="text-sm leading-5 text-stone-800">{data.reasonForCare}</Text>
            {data.urgencyLevel ? (
              <View className="mt-3 self-start">
                <StatusBadge status={data.urgencyLevel} />
              </View>
            ) : null}
          </Section>

          <Section title="Medical">
            {(data.diagnoses?.length ?? 0) > 0 ? (
              <View className="mb-2 flex-row flex-wrap">
                {data.diagnoses.map((d) => (
                  <Pill key={d} label={d} />
                ))}
              </View>
            ) : (
              <Text className="mb-2 text-sm text-stone-400">No diagnoses listed</Text>
            )}
            <Field label="Medications" value={data.currentMeds} />
            <Field label="Medical history" value={data.medicalHistory} />
            {allergies.length > 0 ? (
              <View className="mt-1 flex-row flex-wrap">
                {allergies.map((a) => (
                  <Pill key={a} label={a} />
                ))}
              </View>
            ) : (
              <Field label="Allergies" value={null} />
            )}
          </Section>

          <Section title="Services requested">
            {(data.serviceInterests?.length ?? 0) > 0 ? (
              <View className="flex-row flex-wrap">
                {data.serviceInterests!.map((s) => (
                  <Pill key={s} label={s} />
                ))}
              </View>
            ) : (
              <Text className="text-sm text-stone-400">None selected</Text>
            )}
          </Section>

          <Section title="Documents">
            {(data.documents?.length ?? 0) === 0 ? (
              <Text className="text-sm text-stone-400">No documents uploaded</Text>
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
                      <Text className="text-xs capitalize text-stone-400">
                        {doc.category.replace(/_/g, ' ')}
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
                Request documents
              </Button>
            ) : null}
          </Section>

          {canReview ? (
            <Section title="Structured review">
              <Text className="mb-3 text-sm text-stone-500">
                Complete clinical chips, then submit to validate
                {createEpisode ? ' and open a care episode' : ''}.
              </Text>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Key concerns *
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {CONCERN_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={c}
                    selected={keyConcerns.includes(c)}
                    onToggle={() => setKeyConcerns((prev) => toggleInList(prev, c))}
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Urgency indicators *
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {URGENCY_INDICATOR_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={c}
                    selected={urgencyIndicators.includes(c)}
                    onToggle={() => setUrgencyIndicators((prev) => toggleInList(prev, c))}
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Suggested services *
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {SERVICE_OPTIONS.map((s) => (
                  <ChipToggle
                    key={s.value}
                    label={s.label}
                    selected={suggestedServices.includes(s.value)}
                    onToggle={() =>
                      setSuggestedServices((prev) => toggleInList(prev, s.value))
                    }
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Risk flags
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {RISK_FLAG_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={c}
                    selected={riskFlags.includes(c)}
                    onToggle={() => setRiskFlags((prev) => toggleInList(prev, c))}
                  />
                ))}
              </View>

              <Text className="mb-1 text-sm text-stone-700">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Additional structured comment"
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
                  Create care episode on validate
                </Text>
              </Pressable>

              {createEpisode ? (
                <TextInput
                  value={episodeTitle}
                  onChangeText={setEpisodeTitle}
                  placeholder="Episode title (optional)"
                  placeholderTextColor="#A8A29E"
                  className="mb-4 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
                />
              ) : null}

              <View className="gap-2">
                <Button
                  isLoading={reviewMutation.isPending}
                  onPress={() => reviewMutation.mutate()}
                >
                  Submit structured review
                </Button>
                <Button
                  variant="destructive"
                  onPress={() => {
                    setRejectReason('');
                    setRejectOpen(true);
                  }}
                >
                  Reject intake
                </Button>
              </View>
            </Section>
          ) : (
            <Section title="Status">
              <Text className="text-sm text-stone-600">
                This intake is not open for review.
              </Text>
              {data.careEpisode?.id ? (
                <Button
                  className="mt-3"
                  variant="secondary"
                  onPress={() =>
                    router.push(`/(coordinator)/episodes/${data.careEpisode!.id}`)
                  }
                >
                  Open care episode
                </Button>
              ) : null}
            </Section>
          )}

          {isFetching ? (
            <ActivityIndicator color="#0D9488" className="mt-2" />
          ) : null}
        </ScrollView>
      )}

      {/* Doc request modal */}
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
            <Text className="text-lg font-semibold text-stone-900">Request documents</Text>
            <Text className="mt-1 text-sm text-stone-400">
              Ask the family to upload what you need for review.
            </Text>
            <View className="mt-4 gap-3">
              <SelectDropdown
                label="Document type"
                options={DOC_REQUEST_TYPES}
                value={docType}
                onChange={setDocType}
                searchable={false}
              />
              <TextInput
                value={docNote}
                onChangeText={setDocNote}
                multiline
                placeholder="Optional note for the family"
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
                Cancel
              </Button>
              <Button
                className="flex-1"
                isLoading={docRequestMutation.isPending}
                onPress={() => docRequestMutation.mutate()}
              >
                Send request
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject modal */}
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
            <Text className="text-lg font-semibold text-stone-900">Reject intake</Text>
            <Text className="mt-1 text-sm text-stone-400">
              This withdraws the intake. Provide a brief reason for the family record.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Why is this intake being withdrawn?"
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
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                isLoading={rejectMutation.isPending}
                onPress={() => rejectMutation.mutate()}
              >
                Reject
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
