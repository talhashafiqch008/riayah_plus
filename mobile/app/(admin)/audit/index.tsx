import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminAuditLogs } from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type LogRow = {
  id: string;
  action?: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  createdAt?: string;
  actor?: { name?: string; email?: string } | null;
};

function unwrap(payload: unknown): LogRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.logs ?? p.auditLogs ?? p;
  return Array.isArray(raw) ? (raw as LogRow[]) : [];
}

export default function AdminAuditScreen() {
  return (
    <AdminListScreen<LogRow>
      title="Audit Logs"
      subtitle="Security & admin actions"
      queryKey={['admin-audit-logs']}
      queryFn={async () => unwrap(await fetchAdminAuditLogs({ limit: 50 }))}
      searchPlaceholder="Filter action or entity…"
      filterItem={(l, q) =>
        [l.action, l.entity, l.actor?.name, l.actor?.email].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(l) => l.id}
      renderItem={(l) => (
        <AdminListRow
          icon="list-outline"
          title={l.action?.replace(/_/g, ' ') || 'Event'}
          subtitle={[l.entity, l.entityId].filter(Boolean).join(' · ')}
          meta={`${l.actor?.name ?? l.actor?.email ?? 'System'}${
            l.createdAt ? ` · ${formatDateTime(l.createdAt)}` : ''
          }`}
        />
      )}
    />
  );
}
