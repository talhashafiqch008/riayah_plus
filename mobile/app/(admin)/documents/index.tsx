import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import {
  fetchAdminDocuments,
  fetchAdminDocumentsPending,
  unwrapList,
} from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type DocRow = {
  id: string;
  type?: string;
  category?: string;
  status?: string;
  name?: string;
  createdAt?: string;
  user?: { name?: string; email?: string } | null;
};

async function loadDocs(): Promise<DocRow[]> {
  try {
    const pending = unwrapList<DocRow>(await fetchAdminDocumentsPending());
    if (pending.length) return pending;
  } catch {
    // fall through
  }
  return unwrapList<DocRow>(await fetchAdminDocuments());
}

export default function AdminDocumentsScreen() {
  return (
    <AdminListScreen<DocRow>
      title="Documents"
      subtitle="Pending and recent documents"
      queryKey={['admin-documents']}
      queryFn={loadDocs}
      searchPlaceholder="Search documents…"
      filterItem={(d, q) =>
        [d.type, d.category, d.name, d.status, d.user?.name, d.user?.email].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(d) => d.id}
      renderItem={(d) => (
        <AdminListRow
          icon="folder-outline"
          title={d.name || d.type || d.category || 'Document'}
          subtitle={d.user?.name ?? d.user?.email ?? d.status}
          meta={`${d.status ?? '—'}${d.createdAt ? ` · ${formatDateTime(d.createdAt)}` : ''}`}
        />
      )}
    />
  );
}
