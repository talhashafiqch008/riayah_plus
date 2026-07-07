
import { useState, useEffect , useRef } from 'react';
import { Shield, Search, Filter, Download, Calendar, User, Activity } from "lucide-react";
import toast from 'react-hot-toast';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

interface AuditLog {
 id: number;
 action: string;
 user: string;
 role: string;
 timestamp: string;
 ipAddress: string;
 status: string;
 details: string;
}

export default function AdminAuditLogsPage() {
 const [searchQuery, setSearchQuery] = useState("");
 const [debouncedSearch, setDebouncedSearch] = useState("");
 const [filterType, setFilterType] = useState("all");
 const [logs, setLogs] = useState<AuditLog[]>([]);
 const loadingRef = useRef(true);

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
 return () => clearTimeout(timer);
 }, [searchQuery]);

 useEffect(() => {
 fetchLogs();
 }, []);

 const fetchLogs = async () => {
 try {
 loadingRef.current = true;
 const response = await client.get('/admin/audit-logs');
 const data = response.data?.data?.logs || response.data?.logs || [];
 setLogs(Array.isArray(data) ? data : []);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load audit logs');
 }
 setLogs([]);
 } finally {
 loadingRef.current = false;
 }
 };

 const getStatusColor = (status: string) => {
 return status === "success"
 ? "bg-green-100 text-green-700"
 : "bg-red-100 text-red-700";
 };

 const getActionIcon = (action: string) => {
 if (action.includes("Login")) return "🔐";
 if (action.includes("Booking")) return "📅";
 if (action.includes("Staff")) return "👤";
 if (action.includes("Service")) return "🛠️";
 return "📝";
 };

 const filteredLogs = logs.filter((log) => {
 const matchesSearch = !debouncedSearch ||
 log.action.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 log.user.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 log.details.toLowerCase().includes(debouncedSearch.toLowerCase());
 const matchesFilter = filterType === "all" || log.status === filterType;
 return matchesSearch && matchesFilter;
 });

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Audit Logs</h1>
 <p className="text-sm text-stone-500">Track all system activities and changes</p>
 </div>
 <button className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
 <Download className="mr-2 size-4" />
 Export Logs
 </button>
 </div>

 {/* Stats */}
 <div className="grid gap-6 md:grid-cols-4">
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Total Events</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">{logs.length}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Successful</p>
 <p className="mt-2 text-3xl font-bold text-green-600">
 {logs.filter(l => l.status === "success").length}
 </p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Failed</p>
 <p className="mt-2 text-3xl font-bold text-red-600">
 {logs.filter(l => l.status === "failed").length}
 </p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Today</p>
 <p className="mt-2 text-3xl font-bold text-blue-600">{logs.length}</p>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col sm:flex-row gap-4">
 <div className="flex-1 flex items-center rounded-lg border bg-white px-3 py-2">
 <Search className="mr-2 size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search logs..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent text-sm focus:outline-none"
 />
 </div>
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="rounded-md border border-stone-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none"
 >
 <option value="all">All Status</option>
 <option value="success">Success</option>
 <option value="failed">Failed</option>
 </select>
 </div>

 {/* Logs Table */}
 <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
 <table className="min-w-full divide-y divide-stone-200">
 <thead className="bg-stone-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Action
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 User
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Timestamp
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 IP Address
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Status
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Details
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-stone-200">
 {filteredLogs.map((log) => (
 <tr key={log.id} className="hover:bg-stone-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <span className="mr-2">{getActionIcon(log.action)}</span>
 <span className="text-sm font-medium text-stone-900">{log.action}</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-stone-900">{log.user}</div>
 <div className="text-xs text-stone-500">{log.role}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
 {log.timestamp}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
 {log.ipAddress}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(log.status)}`}>
 {log.status}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-stone-500">
 {log.details}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {filteredLogs.length === 0 && (
 <div className="text-center py-12 rounded-xl border bg-white">
 <Shield className="mx-auto size-12 text-stone-400 mb-4" />
 <p className="text-stone-500">No audit logs found</p>
 </div>
 )}
 </div>
 );
}
