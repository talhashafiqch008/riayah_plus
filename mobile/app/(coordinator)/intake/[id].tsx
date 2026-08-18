import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { apiClient } from '../../../lib/api/client';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { queryClient } from '../../../lib/query/client';
import { toastError } from '../../../lib/toast';

type ServiceCategory =
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'behavioral_support'
  | 'physiotherapy'
  | 'nursing'
  | 'companion_care';

interface IntakeDocument {
  id: string;
  name: string;
  category?: string | null;
  mimeType?: string | null;
  url?: string;
  createdAt?: string;
}

interface IntakeDetail {
  id: string;
  status: string;
  urgencyLevel?: string | null;
  reasonForCare: string;
  medicalHistory?: string | null;
  currentMeds?: string | null;
  diagnoses: string[];
  serviceInterests?: ServiceCategory[];
  primaryCaregiverName?: string | null;
  primaryCaregiverPhone?: string | null;
  primaryCaregiverRelation?: string | null;
  submittedAt?: string;
  wizardPayload?: Record<string, unknown> | null;
  careUnit?: { id: string; name: string } | null;
  careRecipient?: {
    id: string;
    name: string;
    dateOfBirth?: string | null;
    gender?: string | null;
  } | null;
  familyUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  careEpisode?: { id: string; title?: string; status?: string } | null;
  documents?: IntakeDocument[];
}

const CONCERN_OPTIONS = [
  'falls risk',
  'mobility',
  'medication management',
  'cognitive decline',
  'pain',
  'caregiver burnout',
  'post-discharge support',
];

const SERVICE_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'occupational_therapy', label: 'Occupational therapy' },
  { value: 'speech_therapy', label: 'Speech therapy' },
  { value: 'behavioral_support', label: 'Behavioral support' },
  { value: 'companion_care', label: 'Companion care' },
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

function defaultUrgencyIndicator(level?: string | null): string {
  if (level === 'urgent' || level === 'high') return 'worsening_symptoms';
  if (level === 'medium') return 'time_sensitive_therapy';
  return 'no_informal_support';
}

export default function CoordinatorIntakeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [keyConcerns, setKeyConcerns] = useState<string[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<ServiceCategory[]>([]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['intake', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient.get<{ data: IntakeDetail }>(`/api/intake/${id}`);
      return res.data.data;
    },
  });

  const openApprove = useCallback(() => {
    if (!data) return;
    setNotes('');
    setKeyConcerns([]);
    setSuggestedServices(
      (data.serviceInterests?.length
        ? data.serviceInterests
        : (['nursing'] as ServiceCategory[])),
    );
    setApproveOpen(true);
  }, [data]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = notes.trim();
      if (trimmed.length < 10) {
        throw new Error('Notes must be at least 10 characters');
      }
      const concerns =
        keyConcerns.length > 0
          ? keyConcerns
          : data?.diagnoses?.length
            ? data.diagnoses.slice(0, 3)
            : ['general care needs'];
      const services =
        suggestedServices.length > 0
          ? suggestedServices
          : (['nursing'] as ServiceCategory[]);

      const res = await apiClient.post<{
        data: {
          intake: IntakeDetail;
          episode: { id: string } | null;
        };
      }>(`/api/intake/${id}/review`, {
        keyConcerns: concerns,
        urgencyIndicators: [defaultUrgencyIndicator(data?.urgencyLevel)],
        suggestedServiceCategories: services,
        riskFlags: [],
        notes: trimmed,
        createEpisode: true,
      });
      return res.data.data;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
      void queryClient.invalidateQueries({ queryKey: ['intake', id] });
      toast.show('Intake approved', { type: 'success' });
      setApproveOpen(false);
      const episodeId = result.episode?.id ?? result.intake.careEpisode?.id;
      if (episodeId) {
        router.replace(`/(coordinator)/episodes/${episodeId}`);
      } else {
        router.back();
      }
    },
    onError: (e) => {
      toastError(toast, e);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const reason = rejectReason.trim();
      if (reason.length < 5) {
        throw new Error('Please provide a reason (min 5 characters)');
      }
      const res = await apiClient.patch(`/api/intake/${id}/status`, {
        status: 'withdrawn',
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
      void queryClient.invalidateQueries({ queryKey: ['intake', id] });
      toast.show('Intake rejected', { type: 'success' });
      setRejectOpen(false);
      router.back();
    },
    onError: (e) => {
      toastError(toast, e);
    },
  });

  const allergies = useMemo(() => {
    const payload = data?.wizardPayload ?? {};
    return asStringList(payload.allergies ?? payload.allergyList);
  }, [data?.wizardPayload]);

  const openDocument = async (doc: IntakeDocument) => {
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
  };

  const canAct = data ? REVIEWABLE.has(data.status) : false;
  const patientName = data?.careRecipient?.name ?? 'Patient';
  const caregiverName =
    data?.primaryCaregiverName ?? data?.familyUser?.name ?? null;

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
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
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
            </Section>
          </ScrollView>

          <View className="border-t border-stone-100 bg-white px-4 py-3">
            {canAct ? (
              <View className="flex-row gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onPress={() => {
                    setRejectReason('');
                    setRejectOpen(true);
                  }}
                >
                  Reject
                </Button>
                <Button className="flex-1" onPress={openApprove}>
                  Approve
                </Button>
              </View>
            ) : (
              <View className="items-center py-1">
                <StatusBadge status={data.status} size="md" />
              </View>
            )}
          </View>
        </>
      )}

      {/* Approve modal */}
      <Modal visible={approveOpen} animationType="slide" transparent onRequestClose={() => setApproveOpen(false)}>
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-stone-200" />
            <Text className="text-lg font-semibold text-stone-900">Approve & create episode</Text>
            <Text className="mt-1 text-sm text-stone-400">
              Add review notes (min 10 characters). Concerns are optional.
            </Text>

            <ScrollView
              className="mt-4"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Key concerns
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {CONCERN_OPTIONS.map((c) => (
                  <ChipToggle
                    key={c}
                    label={c}
                    selected={keyConcerns.includes(c)}
                    onToggle={() =>
                      setKeyConcerns((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                      )
                    }
                  />
                ))}
              </View>

              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Suggested services
              </Text>
              <View className="mb-4 flex-row flex-wrap">
                {SERVICE_OPTIONS.map((s) => (
                  <ChipToggle
                    key={s.value}
                    label={s.label}
                    selected={suggestedServices.includes(s.value)}
                    onToggle={() =>
                      setSuggestedServices((prev) =>
                        prev.includes(s.value)
                          ? prev.filter((x) => x !== s.value)
                          : [...prev, s.value],
                      )
                    }
                  />
                ))}
              </View>

              <Text className="mb-1 text-sm text-stone-700">Reviewer notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Summarise clinical rationale (min 10 characters)"
                placeholderTextColor="#A8A29E"
                className="min-h-[96px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
              />
              <Text className="mt-1 text-xs text-stone-400">{notes.trim().length}/10 min</Text>
            </ScrollView>

            <View className="mt-4 flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => setApproveOpen(false)}
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                isLoading={approveMutation.isPending}
                onPress={() => approveMutation.mutate()}
              >
                Confirm
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject modal */}
      <Modal visible={rejectOpen} animationType="slide" transparent onRequestClose={() => setRejectOpen(false)}>
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

            <Text className="mb-1 mt-4 text-sm text-stone-700">Reason</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Why is this intake being withdrawn?"
              placeholderTextColor="#A8A29E"
              className="min-h-[80px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
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
