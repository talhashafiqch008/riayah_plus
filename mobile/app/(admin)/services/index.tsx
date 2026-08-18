import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminServices, unwrapList } from '../../../lib/api/admin';

type ServiceRow = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  pricePerHour?: number;
  isActive?: boolean;
  status?: string;
};

export default function AdminServicesScreen() {
  return (
    <AdminListScreen<ServiceRow>
      title="Services"
      subtitle="Service catalog"
      queryKey={['admin-services']}
      queryFn={async () => unwrapList<ServiceRow>(await fetchAdminServices())}
      searchPlaceholder="Search services…"
      filterItem={(s, q) =>
        [s.name, s.category, s.description].some((v) => String(v ?? '').toLowerCase().includes(q))
      }
      keyExtractor={(s) => s.id}
      renderItem={(s) => (
        <AdminListRow
          title={s.name || 'Service'}
          subtitle={s.category ?? s.description?.slice(0, 80)}
          meta={
            s.isActive === false || s.status === 'inactive'
              ? 'Inactive'
              : `Active${s.pricePerHour != null ? ` · ${s.pricePerHour}/hr` : ''}`
          }
        />
      )}
    />
  );
}
