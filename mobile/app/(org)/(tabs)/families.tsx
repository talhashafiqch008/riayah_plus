import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, Input, ScreenHeader } from '../../../components/ui';
import {
  assignOrgFamilyCoordinator,
  listOrgCoordinators,
  listOrgFamilies,
  type OrgCoordinator,
  type OrgFamily,
} from '../../../lib/api/org';
import { apiErrorMessage } from '../../../lib/format';

function coordinatorLabel(
  family: OrgFamily,
  coords: OrgCoordinator[],
  unassigned: string,
  assignedFallback: string,
): string {
  if (!family.assignedCoordinatorId) return unassigned;
  return (
    family.assignedCoordinator?.name ??
    coords.find((c) => c.id === family.assignedCoordinatorId)?.name ??
    assignedFallback
  );
}

export default function OrgFamiliesScreen() {
  const { t } = useTranslation('org');
  const toast = useToast();
  const qc = useQueryClient();
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const familiesQuery = useQuery({
    queryKey: ['org-families'],
    queryFn: listOrgFamilies,
  });

  const coordsQuery = useQuery({
    queryKey: ['org-coordinators'],
    queryFn: listOrgCoordinators,
  });

  const coords = (coordsQuery.data ?? []).filter((c) => c.isActive);
  const families = familiesQuery.data ?? [];
  const pickingFamily = families.find((f) => f.id === pickerFor) ?? null;

  const filteredCoords = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return coords;
    return coords.filter((c) =>
      [c.name, c.email].some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }, [coords, pickerSearch]);

  const assignMutation = useMutation({
    mutationFn: ({
      familyId,
      coordinatorId,
    }: {
      familyId: string;
      coordinatorId: string | null;
    }) => assignOrgFamilyCoordinator(familyId, coordinatorId),
    onSuccess: async (_data, vars) => {
      setRowError((prev) => {
        const next = { ...prev };
        delete next[vars.familyId];
        return next;
      });
      toast.show(
        vars.coordinatorId ? t('families.assignedToast') : t('families.clearedToast'),
        { type: 'success' },
      );
      await qc.invalidateQueries({ queryKey: ['org-families'] });
      await qc.invalidateQueries({ queryKey: ['org-dashboard'] });
      await qc.invalidateQueries({ queryKey: ['org-pending-intakes'] });
    },
    onError: (e, vars) => {
      const msg = apiErrorMessage(e, t('families.assignFailed'));
      setRowError((prev) => ({ ...prev, [vars.familyId]: msg }));
      toast.show(msg, { type: 'danger' });
    },
  });

  const closePicker = () => {
    setPickerFor(null);
    setPickerSearch('');
  };

  const pick = (coordinatorId: string | null) => {
    if (!pickerFor) return;
    const family = families.find((f) => f.id === pickerFor);
    const current = family?.assignedCoordinatorId ?? null;
    closePicker();
    if (current === coordinatorId) return;
    assignMutation.mutate({ familyId: pickerFor, coordinatorId });
  };

  const loading = familiesQuery.isLoading || coordsQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={t('families.title')}
        subtitle={t('mobile.families.subtitle')}
        showBack={false}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : familiesQuery.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('mobile.families.loadError')}
          subtitle={apiErrorMessage(familiesQuery.error)}
          action={{
            label: t('mobile.shell.tryAgain'),
            onPress: () => void familiesQuery.refetch(),
          }}
        />
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={familiesQuery.isFetching && !familiesQuery.isLoading}
              onRefresh={() => {
                void familiesQuery.refetch();
                void coordsQuery.refetch();
              }}
              tintColor="#0D9488"
            />
          }
          ListHeaderComponent={
            <Text className="mb-4 text-sm text-stone-500">{t('families.description')}</Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={t('mobile.families.emptyTitle')}
              subtitle={t('families.empty')}
            />
          }
          renderItem={({ item }) => {
            const err = rowError[item.id];
            const saving =
              assignMutation.isPending && assignMutation.variables?.familyId === item.id;
            const label = coordinatorLabel(
              item,
              coords,
              t('common.unassigned'),
              t('mobile.families.assignedFallback'),
            );
            const assigned = Boolean(item.assignedCoordinatorId);
            return (
              <Card className="mb-3" shadow>
                <Text className="font-semibold text-stone-900">{item.name}</Text>
                <Text className="mt-0.5 text-sm text-stone-500">{item.email}</Text>
                <Text className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {t('families.colCoordinator')}
                </Text>
                <Pressable
                  disabled={saving}
                  onPress={() => setPickerFor(item.id)}
                  className={`flex-row items-center justify-between rounded-xl border bg-white px-3 py-2.5 ${
                    assigned ? 'border-stone-200' : 'border-stone-200'
                  } ${saving ? 'opacity-50' : ''}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('mobile.families.selectA11y')}
                >
                  <Text
                    className={`flex-1 text-sm ${
                      assigned ? 'text-stone-800' : 'text-stone-400'
                    }`}
                    numberOfLines={1}
                  >
                    {saving ? t('mobile.shell.saving') : label}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#A8A29E" />
                </Pressable>
                {err ? <Text className="mt-1 text-sm text-red-600">{err}</Text> : null}
              </Card>
            );
          }}
        />
      )}

      <Modal
        visible={Boolean(pickerFor)}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={closePicker}>
          <Pressable
            className="max-h-[70%] rounded-t-3xl bg-white"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
              <Text className="text-base font-semibold text-stone-900">
                {pickingFamily
                  ? t('mobile.families.pickerTitleNamed', { name: pickingFamily.name })
                  : t('mobile.families.pickerTitle')}
              </Text>
              <Pressable onPress={closePicker} hitSlop={12}>
                <Ionicons name="close" size={22} color="#57534E" />
              </Pressable>
            </View>
            <View className="px-4 pt-3">
              <Input
                placeholder={t('mobile.families.searchPlaceholder')}
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCorrect={false}
                autoCapitalize="none"
                leftIcon={<Ionicons name="search-outline" size={18} color="#A8A29E" />}
              />
            </View>
            <FlatList
              data={filteredCoords}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              ListHeaderComponent={
                <Pressable
                  onPress={() => pick(null)}
                  className={`mb-1 flex-row items-center justify-between rounded-xl px-3 py-3 ${
                    pickingFamily && !pickingFamily.assignedCoordinatorId ? 'bg-teal-50' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      pickingFamily && !pickingFamily.assignedCoordinatorId
                        ? 'text-teal-800'
                        : 'text-stone-800'
                    }`}
                  >
                    {t('common.unassigned')}
                  </Text>
                  {pickingFamily && !pickingFamily.assignedCoordinatorId ? (
                    <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                  ) : null}
                </Pressable>
              }
              ListEmptyComponent={
                <Text className="p-4 text-sm text-stone-500">
                  {coords.length === 0
                    ? t('mobile.families.noActive')
                    : t('mobile.families.noSearchMatch')}
                </Text>
              }
              renderItem={({ item: c }) => {
                const selected = pickingFamily?.assignedCoordinatorId === c.id;
                return (
                  <Pressable
                    onPress={() => pick(c.id)}
                    className={`mb-1 flex-row items-center justify-between rounded-xl px-3 py-3 ${
                      selected ? 'bg-teal-50' : ''
                    }`}
                  >
                    <View className="flex-1 pr-3">
                      <Text
                        className={`text-sm font-medium ${
                          selected ? 'text-teal-800' : 'text-stone-800'
                        }`}
                      >
                        {c.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-stone-500">{c.email}</Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
