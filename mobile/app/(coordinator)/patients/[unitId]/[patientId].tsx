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
import { useTranslation } from 'react-i18next';
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
  getCareUnit,
  listPatientRevisions,
  updatePatient,
  type CarePatient,
} from '../../../../lib/api/care';
import { queryClient } from '../../../../lib/query/client';
import { apiErrorMessage, formatDate, formatDateTime } from '../../../../lib/format';
import { parseFamilyWizardSummary } from '../../../../lib/familyCareseekerIntake';
import { toastError } from '../../../../lib/toast';

const GENDER_IDS = ['male', 'female', 'no_preference'] as const;

function episodeStatusLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  status: string,
) {
  return t(`episodes.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
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
  const { t } = useTranslation('coordinator');
  const { unitId, patientId } = useLocalSearchParams<{
    unitId: string;
    patientId: string;
  }>();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  const genderLabel = (value?: string | null) => {
    if (!value) return null;
    if (value === 'male') return t('patientDetail.male');
    if (value === 'female') return t('patientDetail.female');
    if (value === 'no_preference') return t('patientDetail.noPreference');
    return value;
  };

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
      if (!form.name.trim()) throw new Error(t('patientDetail.nameRequired'));
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
      toast.show(t('patientDetail.profileUpdated'), { type: 'success' });
    },
    onError: (e) => toastError(toast, e, t('patientDetail.saveFailed')),
  });

  if (unitQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('intake.detail.patient')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (unitQuery.isError || !unit || !patient) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('intake.detail.patient')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('patientDetail.notFound')}
          subtitle={unitQuery.error ? apiErrorMessage(unitQuery.error) : undefined}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void unitQuery.refetch() }}
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
                label={t(`intake.status.${linkedIntakes[0].status}`, {
                  defaultValue: linkedIntakes[0].status.replace(/_/g, ' '),
                })}
              />
            </View>
          ) : null}

          {requestSummary ? (
            <Card shadow>
              <Text className="text-sm font-semibold text-stone-900">
                {t('mobile.detail.careRequest')}
              </Text>
              <View className="mt-3 gap-3">
                {requestSummary.supportCategories.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {requestSummary.supportCategories.map((c) => (
                      <Chip key={c} label={c} tone="teal" />
                    ))}
                  </View>
                ) : null}
                <SummaryRow
                  label={t('intake.detail.fields.schedule')}
                  value={requestSummary.scheduleType}
                />
                <SummaryRow
                  label={t('intake.detail.fields.careLocation')}
                  value={requestSummary.careLocation}
                />
                <SummaryRow
                  label={t('intake.detail.fields.startTiming')}
                  value={requestSummary.startTiming}
                />
              </View>
            </Card>
          ) : (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('mobile.detail.noCareRequestLinked')}</Text>
            </Card>
          )}

          <Card className="mt-4" shadow>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-stone-900">
                {t('patientDetail.profile')}
              </Text>
              {!editing ? (
                <Pressable
                  onPress={() => {
                    setForm(toForm(patient));
                    setEditing(true);
                  }}
                  hitSlop={8}
                >
                  <Text className="text-sm font-semibold text-teal-700">
                    {t('mobile.profile.edit')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {editing ? (
              <View className="mt-3 gap-3">
                <Input
                  label={t('patientDetail.name')}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <Input
                  label={t('patientDetail.dateOfBirth')}
                  value={form.dateOfBirth}
                  onChangeText={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
                  placeholder={t('patientDetail.dateOfBirthPlaceholder')}
                  autoCapitalize="none"
                />
                <View>
                  <Text className="mb-1 text-sm text-stone-700">{t('patientDetail.gender')}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {GENDER_IDS.map((id) => {
                      const selected = form.gender === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() =>
                            setForm((f) => ({ ...f, gender: selected ? '' : id }))
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
                            {genderLabel(id)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <Input
                  label={t('patientDetail.relationship')}
                  value={form.relationship}
                  onChangeText={(v) => setForm((f) => ({ ...f, relationship: v }))}
                />
                <Input
                  label={t('patientDetail.pointOfContact')}
                  value={form.pocName}
                  onChangeText={(v) => setForm((f) => ({ ...f, pocName: v }))}
                />
                <Input
                  label={t('patients.phone')}
                  value={form.pocPhone}
                  onChangeText={(v) => setForm((f) => ({ ...f, pocPhone: v }))}
                  keyboardType="phone-pad"
                />
                <Input
                  label={t('patientDetail.notes')}
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
                      {t('common.cancel')}
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      isLoading={saveMutation.isPending}
                      onPress={() => saveMutation.mutate()}
                    >
                      {t('common.save')}
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <View className="mt-3 gap-3">
                <SummaryRow
                  label={t('patientDetail.dateOfBirth')}
                  value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null}
                />
                <SummaryRow label={t('patientDetail.gender')} value={genderLabel(patient.gender)} />
                <SummaryRow label={t('patientDetail.relationship')} value={patient.relationship} />
                <SummaryRow label={t('patientDetail.pointOfContact')} value={patient.pocName} />
                <SummaryRow label={t('patients.phone')} value={patient.pocPhone} />
                <SummaryRow label={t('patientDetail.notes')} value={patient.notes} />
              </View>
            )}
          </Card>

          {linkedEpisodes.length > 0 ? (
            <>
              <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('patientDetail.linkedEpisodes')}
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
                    <Chip label={episodeStatusLabel(t, ep.status)} tone="green" />
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          {revisions.length > 0 ? (
            <>
              <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('patientDetail.editHistory')}
              </Text>
              {revisions.map((rev) => (
                <Card key={rev.id} className="mb-2" shadow={false}>
                  <Text className="text-sm font-medium text-stone-800">
                    {rev.changeSummary || t('mobile.detail.profileChangeFallback')}
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
