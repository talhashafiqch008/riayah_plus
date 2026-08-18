import { router } from 'expo-router';
import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminUsers } from '../../../lib/api/admin';

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

function unwrapUsers(payload: unknown): UserRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.users ?? p;
  return Array.isArray(raw) ? (raw as UserRow[]) : [];
}

export default function AdminUsersScreen() {
  return (
    <AdminListScreen<UserRow>
      title="Users"
      subtitle="All platform accounts"
      queryKey={['admin-users']}
      queryFn={async () => unwrapUsers(await fetchAdminUsers())}
      searchPlaceholder="Search name or email…"
      filterItem={(u, q) =>
        [u.name, u.email, u.role].some((v) => String(v ?? '').toLowerCase().includes(q))
      }
      keyExtractor={(u) => u.id}
      renderItem={(u) => (
        <AdminListRow
          title={u.name || u.email || 'User'}
          subtitle={u.email}
          meta={`${u.role ?? '—'} · ${u.isActive === false ? 'Inactive' : 'Active'}`}
          onPress={() => router.push(`/(admin)/users/${u.id}`)}
        />
      )}
      emptyTitle="No users found"
    />
  );
}
