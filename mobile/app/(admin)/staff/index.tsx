import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminStaff } from '../../../lib/api/admin';

type StaffRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

function unwrap(payload: unknown): StaffRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.staff ?? p.users ?? p;
  return Array.isArray(raw) ? (raw as StaffRow[]) : [];
}

export default function AdminStaffScreen() {
  return (
    <AdminListScreen<StaffRow>
      title="Staff"
      subtitle="Internal staff accounts"
      queryKey={['admin-staff']}
      queryFn={async () => unwrap(await fetchAdminStaff())}
      searchPlaceholder="Search staff…"
      filterItem={(s, q) =>
        [s.name, s.email, s.role].some((v) => String(v ?? '').toLowerCase().includes(q))
      }
      keyExtractor={(s) => s.id}
      renderItem={(s) => (
        <AdminListRow
          icon="briefcase-outline"
          title={s.name || s.email || 'Staff'}
          subtitle={s.email}
          meta={`${s.role ?? '—'} · ${s.isActive === false ? 'Inactive' : 'Active'}`}
        />
      )}
    />
  );
}
