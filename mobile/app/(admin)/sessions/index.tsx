import { AdminListRow, AdminListScreen } from '../../../components/admin/AdminListScreen';
import { fetchAdminBookings } from '../../../lib/api/admin';
import { formatDateTime } from '../../../lib/format';

type BookingRow = {
  id: string;
  status?: string;
  scheduledAt?: string;
  startTime?: string;
  serviceType?: string;
  client?: { name?: string } | null;
  patient?: { name?: string } | null;
  provider?: { name?: string } | null;
};

function unwrap(payload: unknown): BookingRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.bookings ?? p;
  return Array.isArray(raw) ? (raw as BookingRow[]) : [];
}

/** Operational schedule surface — same data as Bookings, Sessions framing. */
export default function AdminSessionsScreen() {
  return (
    <AdminListScreen<BookingRow>
      title="Sessions"
      subtitle="Scheduled visits & bookings"
      queryKey={['admin-sessions']}
      queryFn={async () => unwrap(await fetchAdminBookings({ limit: 50 }))}
      searchPlaceholder="Search sessions…"
      filterItem={(b, q) =>
        [
          b.status,
          b.serviceType,
          b.client?.name,
          b.patient?.name,
          b.provider?.name,
        ].some((v) => String(v ?? '').toLowerCase().includes(q))
      }
      keyExtractor={(b) => b.id}
      renderItem={(b) => (
        <AdminListRow
          title={b.serviceType?.replace(/_/g, ' ') || 'Session'}
          subtitle={
            [b.client?.name ?? b.patient?.name, b.provider?.name].filter(Boolean).join(' · ') ||
            b.status
          }
          meta={`${b.status ?? '—'}${
            b.scheduledAt || b.startTime
              ? ` · ${formatDateTime(b.scheduledAt || b.startTime || '')}`
              : ''
          }`}
        />
      )}
      emptyTitle="No sessions found"
    />
  );
}
