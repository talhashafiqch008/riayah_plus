import { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  StatusBadge,
} from '../../../components/ui';
import { FamilyTabHero } from '../../../components/family/FamilyChrome';
import {
  formatCountry,
  getCareUnit,
  updateCareUnit,
  type CareUnit,
} from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { familyEpisodeStatusLabel, familyIntakeStatusLabel } from '../../../lib/familyLanguage';
import { parseFamilyWizardSummary } from '../../../lib/familyCareseekerIntake';
import { toastError } from '../../../lib/toast';

type UnitForm = {
  name: string;
  primaryCaregiverName: string;
  primaryCaregiverPhone: string;
  primaryCaregiverRelation: string;
  city: string;
  address: string;
};

function toForm(unit: CareUnit): UnitForm {
  return {
    name: unit.name ?? '',
    primaryCaregiverName: unit.primaryCaregiverName ?? '',
    primaryCaregiverPhone: unit.primaryCaregiverPhone ?? '',
    primaryCaregiverRelation: unit.primaryCaregiverRelation ?? '',
    city: unit.city ?? '',
    address: unit.address ?? '',
  };
}

export default function FamilyCareUnitDetailScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UnitForm>({
    name: '',
    primaryCaregiverName: '',
    primaryCaregiverPhone: '',
    primaryCaregiverRelation: '',
    city: '',
    address: '',
  });

  const query = useQuery({
    queryKey: ['family-care-unit', unitId],
    enabled: Boolean(unitId),
    queryFn: () => getCareUnit(unitId!),
  });

  const unit = query.data;

  useEffect(() => {
    if (unit && !editing) setForm(toForm(unit));
  }, [unit, editing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!unitId) throw new Error('Missing care unit');
      if (!form.name.trim()) throw new Error('Care unit name is required');
      return updateCareUnit(unitId, {
        name: form.name.trim(),
        primaryCaregiverName: form.primaryCaregiverName.trim() || undefined,
        primaryCaregiverPhone: form.primaryCaregiverPhone.trim() || undefined,
        primaryCaregiverRelation: form.primaryCaregiverRelation.trim() || undefined,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-care-unit', unitId] });
      queryClient.invalidateQueries({ queryKey: ['family-care-units'] });
      setEditing(false);
      toast.show('Care unit updated', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Save failed'),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title="Care unit" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !unit) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title="Care unit" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Care unit not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const patients = unit.careRecipients ?? [];
  const episodes = unit.careEpisodes ?? [];
  const intakes = unit.intakeRecords ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <FamilyTabHero title={unit.name} subtitle="Household" showBack />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <Text className="text-sm text-stone-500">
            {patients.length} {patients.length === 1 ? 'person' : 'people'} needing care · open a
            person below to see their care request
          </Text>

          <Card className="mt-4" shadow>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-stone-900">Household details</Text>
              {!editing ? (
                <Pressable
                  onPress={() => {
                    setForm(toForm(unit));
                    setEditing(true);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
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
                  label="Account holder"
                  value={form.primaryCaregiverName}
                  onChangeText={(v) => setForm((f) => ({ ...f, primaryCaregiverName: v }))}
                />
                <Input
                  label="Phone"
                  value={form.primaryCaregiverPhone}
                  onChangeText={(v) => setForm((f) => ({ ...f, primaryCaregiverPhone: v }))}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Relation"
                  value={form.primaryCaregiverRelation}
                  onChangeText={(v) => setForm((f) => ({ ...f, primaryCaregiverRelation: v }))}
                />
                <Input
                  label="City"
                  value={form.city}
                  onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                />
                <Input
                  label="Address"
                  value={form.address}
                  onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setEditing(false);
                        setForm(toForm(unit));
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
                <DetailRow label="Account holder" value={unit.primaryCaregiverName} />
                <DetailRow label="Phone" value={unit.primaryCaregiverPhone} />
                <DetailRow label="Relation" value={unit.primaryCaregiverRelation} />
                <DetailRow
                  label="Location"
                  value={
                    [unit.address, unit.city, formatCountry(unit.country)]
                      .filter(Boolean)
                      .join(', ') || null
                  }
                />
              </View>
            )}
          </Card>

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Who needs care
          </Text>
          <Text className="mb-3 text-sm text-stone-500">
            Open a person to view their individual care request.
          </Text>

          {patients.length === 0 ? (
            <Card shadow={false}>
              <EmptyState
                icon="person-outline"
                title="No care recipient yet"
                subtitle="Submit a care request from onboarding."
                action={{
                  label: 'Start a care request',
                  onPress: () => router.push('/(onboarding)/step-1-care-unit'),
                }}
              />
            </Card>
          ) : (
            patients.map((patient) => {
              const intake = intakes.find((i) => i.careRecipientId === patient.id);
              const summary = parseFamilyWizardSummary(intake?.wizardPayload);
              const meta = [
                patient.relationship,
                patient.dateOfBirth ? `DOB ${formatDate(patient.dateOfBirth)}` : null,
                summary?.supportCategories?.length
                  ? summary.supportCategories.join(', ')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <Card
                  key={patient.id}
                  className="mb-3"
                  onPress={() =>
                    router.push(`/(family)/care-unit/${unit.id}/${patient.id}`)
                  }
                  shadow
                >
                  <View className="flex-row items-start gap-3">
                    <View className="mt-0.5 rounded-xl bg-stone-100 p-2">
                      <Ionicons name="person-outline" size={18} color="#57534E" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="font-semibold text-stone-900">{patient.name}</Text>
                        {intake ? (
                          <StatusBadge
                            status={intake.status}
                            label={familyIntakeStatusLabel(intake.status)}
                          />
                        ) : null}
                      </View>
                      <Text className="mt-0.5 text-sm text-stone-500">
                        {meta || 'Open to view care request'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
                  </View>
                </Card>
              );
            })
          )}

          {episodes.length > 0 ? (
            <>
              <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Care journeys
              </Text>
              {episodes.map((ep) => (
                <Card
                  key={ep.id}
                  className="mb-2"
                  onPress={() => router.push(`/(family)/episodes/${ep.id}`)}
                  shadow={false}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-medium text-stone-900">{ep.title}</Text>
                    <Chip label={familyEpisodeStatusLabel(ep.status)} tone="green" />
                  </View>
                </Card>
              ))}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </Text>
      <Text className="mt-0.5 text-base text-stone-900">{value || '—'}</Text>
    </View>
  );
}
