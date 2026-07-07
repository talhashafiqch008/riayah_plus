
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getBookingSessions } from '@/lib/api';
import { Calendar, Clock, MapPin, User, Search } from 'lucide-react';

interface Session {
 id: string;
 type?: string;
 patient?: { firstName?: string; lastName?: string };
 provider?: { firstName?: string; lastName?: string };
 scheduledAt: string;
 duration?: number;
 status?: string;
}

export default function AdminSessionsPage() {
 const [sessions, setSessions] = useState<Session[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
 return () => clearTimeout(timer);
 }, [searchTerm]);

 useEffect(() => {
 loadData();
 }, []);

 const loadData = async () => {
 try {
 const data = await getBookingSessions();
 setSessions(Array.isArray(data) ? data : []);
 } catch (error) {
 console.error('Failed to load sessions:', error);
 toast.error('Failed to load sessions. Please try again.');
 } finally {
 setLoading(false);
 }
 };

 const filteredSessions = sessions.filter(session => !debouncedSearch ||
 session.patient?.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 session.provider?.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 session.status?.toLowerCase().includes(debouncedSearch.toLowerCase())
 );

 return (
 <div className="space-y-6">
 <h1 className="text-2xl font-semibold text-stone-900">Sessions Overview</h1>

 <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
 <div className="p-4 border-b">
 <div className="relative max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
 <input
 type="text"
 placeholder="Search by name or status..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-9 pr-4 py-2 w-full border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
 />
 </div>
 </div>

 {loading ? (
 <div className="p-8 text-center text-stone-500">Loading sessions…</div>
 ) : filteredSessions.length === 0 ? (
 <div className="p-12 text-center">
 <div className="mx-auto size-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
 <Search className="size-6 text-stone-400" />
 </div>
 <p className="text-stone-900 font-semibold mb-1">No sessions found</p>
 <p className="text-stone-500 text-sm">Try adjusting your search criteria</p>
 </div>
 ) : (
 <table className="min-w-full divide-y divide-stone-200">
 <thead className="bg-stone-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">ID / Type</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Participants</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Schedule</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">Status</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-stone-200">
 {filteredSessions.map((session) => (
 <tr key={session.id} className="hover:bg-stone-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-medium text-stone-900 capitalize">{session.type?.replace('_', ' ')}</div>
 <div className="text-xs text-stone-500 font-mono">#{session.id.slice(0, 8)}</div>
 </td>
 <td className="px-6 py-4">
 <div className="text-sm text-stone-900">
 <span className="font-medium">Patient:</span> {session.patient?.firstName} {session.patient?.lastName}
 </div>
 <div className="text-sm text-stone-500">
 <span className="font-medium">Provider:</span> {session.provider?.firstName} {session.provider?.lastName}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center text-sm text-stone-900">
 <Calendar className="size-4 mr-1 text-stone-400" />
 {new Date(session.scheduledAt).toLocaleDateString()}
 </div>
 <div className="flex items-center text-xs text-stone-500 mt-1">
 <Clock className="size-3 mr-1" />
 {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 <span className="ml-1">({session.duration}m)</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${session.status === 'confirmed' ? 'bg-green-100 text-green-800' : session.status === 'completed' ? 'bg-blue-100 text-blue-800' : session.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
 {session.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 );
}
