import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  ScreenHeader,
  StatusBadge,
} from '../../../../components/ui';
import {
  episodeStatusLabel,
  getCareUnit,
  listPatientRevisions,
  updatePatient,
  type CarePatient,
} from '../../../../lib/api/care';
import { queryClient } from '../../../../lib/query/client';
import { apiErrorMessage, formatDate, formatDateTime } from '../../../../lib/format';
import { familyIntakeStatusLabel } from '../../../../lib/familyLanguage';
import { parseFamilyWizardSummary } from '../../../../lib/familyCareseekerIntake';
import { toastError } from '../../../../lib/toast';

const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'no_preference', label: 'No Preference' },
] as const;

function genderLabel(value?: string | null) {
  if (!value) return null;
  return GENDER_OPTIONS.find((o) => o.id === value)?.label ?? value;
}

type ProfileForm = {
  name: string;
  dateOfBirth: string;
  gender: string;
  relationship: string;
  pocName: string;
  pocPhone: string;
  notes: string;
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toISOString().slice(0, 10);
}

function toForm(patient: CarePatient): ProfileForm {
  return {
    name: patient.name ?? '',
    dateOfBirth: toDateInput(patient.dateOfBirth),
    gender: patient.gender ?? '',
    relationship: patient.relationship ?? '',
    pocName: patient.pocName ?? '',
    pocPhone: patient.pocPhone ?? '',
    notes: patient.notes ?? '',
  };
}

const EMPTY_FORM: ProfileForm = {
  name: '',
  dateOfBirth: '',
  gender: '',
  relationship: '',
  pocName: '',
  pocPhone: '',
  notes: '',
};

