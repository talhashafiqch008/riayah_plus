import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { apiClient } from '../../../lib/api/client';
import { unwrapList } from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type ReportRow = {
  id: string;
  status?: string;
  title?: string;
  content?: string;
  type?: string;
  createdAt?: string;
  client?: { name?: string } | null;
  provider?: { name?: string } | null;
};

export default function AdminAssignmentsScreen() {
  return (
    <AdminListScreen<ReportRow>
      title="Assignments"
      subtitle="Provider reports / assignment signals"
      queryKey={['admin-reports']}
      queryFn={async () => {
        const { data } = await apiClient.get('/api/admin/reports');
        return unwrapList<ReportRow>(data);
      }}
      searchPlaceholder="Search reports…"
      filterItem={(r, q) =>
        [r.status, r.title, r.content, r.type, r.client?.name, r.provider?.name].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(r) => r.id}
      renderItem={(r) => (
        <AdminListRow
          title={r.title || r.type || 'Report'}
          subtitle={[r.provider?.name, r.client?.name].filter(Boolean).join(' · ') || r.status}
          meta={`${r.status ?? '—'}${r.createdAt ? ` · ${formatDateTime(r.createdAt)}` : ''}`}
        />
      )}
      emptyTitle="No assignment reports"
    />
  );
}
