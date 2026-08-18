import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminPayments, unwrapList } from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type PaymentRow = {
  id: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  payment_method?: string;
  createdAt?: string;
  created_at?: string;
  user?: { id?: string; name?: string } | null;
};

export default function AdminPaymentsScreen() {
  return (
    <AdminListScreen<PaymentRow>
      title="Payments"
      subtitle="Recent platform payments"
      queryKey={['admin-payments']}
      queryFn={async () => unwrapList<PaymentRow>(await fetchAdminPayments())}
      searchPlaceholder="Search status or payer…"
      filterItem={(p, q) =>
        [p.status, p.user?.name, String(p.amount)].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(p) => p.id}
      renderItem={(p) => (
        <AdminListRow
          title={`${p.currency ?? 'SAR'} ${String(p.amount ?? '—')}`}
          subtitle={p.user?.name ?? p.status}
          meta={`${p.status ?? '—'} · ${p.paymentMethod ?? p.payment_method ?? '—'}${
            p.createdAt || p.created_at
              ? ` · ${formatDateTime(String(p.createdAt ?? p.created_at))}`
              : ''
          }`}
        />
      )}
    />
  );
}
