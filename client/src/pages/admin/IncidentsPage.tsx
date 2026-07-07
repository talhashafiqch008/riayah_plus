/**
 * Incident Management Page
 * Admin interface for managing incidents with escalation and suspension
 */


import { useState, useEffect , useRef } from 'react';
import {
 AlertTriangle, CheckCircle, Clock, Filter, ArrowUp, Ban,
 Eye, MessageCircle, User, Phone, Mail, ChevronDown, ChevronUp,
 AlertCircle, Shield, XCircle, FileText, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';

interface Incident {
 id: string;
 reportedBy: string;
 reporterEmail: string;
 reporterPhone: string;
 relatedTo: string;
 relatedToRole: string;
 relatedToId: string;
 type: string;
 severity: 'low' | 'medium' | 'high' | 'critical';
 status: 'open' | 'investigating' | 'escalated' | 'resolved' | 'closed';
 description: string;
 resolution?: string;
 escalationLevel?: number;
 escalationNotes?: string;
 suspensionApplied?: boolean;
 createdAt: string;
}

export default function IncidentManagementPage() {
 const [incidents, setIncidents] = useState<Incident[]>([]);
 const loadingRef = useRef(true);
 const [filterStatus, setFilterStatus] = useState<string>('all');
 const [filterSeverity, setFilterSeverity] = useState<string>('all');
 const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
 const [resolution, setResolution] = useState('');
 const [showResolveModal, setShowResolveModal] = useState(false);
 const [showEscalateModal, setShowEscalateModal] = useState(false);
 const [showSuspendModal, setShowSuspendModal] = useState(false);
 const [escalationNotes, setEscalationNotes] = useState('');
 const [suspensionDays, setSuspensionDays] = useState(7);
 const [suspensionReason, setSuspensionReason] = useState('');
 const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

 useEffect(() => {
 fetchIncidents();
 }, []);

 const fetchIncidents = async () => {
 try {
 loadingRef.current = true;
 const response = await client.get('/admin/incidents');
 const data = response.data?.data?.incidents || response.data?.incidents || [];
 setIncidents(Array.isArray(data) ? data : []);
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load incidents');
 }
 setIncidents([]);
 } finally {
 loadingRef.current = false;
 }
 };

 const filteredIncidents = incidents.filter(i => {
 if (filterStatus !== 'all' && i.status !== filterStatus) return false;
 if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false;
 return true;
 });

 const handleResolve = async () => {
 if (!selectedIncident || !resolution.trim()) {
 toast.error('Please provide a resolution');
 return;
 }
 try {
 await client.post(`/admin/incidents/${selectedIncident.id}/resolve`, {
 resolution: resolution.trim(),
 });
 setIncidents(incidents.map(i =>
 i.id === selectedIncident.id
 ? { ...i, status: 'resolved' as const, resolution }
 : i
 ));
 toast.success('Incident resolved');
 } catch (err) {
 const msg = isApiError(err) ? err.message : 'Failed to resolve incident';
 toast.error(msg);
 } finally {
 setShowResolveModal(false);
 setResolution('');
 setSelectedIncident(null);
 }
 };

 const handleEscalate = async () => {
 if (!selectedIncident) return;

 const currentLevel = selectedIncident.escalationLevel || 0;
 try {
 await client.post(`/admin/incidents/${selectedIncident.id}/escalate`, {
 notes: escalationNotes || `Escalated to level ${currentLevel + 1}`,
 });
 setIncidents(incidents.map(i =>
 i.id === selectedIncident.id
 ? {
 ...i,
 status: 'escalated' as const,
 escalationLevel: currentLevel + 1,
 escalationNotes: escalationNotes || `Escalated to level ${currentLevel + 1}`,
 }
 : i
 ));
 toast.success(`Incident escalated to level ${currentLevel + 1}`);
 } catch (err) {
 const msg = isApiError(err) ? err.message : 'Failed to escalate incident';
 toast.error(msg);
 } finally {
 setShowEscalateModal(false);
 setEscalationNotes('');
 setSelectedIncident(null);
 }
 };

 const handleSuspend = async () => {
 if (!selectedIncident || !suspensionReason.trim()) {
 toast.error('Please provide a suspension reason');
 return;
 }
 try {
 await client.post(`/admin/incidents/${selectedIncident.id}/suspend-provider`, {
 reason: suspensionReason.trim(),
 days: suspensionDays,
 });
 setIncidents(incidents.map(i =>
 i.id === selectedIncident.id
 ? { ...i, suspensionApplied: true }
 : i
 ));
 toast.success(`Provider suspended for ${suspensionDays} days`);
 } catch (err) {
 const msg = isApiError(err) ? err.message : 'Failed to suspend provider';
 toast.error(msg);
 } finally {
 setShowSuspendModal(false);
 setSuspensionReason('');
 setSuspensionDays(7);
 setSelectedIncident(null);
 }
 };

 const getSeverityColor = (severity: string) => {
 const colors = {
 low: 'bg-blue-100 text-blue-800',
 medium: 'bg-amber-100 text-amber-800',
 high: 'bg-orange-100 text-orange-800',
 critical: 'bg-red-100 text-red-800',
 };
 return colors[severity as keyof typeof colors] || colors.low;
 };

 const getStatusColor = (status: string) => {
 const colors = {
 open: 'bg-red-100 text-red-800',
 investigating: 'bg-yellow-100 text-yellow-800',
 escalated: 'bg-purple-100 text-purple-800',
 resolved: 'bg-green-100 text-green-800',
 closed: 'bg-stone-100 text-stone-800',
 };
 return colors[status as keyof typeof colors] || colors.open;
 };

 const getTypeLabel = (type: string) => {
 const labels: Record<string, string> = {
 professional_conduct: '🚨 Professional Conduct',
 safety_concern: '⚠️ Safety Concern',
 document_expiry: '📄 Document Expiry',
 service_quality: '⭐ Service Quality',
 billing_dispute: '💳 Billing Dispute',
 harassment: '🛡️ Harassment',
 };
 return labels[type] || type.replace(/_/g, ' ');
 };

 // Stats
 const stats = {
 total: incidents.length,
 open: incidents.filter(i => i.status === 'open').length,
 escalated: incidents.filter(i => i.status === 'escalated').length,
 critical: incidents.filter(i => i.severity === 'critical').length,
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold text-stone-900">Incident Management</h1>
 <p className="text-stone-600">Track, escalate, and resolve platform incidents</p>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-stone-100 rounded-lg">
 <FileText className="size-5 text-stone-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
 <p className="text-sm text-stone-500">Total Incidents</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-5 border border-red-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-red-100 rounded-lg">
 <AlertCircle className="size-5 text-red-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-red-600">{stats.open}</p>
 <p className="text-sm text-stone-500">Open</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-5 border border-purple-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-purple-100 rounded-lg">
 <ArrowUp className="size-5 text-purple-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-purple-600">{stats.escalated}</p>
 <p className="text-sm text-stone-500">Escalated</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-5 border border-orange-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-orange-100 rounded-lg">
 <AlertTriangle className="size-5 text-orange-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-orange-600">{stats.critical}</p>
 <p className="text-sm text-stone-500">Critical</p>
 </div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl p-4 border border-stone-200 flex flex-wrap items-center gap-4">
 <Filter className="size-5 text-stone-500" />
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
 >
 <option value="all">All Status</option>
 <option value="open">Open</option>
 <option value="investigating">Investigating</option>
 <option value="escalated">Escalated</option>
 <option value="resolved">Resolved</option>
 <option value="closed">Closed</option>
 </select>
 <select
 value={filterSeverity}
 onChange={(e) => setFilterSeverity(e.target.value)}
 className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
 >
 <option value="all">All Severity</option>
 <option value="critical">Critical</option>
 <option value="high">High</option>
 <option value="medium">Medium</option>
 <option value="low">Low</option>
 </select>
 </div>

 {/* Incidents List */}
 <div className="space-y-4">
 {filteredIncidents.map((incident) => (
 <div
 key={incident.id}
 className={`bg-white rounded-xl border overflow-hidden ${incident.severity === 'critical' ? 'border-red-300 shadow-red-50' : 'border-stone-200' }`}
 >
 {/* Incident Header */}
 <div
 className="p-5 cursor-pointer hover:bg-stone-50"
 onClick={() => setExpandedIncident(expandedIncident === incident.id ? null : incident.id)}
 role="button"
 tabIndex={0}
 aria-expanded={expandedIncident === incident.id}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedIncident(expandedIncident === incident.id ? null : incident.id); } }}
 >
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className={`size-12 rounded-xl flex items-center justify-center ${incident.severity === 'critical' ? 'bg-red-100' : incident.severity === 'high' ? 'bg-orange-100' : incident.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100' }`}>
 <AlertTriangle className={`size-6 ${incident.severity === 'critical' ? 'text-red-600' : incident.severity === 'high' ? 'text-orange-600' : incident.severity === 'medium' ? 'text-amber-600' : 'text-blue-600' }`} />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1">
 <h3 className="font-semibold text-stone-900">{getTypeLabel(incident.type)}</h3>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
 {incident.severity}
 </span>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
 {incident.status}
 </span>
 {incident.escalationLevel && incident.escalationLevel > 0 && (
 <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
 <ArrowUp className="size-3" />
 Level {incident.escalationLevel}
 </span>
 )}
 {incident.suspensionApplied && (
 <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
 <Ban className="size-3" />
 Suspended
 </span>
 )}
 </div>
 <p className="text-stone-600 text-sm mb-2">{incident.description}</p>
 <div className="flex items-center gap-4 text-xs text-stone-500">
 <span className="flex items-center gap-1">
 <User className="size-3" />
 {incident.relatedTo} ({incident.relatedToRole})
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="size-3" />
 {new Date(incident.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {expandedIncident === incident.id ? (
 <ChevronUp className="size-5 text-stone-400" />
 ) : (
 <ChevronDown className="size-5 text-stone-400" />
 )}
 </div>
 </div>
 </div>

 {/* Expanded Details */}
 {expandedIncident === incident.id && (
 <div className="border-t border-stone-200 p-5 bg-stone-50">
 {/* Reporter Info */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
 <div className="bg-white rounded-lg p-4 border border-stone-200">
 <h4 className="text-sm font-medium text-stone-500 mb-2">Reported By</h4>
 <p className="font-medium text-stone-900">{incident.reportedBy}</p>
 <div className="flex items-center gap-4 mt-2 text-sm text-stone-600">
 <span className="flex items-center gap-1">
 <Mail className="size-4" />
 {incident.reporterEmail}
 </span>
 {incident.reporterPhone && (
 <span className="flex items-center gap-1">
 <Phone className="size-4" />
 {incident.reporterPhone}
 </span>
 )}
 </div>
 </div>
 <div className="bg-white rounded-lg p-4 border border-stone-200">
 <h4 className="text-sm font-medium text-stone-500 mb-2">Related Provider</h4>
 <p className="font-medium text-stone-900">{incident.relatedTo}</p>
 <p className="text-sm text-stone-600">{incident.relatedToRole} • ID: {incident.relatedToId}</p>
 </div>
 </div>

 {/* Escalation Notes */}
 {incident.escalationNotes && (
 <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 mb-4">
 <h4 className="text-sm font-medium text-purple-800 mb-1">Escalation Notes</h4>
 <p className="text-sm text-purple-700">{incident.escalationNotes}</p>
 </div>
 )}

 {/* Resolution */}
 {incident.resolution && (
 <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
 <h4 className="text-sm font-medium text-green-800 mb-1">Resolution</h4>
 <p className="text-sm text-green-700">{incident.resolution}</p>
 </div>
 )}

 {/* Actions */}
 {incident.status !== 'resolved' && incident.status !== 'closed' && (
 <div className="flex flex-wrap gap-3">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setSelectedIncident(incident);
 setShowEscalateModal(true);
 }}
 >
 <ArrowUp className="size-4 mr-2" />
 Escalate
 </Button>
 <Button
 size="sm"
 className="bg-red-600 hover:bg-red-700"
 onClick={() => {
 setSelectedIncident(incident);
 setShowSuspendModal(true);
 }}
 >
 <Ban className="size-4 mr-2" />
 Suspend Provider
 </Button>
 <Button
 size="sm"
 className="bg-green-600 hover:bg-green-700"
 onClick={() => {
 setSelectedIncident(incident);
 setShowResolveModal(true);
 }}
 >
 <CheckCircle className="size-4 mr-2" />
 Resolve
 </Button>
 </div>
 )}
 </div>
 )}
 </div>
 ))}
 {filteredIncidents.length === 0 && (
 <div className="text-center py-12 rounded-xl border bg-white">
 <div className="mx-auto size-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
 <Shield className="size-6 text-stone-400" />
 </div>
 <p className="text-stone-900 font-semibold mb-1">No incidents found</p>
 <p className="text-stone-500 text-sm">Try adjusting your filters</p>
 </div>
 )}
 </div>

 {/* Resolve Modal */}
 {showResolveModal && selectedIncident && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowResolveModal(false); } }} onClick={() => setShowResolveModal(false)}>
 <div className="bg-white rounded-2xl max-w-md w-full" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b border-stone-200">
 <h3 className="text-lg font-semibold text-stone-900">Resolve Incident</h3>
 </div>
 <div className="p-6">
 <p className="text-sm text-stone-600 mb-4">
 Provide details about how this incident was resolved.
 </p>
 <textarea
 value={resolution}
 onChange={(e) => setResolution(e.target.value)}
 placeholder="Enter resolution details..."
 rows={4}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none mb-4"
 />
 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowResolveModal(false)}>
 Cancel
 </Button>
 <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleResolve}>
 Confirm Resolution
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Escalate Modal */}
 {showEscalateModal && selectedIncident && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowEscalateModal(false); } }} onClick={() => setShowEscalateModal(false)}>
 <div className="bg-white rounded-2xl max-w-md w-full" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b border-stone-200">
 <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
 <ArrowUp className="size-5 text-purple-600" />
 Escalate Incident
 </h3>
 </div>
 <div className="p-6">
 <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 mb-4">
 <p className="text-sm text-purple-700">
 Current Level: <strong>{selectedIncident.escalationLevel || 0}</strong>
 <br />
 Escalating to: <strong>Level {(selectedIncident.escalationLevel || 0) + 1}</strong>
 </p>
 </div>
 <label htmlFor="escalationNotes" className="block text-sm font-medium text-stone-700 mb-2">
 Escalation Notes
 </label>
 <textarea
 id="escalationNotes"
 value={escalationNotes}
 onChange={(e) => setEscalationNotes(e.target.value)}
 placeholder="Reason for escalation..."
 rows={3}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
 />
 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowEscalateModal(false)}>
 Cancel
 </Button>
 <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleEscalate}>
 Escalate
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Suspend Modal */}
 {showSuspendModal && selectedIncident && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setShowSuspendModal(false); } }} onClick={() => setShowSuspendModal(false)}>
 <div className="bg-white rounded-2xl max-w-md w-full" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); } }} onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b border-stone-200">
 <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
 <Ban className="size-5 text-red-600" />
 Suspend Provider
 </h3>
 </div>
 <div className="p-6">
 <div className="bg-red-50 rounded-lg p-4 border border-red-200 mb-4">
 <div className="flex items-start gap-3">
 <AlertTriangle className="size-5 text-red-600 flex-shrink-0" />
 <div>
 <p className="font-medium text-red-800">Warning</p>
 <p className="text-sm text-red-700">
 This will immediately suspend <strong>{selectedIncident.relatedTo}</strong> from accepting new jobs.
 </p>
 </div>
 </div>
 </div>

 <label htmlFor="suspensionDays" className="block text-sm font-medium text-stone-700 mb-2">
 Suspension Duration
 </label>
 <select
 id="suspensionDays"
 value={suspensionDays}
 onChange={(e) => setSuspensionDays(parseInt(e.target.value))}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
 >
 <option value={3}>3 Days</option>
 <option value={7}>7 Days</option>
 <option value={14}>14 Days</option>
 <option value={30}>30 Days</option>
 <option value={-1}>Permanent (Pending Review)</option>
 </select>

 <label htmlFor="suspensionReason" className="block text-sm font-medium text-stone-700 mb-2">
 Suspension Reason
 </label>
 <textarea
 id="suspensionReason"
 value={suspensionReason}
 onChange={(e) => setSuspensionReason(e.target.value)}
 placeholder="Detailed reason for suspension..."
 rows={3}
 className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
 />

 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowSuspendModal(false)}>
 Cancel
 </Button>
 <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSuspend}>
 Suspend Provider
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
