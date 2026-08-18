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
import { Ionicons } from '@expo/vector-icons';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { Button, Card, EmptyState, Input } from '../../../components/ui';
import {
  assignFamilyOrganization,
  fetchAdminFamilies,
  fetchAdminOrganizations,
  unwrapList,
} from '../../../lib/api/admin';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

type FamilyRow = {
  id: string;
  name?: string;
  email?: string;
  organizationId?: string | null;
  createdAt?: string;
  organization?: { id: string; name?: string } | null;
};

type OrgOption = { id: string; name?: string };

function unwrapFamilies(payload: unknown): FamilyRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.families ?? p;
  return Array.isArray(raw) ? (raw as FamilyRow[]) : [];
}

export default function AdminFamiliesScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const familiesQuery = useQuery({
    queryKey: ['admin-families', unassignedOnly],
    queryFn: async () =>
      unwrapFamilies(await fetchAdminFamilies({ unassigned: unassignedOnly, limit: 100 })),
  });

  const orgsQuery = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => unwrapList<OrgOption>(await fetchAdminOrganizations()),
  });

  const assignMutation = useMutation({
    mutationFn: ({ familyId, organizationId }: { familyId: string; organizationId: string }) =>
      assignFamilyOrganization(familyId, organizationId),
    onSuccess: async () => {
      toast.show('Organization assigned. Family can now log in.', { type: 'success' });
      await qc.invalidateQueries({ queryKey: ['admin-families'] });
    },
    onError: (e) => toastError(toast, e, 'Assignment failed'),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return familiesQuery.data ?? [];
    return (familiesQuery.data ?? []).filter((f) =>
      [f.name, f.email, f.organization?.name].some((v) =>
        String(v ?? '').toLowerCase().includes(q),
      ),
    );
  }, [familiesQuery.data, search]);

  const orgs = orgsQuery.data ?? [];
  const pickingOrgName = pickerFor
    ? orgs.find((o) => o.id === selectedOrg[pickerFor])?.name
    : undefined;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader
        title="Families"
        subtitle="Assign self-registered families to an org"
      />

      <View className="border-b border-stone-100 bg-white px-4 py-3">
        <Pressable
          onPress={() => setUnassignedOnly((v) => !v)}
          className="mb-3 flex-row items-center gap-3"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: unassignedOnly }}
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              unassignedOnly ? 'border-teal-600 bg-teal-600' : 'border-stone-300 bg-white'
            }`}
          >
            {unassignedOnly ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : null}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-stone-800">Unassigned only</Text>
            <Text className="text-xs text-stone-500">
              Uncheck to see every family (with and without an org)
            </Text>
          </View>
        </Pressable>
        <Input
          placeholder="Search name or email…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {familiesQuery.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : familiesQuery.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load families"
          subtitle={apiErrorMessage(familiesQuery.error)}
          action={{ label: 'Try again', onPress: () => void familiesQuery.refetch() }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={familiesQuery.isFetching && !familiesQuery.isLoading}
              onRefresh={() => void familiesQuery.refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No families found" subtitle="Pull to refresh" />
          }
          renderItem={({ item: f }) => {
            const hasOrg = Boolean(f.organizationId || f.organization);
            const chosen = selectedOrg[f.id];
            const chosenName = orgs.find((o) => o.id === chosen)?.name;
            const assigning =
              assignMutation.isPending && assignMutation.variables?.familyId === f.id;

            return (
              <Card className="mb-2" shadow={false}>
                <Text className="font-semibold text-stone-900">{f.name || 'Family'}</Text>
                <Text className="mt-0.5 text-sm text-stone-500">{f.email}</Text>
                {f.createdAt ? (
                  <Text className="mt-1 text-xs text-stone-400">
                    Registered {formatDate(f.createdAt)}
                  </Text>
                ) : null}

                {hasOrg ? (
                  <View className="mt-3 flex-row items-center gap-1.5">
                    <Ionicons name="business-outline" size={14} color="#0F766E" />
                    <Text className="text-sm text-teal-700">
                      {f.organization?.name ?? 'Assigned'}
                    </Text>
                  </View>
                ) : (
                  <View className="mt-3 gap-2">
                    <Pressable
                      onPress={() => setPickerFor(f.id)}
                      className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5"
                    >
                      <Text
                        className={`text-sm ${chosenName ? 'text-stone-800' : 'text-stone-400'}`}
                      >
                        {chosenName || 'Select org…'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#A8A29E" />
                    </Pressable>
                    <Button
                      size="sm"
                      disabled={!chosen || assigning}
                      isLoading={assigning}
                      onPress={() => {
                        if (!chosen) {
                          toast.show('Select an organization first', { type: 'danger' });
                          return;
                        }
                        assignMutation.mutate({ familyId: f.id, organizationId: chosen });
                      }}
                    >
                      Assign
                    </Button>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      <Modal
        visible={Boolean(pickerFor)}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setPickerFor(null)}
        >
          <Pressable
            className="max-h-[70%] rounded-t-3xl bg-white"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-stone-100 px-4 py-3">
              <Text className="text-base font-semibold text-stone-900">Select organization</Text>
              <Pressable onPress={() => setPickerFor(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#57534E" />
              </Pressable>
            </View>
            <FlatList
              data={orgs}
              keyExtractor={(o) => o.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
              ListEmptyComponent={
                <Text className="p-4 text-sm text-stone-500">No organizations available.</Text>
              }
              renderItem={({ item: o }) => {
                const selected = pickerFor ? selectedOrg[pickerFor] === o.id : false;
                return (
                  <Pressable
                    onPress={() => {
                      if (!pickerFor) return;
                      setSelectedOrg((prev) => ({ ...prev, [pickerFor]: o.id }));
                      setPickerFor(null);
                    }}
                    className={`mb-1 flex-row items-center justify-between rounded-xl px-3 py-3 ${
                      selected ? 'bg-teal-50' : ''
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selected ? 'text-teal-800' : 'text-stone-800'
                      }`}
                    >
                      {o.name || 'Organization'}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#0D9488" />
                    ) : null}
                  </Pressable>
                );
              }}
            />
            {pickingOrgName ? (
              <Text className="px-4 pb-2 text-xs text-stone-400">Current: {pickingOrgName}</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
