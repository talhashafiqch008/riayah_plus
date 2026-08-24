import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { AdminListScreen } from '../../../components/admin/AdminListScreen';
import { ADMIN, adminCardStyle } from '../../../components/admin/AdminChrome';
import {
  approveAdminPayout,
  fetchAdminPayouts,
  unwrapList,
} from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

type PayoutRow = {
  id: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  createdAt?: string;
  provider?: { id?: string; name?: string } | null;
};

export default function AdminPayoutsScreen() {
  const toast = useToast();
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: (id: string) => approveAdminPayout(id),
    onSuccess: () => {
      toast.show('Payout approved', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (e) => toastError(toast, e),
  });

  return (
    <AdminListScreen<PayoutRow>
      title="Payouts"
      subtitle="Provider payout requests"
      queryKey={['admin-payouts']}
      queryFn={async () => unwrapList<PayoutRow>(await fetchAdminPayouts())}
      searchPlaceholder="Search provider or status…"
      filterItem={(p, q) =>
        [p.status, p.provider?.name, String(p.amount)].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(p) => p.id}
      renderItem={(p) => (
        <View style={[adminCardStyle, { padding: 16 }]}>
          <Text className="font-semibold text-stone-900">
            {p.currency ?? 'SAR'} {String(p.amount ?? '—')}
          </Text>
          <Text className="mt-0.5 text-sm text-stone-500">{p.provider?.name ?? 'Provider'}</Text>
          <Text className="mt-1 text-xs text-stone-400">
            {p.status ?? '—'}
            {p.createdAt ? ` · ${formatDateTime(p.createdAt)}` : ''}
          </Text>
          {p.status === 'pending' ? (
            <Pressable
              className="mt-3 rounded-xl py-2.5"
              style={{ backgroundColor: ADMIN.teal }}
              disabled={approve.isPending}
              onPress={() =>
                Alert.alert('Approve payout?', 'This marks the payout as approved.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Approve', onPress: () => approve.mutate(p.id) },
                ])
              }
            >
              <Text className="text-center text-sm font-semibold text-white">Approve</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>
      )}
    />
  );
}
