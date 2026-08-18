import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminDisputes, unwrapList } from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type DisputeRow = {
  id: string;
  status?: string;
  reason?: string;
  createdAt?: string;
  bookingId?: string;
  raisedBy?: { name?: string } | null;
  user?: { name?: string } | null;
};

export default function AdminDisputesScreen() {
  return (
    <AdminListScreen<DisputeRow>
      title="Disputes"
      subtitle="Open and resolved disputes"
      queryKey={['admin-disputes']}
      queryFn={async () => unwrapList<DisputeRow>(await fetchAdminDisputes())}
      searchPlaceholder="Search disputes…"
      filterItem={(d, q) =>
        [d.status, d.reason, d.raisedBy?.name, d.user?.name].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(d) => d.id}
      renderItem={(d) => (
        <AdminListRow
          title={d.reason?.slice(0, 80) || 'Dispute'}
          subtitle={d.raisedBy?.name ?? d.user?.name ?? d.status}
          meta={`${d.status ?? '—'}${d.createdAt ? ` · ${formatDateTime(d.createdAt)}` : ''}`}
        />
      )}
    />
  );
}
