import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { apiClient } from '../../../lib/api/client';
import { fetchAdminProvidersPending } from '../../../lib/api/admin';

type ProviderRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  verificationStatus?: string;
  isActive?: boolean;
};

function unwrap(payload: unknown): ProviderRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.providers ?? p.users ?? p;
  return Array.isArray(raw) ? (raw as ProviderRow[]) : [];
}

async function fetchProviders(): Promise<ProviderRow[]> {
  try {
    const { data } = await apiClient.get('/api/admin/users', { params: { role: 'provider' } });
    const list = unwrap(data);
    if (list.length) return list;
  } catch {
    // fall through
  }
  try {
    const pending = unwrap(await fetchAdminProvidersPending());
    return pending;
  } catch {
    return [];
  }
}

export default function AdminProvidersScreen() {
  return (
    <AdminListScreen<ProviderRow>
      title="Providers"
      subtitle="Care providers on the platform"
      queryKey={['admin-providers']}
      queryFn={fetchProviders}
      searchPlaceholder="Search providers…"
      filterItem={(p, q) =>
        [p.name, p.email, p.role].some((v) => String(v ?? '').toLowerCase().includes(q))
      }
      keyExtractor={(p) => p.id}
      renderItem={(p) => (
        <AdminListRow
          icon="medkit-outline"
          title={p.name || p.email || 'Provider'}
          subtitle={p.email}
          meta={p.verificationStatus ?? p.role ?? '—'}
        />
      )}
    />
  );
}
