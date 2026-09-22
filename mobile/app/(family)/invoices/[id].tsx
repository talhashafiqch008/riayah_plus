import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Button, StatusBadge } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import {
  canPayInvoice,
  confirmInvoicePayment,
  downloadInvoicePdf,
  formatMoney,
  getInvoice,
  invoiceLineItems,
  invoiceStatusLabel,
  payInvoice,
  type Invoice,
} from '../../../lib/api/invoices';

export default function FamilyInvoiceDetailScreen() {
  const { t } = useTranslation('family');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let next = await getInvoice(String(id));
      if (canPayInvoice(next)) {
        try {
          const confirmed = await confirmInvoicePayment(String(id), { maxAttempts: 10, intervalMs: 1500 });
          if (confirmed.data) next = confirmed.data;
          else if (confirmed.paid || confirmed.alreadyPaid) next = await getInvoice(String(id));
          if (confirmed.paid && !confirmed.alreadyPaid) {
            toast.show(t('invoiceDetail.paymentReceived'), { type: 'success' });
          }
        } catch {
          /* PayTabs query is best-effort after hosted checkout */
        }
      }
      setInvoice(next);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('invoiceDetail.loadError')), { type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onPay() {
    if (!invoice) return;
    setBusy(true);
    try {
      const result = await payInvoice(invoice.id);
      if (result.alreadyPaid) {
        toast.show(t('invoiceDetail.alreadyPaid'), { type: 'success' });
        await load();
        return;
      }
      if (result.paymentUrl) {
        await Linking.openURL(result.paymentUrl);
        return;
      }
      toast.show(t('invoiceDetail.paymentStartFailed'), { type: 'danger' });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 503) {
        toast.show(t('invoiceDetail.paymentUnavailable'), { type: 'danger', duration: 5000 });
      } else {
        toast.show(apiErrorMessage(e, t('invoiceDetail.paymentFailed')), { type: 'danger' });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!invoice) return;
    setBusy(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch (e: unknown) {
      toast.show(apiErrorMessage(e, t('invoiceDetail.pdfFailed')), { type: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  const lines = invoice ? invoiceLineItems(invoice) : [];
  const isQuotation = invoice?.type === 'quotation';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title={isQuotation ? t('invoiceDetail.quotation') : t('invoiceDetail.invoice')}
        subtitle={invoice?.invoiceNumber ?? t('invoiceDetail.billingDocument')}
        showBack
      />

      {loading || !invoice ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={FAMILY.teal} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-semibold text-stone-900">
              {formatMoney(invoice.total, invoice.currency)}
            </Text>
            <StatusBadge
              status={String(invoice.status)}
              label={invoiceStatusLabel(String(invoice.status))}
            />
          </View>

          {invoice.dueDate ? (
            <Text className="mb-4 text-sm text-stone-500">
              {t('invoiceDetail.dueDate', { date: formatDate(invoice.dueDate) })}
            </Text>
          ) : null}

          <View className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {t('invoiceDetail.lineItems')}
            </Text>
            {lines.length === 0 ? (
              <Text className="text-sm text-stone-500">{t('invoiceDetail.noLineItems')}</Text>
            ) : (
              lines.map((line, idx) => (
                <View
                  key={`${line.description}-${idx}`}
                  className={`flex-row justify-between gap-3 py-2 ${
                    idx > 0 ? 'border-t border-stone-100' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-stone-800">{line.description}</Text>
                    <Text className="text-xs text-stone-400">
                      {line.quantity} × {formatMoney(line.unitPrice, invoice.currency)}
                    </Text>
                  </View>
                  <Text className="text-sm font-semibold text-stone-900">
                    {formatMoney(line.quantity * line.unitPrice, invoice.currency)}
                  </Text>
                </View>
              ))
            )}
            <View className="mt-3 border-t border-stone-100 pt-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-stone-500">{t('invoiceDetail.subtotal')}</Text>
                <Text className="text-sm text-stone-700">
                  {formatMoney(invoice.subtotal, invoice.currency)}
                </Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-sm text-stone-500">{t('invoiceDetail.tax')}</Text>
                <Text className="text-sm text-stone-700">
                  {formatMoney(invoice.taxAmount, invoice.currency)}
                </Text>
              </View>
              <View className="mt-2 flex-row justify-between">
                <Text className="text-sm font-semibold text-stone-900">{t('invoiceDetail.total')}</Text>
                <Text className="text-sm font-semibold text-stone-900">
                  {formatMoney(invoice.total, invoice.currency)}
                </Text>
              </View>
            </View>
          </View>

          {invoice.notes ? (
            <Text className="mb-4 text-sm leading-5 text-stone-500">{invoice.notes}</Text>
          ) : null}

          <View className="gap-3">
            <Button variant="secondary" isLoading={busy} onPress={() => void onPdf()}>
              {t('invoiceDetail.downloadPdf')}
            </Button>
            {canPayInvoice(invoice) ? (
              <Button isLoading={busy} onPress={() => void onPay()}>
                {t('invoiceDetail.payNow')}
              </Button>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