export default function CoordinatorPatientDetailScreen() {
  const { unitId, patientId } = useLocalSearchParams<{
    unitId: string;
    patientId: string;
  }>();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  const unitQuery = useQuery({
    queryKey: ['coordinator-care-unit', unitId],
    enabled: Boolean(unitId),
    queryFn: () => getCareUnit(unitId!),
  });

  const revisionsQuery = useQuery({
    queryKey: ['coordinator-patient-revisions', unitId, patientId],
    enabled: Boolean(unitId && patientId),
    queryFn: () => listPatientRevisions(unitId!, patientId!),
  });

  const unit = unitQuery.data;
  const patient = useMemo(
    () => (unit?.careRecipients ?? []).find((p) => p.id === patientId) ?? null,
    [unit, patientId],
  );

  useEffect(() => {
    if (patient && !editing) setForm(toForm(patient));
  }, [patient, editing]);

  const linkedEpisodes = useMemo(
    () => (unit?.careEpisodes ?? []).filter((ep) => ep.careRecipientId === patientId),
    [unit, patientId],
  );

  const linkedIntakes = useMemo(
    () => (unit?.intakeRecords ?? []).filter((i) => i.careRecipientId === patientId),
    [unit, patientId],
  );

  const requestSummary = parseFamilyWizardSummary(linkedIntakes[0]?.wizardPayload);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!unitId || !patientId) throw new Error('Missing patient');
      if (!form.name.trim()) throw new Error('Name is required');
      return updatePatient(unitId, patientId, {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        gender: form.gender.trim() || undefined,
        relationship: form.relationship.trim() || undefined,
        pocName: form.pocName.trim() || undefined,
        pocPhone: form.pocPhone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-care-unit', unitId] });
      queryClient.invalidateQueries({
        queryKey: ['coordinator-patient-revisions', unitId, patientId],
      });
      setEditing(false);
      toast.show('Patient profile updated', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Save failed'),
  });

  if (unitQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Patient" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (unitQuery.isError || !unit || !patient) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Patient" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Patient not found"
          subtitle={unitQuery.error ? apiErrorMessage(unitQuery.error) : undefined}
          action={{ label: 'Try again', onPress: () => void unitQuery.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const revisions = revisionsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={patient.name} subtitle={unit.name} showBack />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={unitQuery.isFetching && !unitQuery.isLoading}
              onRefresh={() => {
                void unitQuery.refetch();
                void revisionsQuery.refetch();
              }}
              tintColor="#0D9488"
            />
          }
        >
          {linkedIntakes[0] ? (
            <View className="mb-3">
              <StatusBadge
                status={linkedIntakes[0].status}
                label={familyIntakeStatusLabel(linkedIntakes[0].status)}
              />
            </View>
          ) : null}

          {requestSummary ? (
            <Card shadow>
              <Text className="text-sm font-semibold text-stone-900">Care request</Text>
              <View className="mt-3 gap-3">
                {requestSummary.supportCategories.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {requestSummary.supportCategories.map((c) => (
                      <Chip key={c} label={c} tone="teal" />
                    ))}
                  </View>
                ) : null}
                <SummaryRow label="Schedule" value={requestSummary.scheduleType} />
                <SummaryRow label="Care location" value={requestSummary.careLocation} />
                <SummaryRow label="Start" value={requestSummary.startTiming} />
              </View>
            </Card>
          ) : (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">No care request linked yet.</Text>
            </Card>
          )}

          <Card className="mt-4" shadow>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-stone-900">Patient profile</Text>
              {!editing ? (
                <Pressable
                  onPress={() => {
                    setForm(toForm(patient));
                    setEditing(true);
                  }}
                  hitSlop={8}
                >
                  <Text className="text-sm font-semibold text-teal-700">Edit</Text>
                </Pressable>
              ) : null}
            </View>

            {editing ? (
              <View className="mt-3 gap-3">
                <Input
                  label="Name"
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <Input
                  label="Date of birth (YYYY-MM-DD)"
                  value={form.dateOfBirth}
                  onChangeText={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
                  placeholder="1958-04-12"
                  autoCapitalize="none"
                />
                <View>
                  <Text className="mb-1 text-sm text-stone-700">Gender</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {GENDER_OPTIONS.map((option) => {
                      const selected = form.gender === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          onPress={() =>
                            setForm((f) => ({ ...f, gender: selected ? '' : option.id }))
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
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <Input
                  label="Relationship"
                  value={form.relationship}
                  onChangeText={(v) => setForm((f) => ({ ...f, relationship: v }))}
                />
                <Input
                  label="Point of contact"
                  value={form.pocName}
                  onChangeText={(v) => setForm((f) => ({ ...f, pocName: v }))}
                />
                <Input
                  label="Phone"
                  value={form.pocPhone}
                  onChangeText={(v) => setForm((f) => ({ ...f, pocPhone: v }))}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Notes"
                  value={form.notes}
                  onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                  multiline
                  numberOfLines={4}
                  className="min-h-[88px]"
                  textAlignVertical="top"
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setEditing(false);
                        setForm(toForm(patient));
                      }}
                    >
                      Cancel
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      isLoading={saveMutation.isPending}
                      onPress={() => saveMutation.mutate()}
                    >
                      Save
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <View className="mt-3 gap-3">
                <SummaryRow
                  label="Date of birth"
                  value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null}
                />
                <SummaryRow label="Gender" value={genderLabel(patient.gender)} />
                <SummaryRow label="Relationship" value={patient.relationship} />
                <SummaryRow label="Point of contact" value={patient.pocName} />
                <SummaryRow label="Phone" value={patient.pocPhone} />
                <SummaryRow label="Notes" value={patient.notes} />
              </View>
            )}
          </Card>

          {linkedEpisodes.length > 0 ? (
            <>
              <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Episodes
              </Text>
              {linkedEpisodes.map((ep) => (
                <Card
                  key={ep.id}
                  className="mb-2"
                  onPress={() => router.push(`/(coordinator)/episodes/${ep.id}`)}
                  shadow={false}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-medium text-stone-900">{ep.title}</Text>
                    <Chip label={episodeStatusLabel(ep.status)} tone="green" />
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {revisions.length > 0 ? (
            <>
              <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Profile history
              </Text>
              {revisions.map((rev) => (
                <Card key={rev.id} className="mb-2" shadow={false}>
                  <Text className="text-sm font-medium text-stone-800">
                    {rev.changeSummary || 'Profile updated'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-stone-500">
                    {rev.changedBy?.name ? `${rev.changedBy.name} · ` : ''}
                    {formatDateTime(rev.createdAt)}
                  </Text>
                </Card>
              ))}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </Text>
      <Text className="mt-0.5 text-base text-stone-900">{value}</Text>
    </View>
  );
}
