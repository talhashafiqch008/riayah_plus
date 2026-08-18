import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminIncidents, unwrapList } from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type IncidentRow = {
  id: string;
  title?: string;
  severity?: string;
  status?: string;
  createdAt?: string;
  description?: string;
};

export default function AdminIncidentsScreen() {
  return (
    <AdminListScreen<IncidentRow>
      title="Incidents"
      subtitle="Care / safety incidents"
      queryKey={['admin-incidents']}
      queryFn={async () => unwrapList<IncidentRow>(await fetchAdminIncidents())}
      searchPlaceholder="Search incidents…"
      filterItem={(i, q) =>
        [i.title, i.status, i.severity, i.description].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        )
      }
      keyExtractor={(i) => i.id}
      renderItem={(i) => (
        <AdminListRow
          title={i.title || 'Incident'}
          subtitle={i.description?.slice(0, 100)}
          meta={`${i.severity ?? '—'} · ${i.status ?? '—'}${
            i.createdAt ? ` · ${formatDateTime(i.createdAt)}` : ''
          }`}
        />
      )}
    />
  );
}
