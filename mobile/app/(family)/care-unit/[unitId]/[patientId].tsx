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
  StatusBadge,
} from '../../../../components/ui';
import { FamilyTabHero } from '../../../../components/family/FamilyChrome';
import {
  getCareUnit,
  listPatientRevisions,
  updatePatient,
  type CarePatient,
} from '../../../../lib/api/care';
import { queryClient } from '../../../../lib/query/client';
import { apiErrorMessage } from '../../../../lib/format';
import {
  familyEnumLabel,
  familyEpisodeStatusLabel,
  familyIntakeStatusLabel,
  formatFamilyDate,
  formatFamilyDateTime,
} from '../../../../lib/familyLanguage';
import {
  localizeChip,
  localizeSummaryToken,
} from '../../../../lib/familyWizardDisplay';
import { parseFamilyWizardSummary } from '../../../../lib/familyCareseekerIntake';
import { toastError } from '../../../../lib/toast';

function genderLabel(value: string | null | undefined, t: (key: string) => string) {
  if (!value) return null;
  if (value === 'male') return t('patientDetail.male');
  if (value === 'female') return t('patientDetail.female');
  if (value === 'no_preference') return t('patientDetail.noPreference');
  return value.replace(/_/g, ' ');
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

export default function FamilyCarePatientDetailScreen() {
  const { t } = useTranslation('family');
  const genderOptions = [
    { id: 'male', label: t('patientDetail.male') },
    { id: 'female', label: t('patientDetail.female') },
    { id: 'no_preference', label: t('patientDetail.noPreference') },
  ] as const;
  const { unitId, patientId } = useLocalSearchParams<{
    unitId: string;
    patientId: string;
  }>();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  const unitQuery = useQuery({
    queryKey: ['family-care-unit', unitId],
    enabled: Boolean(unitId),
    queryFn: () => getCareUnit(unitId!),
  });

  const revisionsQuery = useQuery({
    queryKey: ['family-patient-revisions', unitId, patientId],
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
      if (!unitId || !patientId) throw new Error(t('patientDetail.missingPerson'));
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
      queryClient.invalidateQueries({ queryKey: ['family-care-unit', unitId] });
      queryClient.invalidateQueries({
        queryKey: ['family-patient-revisions', unitId, patientId],
      });
      setEditing(false);
      toast.show(t('patientDetail.updated'), { type: 'success' });
    },
    onError: (e) => toastError(toast, e, t('patientDetail.saveFailed')),
  });

  if (unitQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title={t('careUnit.person')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (unitQuery.isError || !unit || !patient) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title={t('careUnit.person')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('patientDetail.notFound')}
          subtitle={unitQuery.error ? apiErrorMessage(unitQuery.error) : undefined}
          action={{ label: t('mobile.common.tryAgain'), onPress: () => void unitQuery.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const revisions = revisionsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <FamilyTabHero title={patient.name} subtitle={unit.name} showBack />

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
          {requestSummary ? (
            <Card shadow>
              <Text className="text-sm font-semibold text-stone-900">
                {t('patientDetail.careRequestLabel')}
              </Text>
              <Text className="mt-0.5 text-xs text-stone-500">
                {t('patientDetail.requestOnboardingHint')}
              </Text>
              <View className="mt-3 gap-3">
                {requestSummary.supportCategories.length > 0 ? (
                  <View>
                    <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                      {t('careUnit.summary.supportNeeded')}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {requestSummary.supportCategories.map((c) => (
                        <Chip
                          key={c}
                          label={localizeSummaryToken('support', c)}
                          tone="teal"
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                {requestSummary.specificNeeds.length > 0 ? (
                  <View>
                    <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                      {t('careUnit.summary.specificNeeds')}
                    </Text>
                    {requestSummary.specificNeeds.map((n) => (
                      <Text key={n} className="text-sm capitalize text-stone-700">
                        • {localizeChip(n)}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <SummaryRow
                  label={t('careUnit.summary.schedule')}
                  value={
                    requestSummary.scheduleType
                      ? localizeSummaryToken('schedule', requestSummary.scheduleType)
                      : null
                  }
                />
                <SummaryRow
                  label={t('careUnit.summary.careLocation')}
                  value={
                    requestSummary.careLocation
                      ? localizeSummaryToken('careLocation', requestSummary.careLocation)
                      : null
                  }
                />
                <SummaryRow
                  label={t('patientDetail.providerPreference')}
                  value={
                    requestSummary.practitionerGender
                      ? localizeSummaryToken('gender', requestSummary.practitionerGender)
                      : null
                  }
                />
                <SummaryRow
                  label={t('careUnit.summary.providerLanguages')}
                  value={
                    requestSummary.providerLanguages.length > 0
                      ? requestSummary.providerLanguages.map((l) => localizeChip(l)).join(', ')
                      : null
                  }
                />
                <SummaryRow
                  label={t('patientDetail.startLabel')}
                  value={
                    requestSummary.startTiming
                      ? localizeChip(requestSummary.startTiming)
                      : null
                  }
                />
                <SummaryRow label={t('careUnit.summary.address')} value={requestSummary.address} />
              </View>
            </Card>
          ) : (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('patientDetail.noRequestLinked')}</Text>
              <View className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push('/(onboarding)/step-1-care-unit')}
                >
                  {t('dashboard.startCareRequest')}
                </Button>
              </View>
            </Card>
          )}

          <Card className="mt-4" shadow>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-stone-900">
                {t('patientDetail.personProfile')}
              </Text>
              {!editing ? (
                <Pressable
                  onPress={() => {
                    setForm(toForm(patient));
                    setEditing(true);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text className="text-sm font-semibold text-teal-700">
                    {t('careUnit.editShort')}
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
                  label={t('patientDetail.dateOfBirthInput')}
                  value={form.dateOfBirth}
                  onChangeText={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
                  placeholder="1958-04-12"
                  autoCapitalize="none"
                />
                <View>
                  <Text className="mb-1 text-sm text-stone-700">{t('patientDetail.gender')}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {genderOptions.map((option) => {
                      const selected = form.gender === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          onPress={() =>
                            setForm((f) => ({
                              ...f,
                              gender: selected ? '' : option.id,
                            }))
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
                  label={t('patientDetail.pointOfContactPhone')}
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
                      {t('careUnit.cancel')}
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      isLoading={saveMutation.isPending}
                      onPress={() => saveMutation.mutate()}
                    >
                      {t('careUnit.save')}
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <View className="mt-3 gap-3">
                <SummaryRow label={t('patientDetail.name')} value={patient.name} />
                <SummaryRow
                  label={t('patientDetail.dateOfBirth')}
                  value={patient.dateOfBirth ? formatFamilyDate(patient.dateOfBirth) : null}
                />
                <SummaryRow
                  label={t('patientDetail.gender')}
                  value={genderLabel(patient.gender, t)}
                />
                <SummaryRow
                  label={t('patientDetail.relationship')}
                  value={
                    patient.relationship
                      ? familyEnumLabel('relationship', patient.relationship)
                      : null
                  }
                />
                <SummaryRow
                  label={t('patientDetail.pointOfContact')}
                  value={
                    [patient.pocName, patient.pocPhone].filter(Boolean).join(' · ') || null
                  }
                />
                {patient.notes ? (
                  <SummaryRow label={t('patientDetail.notes')} value={patient.notes} />
                ) : null}
              </View>
            )}
          </Card>

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('patientDetail.careJourneys')}
          </Text>
          {linkedEpisodes.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('patientDetail.noJourneysForPerson')}</Text>
            </Card>
          ) : (
            linkedEpisodes.map((ep) => (
              <Card
                key={ep.id}
                className="mb-2"
                onPress={() => router.push(`/(family)/episodes/${ep.id}`)}
                shadow={false}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-medium text-stone-900">{ep.title}</Text>
                  <StatusBadge status={ep.status} label={familyEpisodeStatusLabel(ep.status)} />
                </View>
              </Card>
            ))
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('patientDetail.requestHistory')}
          </Text>
          {linkedIntakes.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('patientDetail.noRequests')}</Text>
            </Card>
          ) : (
            linkedIntakes.map((intake) => (
              <Card key={intake.id} className="mb-2" shadow={false}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-sm text-stone-600">
                    {intake.submittedAt
                      ? formatFamilyDateTime(intake.submittedAt)
                      : t('patientDetail.careRequestLabel')}
                  </Text>
                  <StatusBadge
                    status={intake.status}
                    label={familyIntakeStatusLabel(intake.status)}
                  />
                </View>
              </Card>
            ))
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('patientDetail.editHistory')}
          </Text>
          {revisionsQuery.isLoading ? (
            <ActivityIndicator color="#0D9488" className="mt-2" />
          ) : revisions.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('patientDetail.noRevisions')}</Text>
            </Card>
          ) : (
            revisions.map((rev) => {
              const snapName =
                typeof rev.snapshot?.name === 'string' ? rev.snapshot.name : '—';
              const summary = rev.changeSummary
                ? rev.changeSummary
                    .replace(/^Updated\b/i, t('patientDetail.revisionUpdated'))
                    .replace(/^Created\b/i, t('patientDetail.revisionCreated'))
                    .replace(/^تم التحديث\b/, t('patientDetail.revisionUpdated'))
                    .replace(/^تم الإنشاء\b/, t('patientDetail.revisionCreated'))
                : t('patientDetail.revisionUpdated');
              return (
                <Card key={rev.id} className="mb-2" shadow={false}>
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="flex-1 font-medium text-stone-900">{summary}</Text>
                    <Text className="text-xs text-stone-400">
                      {formatFamilyDateTime(rev.createdAt)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-stone-500">
                    {t('patientDetail.by')}{' '}
                    {rev.changedBy?.name ||
                      rev.changedBy?.email ||
                      t('patientDetail.unknown')}
                  </Text>
                  <Text className="mt-1.5 text-sm text-stone-700">
                    {t('patientDetail.snapshot')}: {snapName}
                  </Text>
                </Card>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </Text>
      <Text className="mt-0.5 text-base text-stone-900">{value || '—'}</Text>
    </View>
  );
}
