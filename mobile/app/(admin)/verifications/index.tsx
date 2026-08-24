import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminProvidersPending } from '../../../lib/api/admin';

type DocRow = {
  id: string;
  type?: string;
  status?: string;
  user?: { name?: string; email?: string } | null;
};

function unwrap(payload: unknown): DocRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.documents ?? p.providers ?? p;
  return Array.isArray(raw) ? (raw as DocRow[]) : [];
}

export default function AdminVerificationsScreen() {
  return (
    <AdminListScreen<DocRow>
      title="Verifications"
      subtitle="Pending provider / document checks"
      queryKey={['admin-verifications']}
      queryFn={async () => unwrap(await fetchAdminProvidersPending())}
      keyExtractor={(d) => d.id}
      renderItem={(d) => (
        <AdminListRow
          icon="shield-checkmark-outline"
          title={d.user?.name || d.type || 'Pending item'}
          subtitle={d.user?.email ?? d.type}
          meta={d.status ?? 'pending'}
        />
      )}
      emptyTitle="Nothing pending"
    />
  );
}
