import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  metadata?: { statusCode?: number; path?: string; method?: string } | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

function statusFromMeta(log: AuditLog): 'success' | 'failed' | 'info' {
  const code = log.metadata?.statusCode;
  if (typeof code !== 'number') return 'info';
  return code >= 400 ? 'failed' : 'success';
}

function deviceLabel(log: AuditLog): string {
  const d = log.deviceInfo;
  if (!d || typeof d !== 'object') return '—';
  const parts = [d.browser, d.os, d.deviceType].filter(Boolean);
  return parts.length ? parts.join(' · ') : (log.userAgent?.slice(0, 40) ?? '—');
}

export default function AdminAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await client.get('/admin/audit-logs', {
        params: {
          page,
          limit,
          userId: userIdFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          action: filterType === 'all' ? undefined : undefined,
        },
      });
      const payload: AuditResponse = response.data?.data || response.data || {};
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
      setTotal(payload.total ?? 0);
    } catch (error) {
      if (isApiError(error)) toast.error(error.message || 'Failed to load audit logs');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, userIdFilter, fromDate, toDate, filterType]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const status = statusFromMeta(log);
    const hay = `${log.action} ${log.userId ?? ''} ${log.entity ?? ''} ${log.entityId ?? ''}`.toLowerCase();
    const matchesSearch = !debouncedSearch || hay.includes(debouncedSearch.toLowerCase());
    const matchesFilter = filterType === 'all' || status === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const exportCsv = async () => {
    try {
      const response = await client.get('/admin/audit-logs/export', {
        params: { userId: userIdFilter || undefined, from: fromDate || undefined, to: toDate || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: client-side CSV from loaded rows
      const header = 'id,action,userId,entity,entityId,ipAddress,createdAt,status\n';
      const rows = filteredLogs
        .map((l) =>
          [l.id, l.action, l.userId, l.entity, l.entityId, l.ipAddress, l.createdAt, statusFromMeta(l)]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(','),
        )
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported current page as CSV');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'success') return 'bg-green-100 text-green-700';
    if (status === 'failed') return 'bg-red-100 text-red-700';
    return 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Audit Logs</h1>
          <p className="text-sm text-stone-500">Track all system activities and changes</p>
        </div>
        <button
          type="button"
          onClick={() => void exportCsv()}
          className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          <Download className="mr-2 size-4" />
          Export Logs
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">{total}</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-stone-500">This Page</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">{filteredLogs.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Failed (page)</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {filteredLogs.filter((l) => statusFromMeta(l) === 'failed').length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Page</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {page} / {totalPages}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap">
        <div className="flex-1 flex items-center rounded-lg border bg-white px-3 py-2 min-w-[200px]">
          <Search className="mr-2 size-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search action, user, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="Filter userId"
          value={userIdFilter}
          onChange={(e) => {
            setUserIdFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">IP</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const status = statusFromMeta(log);
                return (
                  <tr key={log.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-stone-700 font-mono text-xs">{log.userId ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {log.entity ?? '—'}
                      {log.entityId ? (
                        <span className="block text-xs text-stone-400 font-mono">{log.entityId}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-500 max-w-[160px] truncate" title={deviceLabel(log)}>
                      {deviceLabel(log)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(status)}`}>
                        {status}
                        {log.metadata?.statusCode != null ? ` (${log.metadata.statusCode})` : ''}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            <ChevronLeft className="size-4 mr-1" /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="size-4 ml-1" />
          </button>
        </div>
      </div>

      {!loading && filteredLogs.length === 0 && (
        <div className="text-center py-12 rounded-xl border bg-white">
          <Shield className="mx-auto size-12 text-stone-400 mb-4" />
          <p className="text-stone-500">No audit logs found</p>
        </div>
      )}
    </div>
  );
}
