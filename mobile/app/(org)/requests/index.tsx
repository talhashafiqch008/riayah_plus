import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import {
  assignOrgFamilyCoordinator,
  listOrgCoordinators,
  listOrgPendingIntakes,
} from '../../../lib/api/org';
import { apiErrorMessage, formatDate } from '../../../lib/format';

export default function OrgPendingRequestsScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const pendingQuery = useQuery({
    queryKey: ['org-pending-intakes'],
    queryFn: listOrgPendingIntakes,
  });

  const coordsQuery = useQuery({
    queryKey: ['org-coordinators'],
    queryFn: listOrgCoordinators,
  });

  const coords = (coordsQuery.data ?? []).filter((c) => c.isActive);
  const rows = pendingQuery.data?.data ?? [];

  const assignMutation = useMutation({
    mutationFn: ({ familyId, coordinatorId }: { familyId: string; coordinatorId: string }) =>
      assignOrgFamilyCoordinator(familyId, coordinatorId),
    onSuccess: async (_data, vars) => {
      setRowError((prev) => {
        const next = { ...prev };
        delete next[vars.familyId];
        return next;
      });
      toast.show('Coordinator assigned. Request is now in their intake queue.', {
        type: 'success',
      });
      await qc.invalidateQueries({ queryKey: ['org-pending-intakes'] });
      await qc.invalidateQueries({ queryKey: ['org-dashboard'] });
      await qc.invalidateQueries({ queryKey: ['org-families'] });
    },
    onError: (e, vars) => {
      const msg = apiErrorMessage(e, 'Assignment failed');
      setRowError((prev) => ({ ...prev, [vars.familyId]: msg }));
      toast.show(msg, { type: 'danger' });
    },
  });

  const loading = pendingQuery.isLoading || coordsQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Pending requests" showBack={false} />

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : pendingQuery.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load pending requests"
          subtitle={apiErrorMessage(pendingQuery.error)}
          action={{ label: 'Try again', onPress: () => void pendingQuery.refetch() }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={pendingQuery.isFetching && !pendingQuery.isLoading}
              onRefresh={() => {
                void pendingQuery.refetch();
                void coordsQuery.refetch();
              }}
              tintColor="#0D9488"
            />
          }
          ListHeaderComponent={
            <Text className="mb-4 text-sm text-stone-500">
              Care requests from families without a primary coordinator. Assign a coordinator to
              route each request into their intake queue.
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title="No pending unassigned requests"
              subtitle="New family care requests without a coordinator will appear here."
            />
          }
          renderItem={({ item }) => {
            const familyId = item.familyUser.id;
            const picked = selected[item.id] ?? '';
            const err = rowError[familyId];
            return (
              <Card className="mb-3" shadow>
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="font-semibold text-stone-900">
                      {item.careRecipient?.name ?? 'Patient'} — {item.familyUser.name}
                    </Text>
                    <Text className="mt-0.5 text-sm text-stone-500">{item.familyUser.email}</Text>
                    {item.reasonForCare ? (
                      <Text className="mt-1 text-sm text-stone-600" numberOfLines={2}>
                        {item.reasonForCare}
                      </Text>
                    ) : null}
                    {item.submittedAt ? (
                      <Text className="mt-1 text-xs text-stone-400">
                        {formatDate(item.submittedAt)}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                {coords.length === 0 ? (
                  <Text className="mt-3 text-sm text-amber-700">
                    Invite an active coordinator first.
                  </Text>
                ) : (
                  <View className="mt-3 gap-2">
                    {coords.map((c) => {
                      const active = picked === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelected((prev) => ({ ...prev, [item.id]: c.id }))}
                          className={`rounded-xl border px-3 py-2 ${
                            active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              active ? 'font-medium text-teal-700' : 'text-stone-700'
                            }`}
                          >
                            {c.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {err ? <Text className="text-sm text-red-600">{err}</Text> : null}
                    <Button
                      size="sm"
                      disabled={!picked}
                      isLoading={
                        assignMutation.isPending && assignMutation.variables?.familyId === familyId
                      }
                      onPress={() => {
                        if (!picked) {
                          const msg = 'Select a coordinator';
                          setRowError((prev) => ({ ...prev, [familyId]: msg }));
                          toast.show(msg, { type: 'danger' });
                          return;
                        }
                        assignMutation.mutate({ familyId, coordinatorId: picked });
                      }}
                    >
                      Assign & route
                    </Button>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
