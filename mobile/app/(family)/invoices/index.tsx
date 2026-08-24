import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import { EmptyState, StatusBadge } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import {
  canPayInvoice,
  confirmInvoicePayment,
  formatMoney,
  invoiceStatusLabel,
  listInvoices,
  type Invoice,
} from '../../../lib/api/invoices';

type Tab = 'invoices' | 'quotations';

export default function FamilyInvoicesScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('invoices');
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      let next = (await listInvoices()).data ?? [];
      const payable = next.filter((row) => canPayInvoice(row));
      if (payable.length) {
        const updates = await Promise.all(
          payable.map(async (row) => {
            try {
              const confirmed = await confirmInvoicePayment(row.id);
              return confirmed.data ?? row;
            } catch {
              return row;
            }
          }),
        );
        const byId = new Map(updates.map((row) => [row.id, row]));
        next = next.map((row) => byId.get(row.id) ?? row);
        if (updates.some((row, i) => row.status === 'paid' && payable[i]?.status !== 'paid')) {
          toast.show('Payment received', { type: 'success' });
        }
      }
      setRows(next);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, 'Failed to load billing'), { type: 'danger' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const quotations = useMemo(() => rows.filter((r) => r.type === 'quotation'), [rows]);
  const invoices = useMemo(() => rows.filter((r) => r.type !== 'quotation'), [rows]);
  const visible = tab === 'quotations' ? quotations : invoices;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Billing" subtitle="Quotations, invoices, and payments" showBack />

      <View className="flex-row gap-2 px-4 pb-2 pt-3">
        {(['invoices', 'quotations'] as Tab[]).map((key) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className={`rounded-full px-4 py-2 ${active ? 'bg-teal-600' : 'bg-white border border-stone-200'}`}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-stone-600'}`}>
                {key === 'invoices' ? `Invoices (${invoices.length})` : `Quotations (${quotations.length})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={FAMILY.teal} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={FAMILY.teal}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={tab === 'quotations' ? 'No quotations yet' : 'No invoices yet'}
              subtitle={
                tab === 'quotations'
                  ? 'When a care plan is approved, a quotation appears here.'
                  : 'Invoices are created when sessions or services are completed.'
              }
            />
          }
          renderItem={({ item }) => {
            const isQuotation = item.type === 'quotation';
            return (
              <Pressable
                onPress={() => router.push(`/(family)/invoices/${item.id}`)}
                className="mb-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      {isQuotation ? 'Quotation' : 'Invoice'}
                    </Text>
                    <Text className="mt-0.5 text-base font-semibold text-stone-900">
                      {item.invoiceNumber}
                    </Text>
                    <Text className="mt-1 text-sm text-stone-600">
                      {formatMoney(item.total, item.currency)}
                      {item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ''}
                    </Text>
                  </View>
                  <StatusBadge
                    status={String(item.status)}
                    label={invoiceStatusLabel(String(item.status))}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
