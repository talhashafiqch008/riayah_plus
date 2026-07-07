
import { useState, useEffect } from 'react';
import {
 FileText,
 Plus,
 Search,
 ClipboardList,
 ChevronRight,
 Download,
 X,
 Calendar,
 ArrowUpRight,
 Clock,
 User,
 CheckCircle2,
 Eye,
 Trash2,
 LucideIcon
} from 'lucide-react';
import { createReport, deleteReport, getProviderClients, getReports } from '@/lib/api';
import { isApiError } from '@/lib/errors';
import { toast } from 'react-hot-toast';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";




// --- Types ---
interface Report {
 id: number;
 client: {
 id: number;
 name: string;
 avatar: string;
 };
 booking: {
 id: number;
 date: string;
 };
 type: string;
 details: string;
 status: string;
 createdAt: string;
 adminNotes?: string | null;
}

interface ProviderClient {
 id: number;
 fullName: string;
 avatar?: string;
}

// --- Custom Components ---

function CustomSelect({ label, icon: Icon, value, options, onChange, placeholder }: {
 label: string,
 icon: LucideIcon,
 value: string | number | null,
 options: { label: string, value: string | number | null }[],
 onChange: (val: string | number | null) => void,
 placeholder: string
}) {
 const [isOpen, setIsOpen] = useState(false);

 // Find label for current value
 const selectedOption = options.find(opt => opt.value === value);

 return (
 <div className="space-y-3 group relative z-20">
 <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider ml-1 group-focus-within:text-teal-600 transition-colors">{label}</label>
 <div className="relative">
 {/* Trigger */}
 <div role="button" tabIndex={0}
 onClick={() => setIsOpen(!isOpen)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`relative w-full rounded-2xl border bg-stone-50 pl-4 pr-4 py-4 text-stone-900 font-bold cursor-pointer transition-all flex items-center justify-between shadow-sm ${isOpen ? 'border-teal-500 bg-white ring-4 ring-teal-500/10' : 'border-stone-200 hover:border-stone-300 hover:bg-white'}`}
 >
 <div className="flex items-center gap-3">
 <div className={`transition-colors ${isOpen ? 'text-teal-500' : 'text-stone-400'}`}>
 <Icon className="size-5" />
 </div>
 <span className="truncate">{selectedOption ? selectedOption.label : <span className="text-stone-400 font-medium">{placeholder}</span>}</span>
 </div>
 <ChevronDownIcon className={`size-4 text-stone-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-teal-500' : ''}`} />
 </div>

 {/* Dropdown Menu */}
 <AnimatePresence>
 {isOpen && (
 <>
 <div className="fixed inset-0 z-10" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={() => setIsOpen(false)} />
 <m.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 transition={{ duration: 0.2, ease: "easeOut" }}
 className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 z-50 overflow-hidden py-2 max-h-60 overflow-y-auto"
 >
 {options.map((option) => (
 <div role="button" tabIndex={0}
 key={option.value}
 onClick={() => { onChange(option.value); setIsOpen(false); }}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 className={`px-5 py-3 cursor-pointer transition-colors font-medium flex items-center justify-between text-sm ${value === option.value ? 'bg-teal-50 text-teal-700' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
 >
 {option.label}
 {value === option.value && <CheckCircle2 className="size-4 text-teal-600" />}
 </div>
 ))}
 </m.div>
 </>
 )}
 </AnimatePresence>
 </div>
 </div>
 )
}

function StatCard({ title, value, icon: Icon, color, trend }: { title: string, value: string, icon: LucideIcon, color: string, trend?: string }) {
 return (
 <div className="relative overflow-hidden bg-white rounded-3xl border border-stone-100 shadow-sm p-6 group hover:shadow-lg transition-all duration-300">
 {/* Background Interaction */}
 <div className={`absolute -right-6 -top-6 size-40 bg-${color}-50/50 rounded-full group-hover:scale-[10] transition-transform duration-700 ease-in-out`} />

 <div className="relative z-10">
 <div className="flex justify-between items-start mb-6">
 <div className={`size-14 rounded-2xl bg-${color}-50 flex items-center justify-center text-${color}-600 group-hover:bg-white group-hover:shadow-md transition-all duration-300 transform group-hover:scale-110`}>
 <Icon className="size-7" />
 </div>
 {trend && (
 <div className="flex flex-col items-end">
 <div className="flex items-center text-emerald-600 bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-bold mb-1 shadow-sm">
 <ArrowUpRight className="size-3 mr-1" />
 {trend}
 </div>
 </div>
 )}
 </div>

 <div>
 <h3 className="text-4xl font-semibold text-stone-900 tracking-tight group-hover:translate-x-1 transition-transform">{value}</h3>
 <p className="text-sm font-bold text-stone-500 mt-1 uppercase tracking-wide">{title}</p>
 </div>
 </div>
 </div>
 );
}

function ReportCard({ report, onView, onDelete }: { report: Report, onView: (r: Report) => void, onDelete: (id: number) => void }) {
 const statusColors: Record<string, string> = {
 'pending': 'bg-amber-50 text-amber-700 border-amber-100',
 'resolved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
 'dismissed': 'bg-stone-50 text-stone-600 border-stone-100',
 };

 return (
 <div className="group bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-lg hover:border-teal-100/50 transition-all duration-300">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-4">
 <div className="size-12 rounded-2xl bg-stone-50 flex items-center justify-center text-teal-800 font-bold text-lg group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
 <FileText className="size-6" />
 </div>
 <div>
 <h4 className="font-semibold text-stone-900 group-hover:text-teal-700 transition-colors text-lg">{report.type}</h4>
 <div className="flex items-center gap-2 mt-1 text-sm text-teal-800">
 <span className="flex items-center gap-1 font-medium bg-stone-50 px-2 py-0.5 rounded-md">
 <User className="size-3" />
 {report.client?.name || 'Unknown'}
 </span>
 <span className="text-stone-300">•</span>
 <span className="flex items-center gap-1">
 <Calendar className="size-3" />
 {new Date(report.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>

 </div>

 <div className="mt-4 pt-4 border-t border-stone-50">
 <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{report.details}</p>
 </div>

 <div className="flex items-center justify-end gap-2 mt-4">
 <button
 onClick={() => onView(report)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-50 hover:text-teal-600 transition-colors"
 >
 <Eye className="size-4" />
 View
 </button>
 {report.status === 'pending' && (
 <button
 onClick={() => onDelete(report.id)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-red-700 hover:bg-red-50 hover:text-red-500 transition-colors"
 >
 <Trash2 className="size-4" />
 Delete
 </button>
 )}
 </div>
 </div>
 );
}

export default function ReportsPage() {
 const [reports, setReports] = useState<Report[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState("");
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [activeFilter, setActiveFilter] = useState('All');
 const [selectedReport, setSelectedReport] = useState<Report | null>(null);

 // Form State
 const [reportType, setReportType] = useState("");
 const [selectedClientId, setSelectedClientId] = useState<number | "">("");
 const [reportDetails, setReportDetails] = useState("");
 const [clients, setClients] = useState<ProviderClient[]>([]);

 useEffect(() => {
 loadReports();
 loadClients();
 }, []);

 const loadReports = async () => {
 try {
 const response = await getReports();
 if (response.success && Array.isArray(response.reports)) {
 setReports(response.reports);
 } else {
 setReports([]);
 }
 } catch (err) {
 console.error(err);
 if (isApiError(err)) {
 toast.error(err.message || "Failed to load reports");
 } else {
 toast.error("Failed to load reports");
 }
 } finally {
 setLoading(false);
 }
 };

 const loadClients = async () => {
 try {
 const data = await getProviderClients();
 if (data && data.success && Array.isArray(data.clients)) {
 setClients(data.clients);
 } else if (Array.isArray(data)) {
 setClients(data);
 }
 } catch (error) {
 console.error("Failed to load clients", error);
 }
 }

 const handleDeleteReport = async (id: number) => {
 if (!confirm("Are you sure you want to delete this report?")) return;

 const toastId = toast.loading("Deleting…");
 try {
 await deleteReport(id);
 toast.success("Report deleted", { id: toastId });
 loadReports();
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || "Failed to delete report", { id: toastId });
 } else {
 toast.error("Failed to delete report", { id: toastId });
 }
 }
 };

 const handleCreateReport = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 await createReport({
 client_id: Number(selectedClientId),
 type: reportType,
 details: reportDetails
 });
 toast.success("Report submitted successfully");
 setIsCreateOpen(false);
 setReportType("");
 setSelectedClientId("");
 setReportDetails("");
 loadReports();
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || "Failed to create report");
 } else {
 toast.error("Failed to create report");
 }
 } finally {
 setLoading(false);
 }
 };

 const filteredReports = reports.filter(r => {
 const matchesClient = r.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesType = r.type?.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesSearch = matchesClient || matchesType;
 const matchesFilter = activeFilter === 'All' || r.status?.toLowerCase() === activeFilter.toLowerCase();
 return matchesSearch && matchesFilter;
 });

 const reportTypeOptions = [
 { label: 'Behavior Issue', value: 'behavior' },
 { label: 'Payment Issue', value: 'payment' },
 { label: 'Other', value: 'other' }
 ];

 const clientOptions = clients.map(client => ({
 label: client.fullName, // Using fullName from API
 value: client.id
 }));

 const statusColors: Record<string, string> = {
 'pending': 'bg-amber-50 text-amber-700 border-amber-100',
 'resolved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
 'dismissed': 'bg-stone-50 text-stone-600 border-stone-100',
 };

 return (
 <div className="max-w-7xl mx-auto space-y-8 pb-10">
 {/* Header Section */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">Reports & Docs</h1>
 <p className="text-stone-500 mt-2 text-lg">Manage medical records, incidents, and daily logs.</p>
 </div>
 <div className="flex gap-3">
 <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-all shadow-sm">
 <Download className="size-4" />
 Export All
 </button>
 <button
 onClick={() => setIsCreateOpen(true)}
 className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 transition-all shadow-md"
 >
 <Plus className="size-5" />
 New Report
 </button>
 </div>
 </div>

 {/* Stats Overview */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <StatCard
 title="Total Reports"
 value={reports.length.toString()}
 icon={FileText}
 color="blue"
 />
 <StatCard
 title="Pending Review"
 value={reports.filter(r => r.status === 'pending').length.toString()}
 icon={Clock}
 color="amber"
 />
 <StatCard
 title="Resolved"
 value={reports.filter(r => r.status === 'resolved').length.toString()}
 icon={CheckCircle2}
 color="emerald"
 />
 </div>

 {/* Content Area */}
 <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 min-h-[500px]">
 {/* Search & Filter Bar */}
 <div className="flex flex-col sm:flex-row gap-4 mb-8">
 <div className="relative flex-1">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search reports by patient, type…"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-stone-400 font-bold"
 />
 </div>
 <div className="flex p-1 bg-stone-100 rounded-xl">
 {['All', 'Pending', 'Resolved', 'Dismissed'].map((filter) => (
 <button
 key={filter}
 onClick={() => setActiveFilter(filter)}
 className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFilter === filter ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700' }`}
 >
 {filter}
 </button>
 ))}
 </div>
 </div>

 {/* Reports Grid */}
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="size-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
 <p className="text-stone-400 font-medium">Loading records…</p>
 </div>
 ) : filteredReports.length === 0 ? (
 <div className="text-center py-20">
 <div className="size-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
 <ClipboardList className="size-8" />
 </div>
 <h3 className="text-lg font-semibold text-stone-900">No reports found</h3>
 <p className="text-stone-500 mt-1 max-w-sm mx-auto">Try adjusting your filters or search terms, or create a new report.</p>
 <button
 onClick={() => { setSearchTerm(''); setActiveFilter('All'); }}
 className="mt-4 text-teal-600 font-bold hover:underline"
 >
 Clear filters
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {filteredReports.map((report) => (
 <ReportCard
 key={report.id}
 report={report}
 onView={setSelectedReport}
 onDelete={handleDeleteReport}
 />
 ))}
 </div>
 )}
 </div>

 {/* Create Report Modal */}
 <AnimatePresence>
 {isCreateOpen && (
 <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: "spring", duration: 0.5 }}
 className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden overflow-visible"
 >
 <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
 <div className="flex gap-4 items-center">
 <div className="size-12 rounded-2xl bg-teal-100/50 flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
 <Plus className="size-6" />
 </div>
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">New Report</h2>
 <p className="text-stone-500 text-sm mt-1">Submit a new report regarding a client.</p>
 </div>
 </div>
 <button onClick={() => setIsCreateOpen(false)} className="p-2 bg-white rounded-xl border border-stone-200 text-red-700 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm">
 <X className="size-5" />
 </button>
 </div>

 <form onSubmit={handleCreateReport}>
 <div className="p-8 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
 <CustomSelect
 label="Report Type"
 icon={ClipboardList}
 value={reportType}
 options={reportTypeOptions}
 onChange={(val) => setReportType(val === null ? '' : String(val))}
 placeholder="Select Type"
 />
 <CustomSelect
 label="Patient (Client)"
 icon={User}
 value={selectedClientId}
 options={clientOptions}
 onChange={(val) => setSelectedClientId(val === null ? '' : (typeof val === 'number' ? val : Number(val)))}
 placeholder="Select Client"
 />
 </div>

 <div className="space-y-3 group">
 <label htmlFor="details" className="block text-xs font-bold text-stone-500 uppercase tracking-wider ml-1 group-focus-within:text-teal-600 transition-colors">Details</label>
 <textarea id="details"
 rows={6}
 className="w-full rounded-2xl border-2 border-stone-200 px-5 py-4 bg-stone-50 text-stone-900 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none font-medium transition-all resize-none placeholder:text-stone-400"
 placeholder="Describe the incident or reason for this report…"
 required
 value={reportDetails}
 onChange={(e) => setReportDetails(e.target.value)}
 ></textarea>
 </div>
 </div>

 <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
 <button
 type="button"
 onClick={() => setIsCreateOpen(false)}
 className="px-6 py-3 text-sm font-bold text-stone-600 hover:bg-stone-200/50 rounded-xl transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading}
 className="px-8 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {loading ? (
 <>
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Submitting…
 </>
 ) : (
 <>Submit Report</>
 )}
 </button>
 </div>
 </form>
 </m.div>
 </div>
 )}
 </AnimatePresence>

 {/* View Report Modal */}
 <AnimatePresence>
 {selectedReport && (
 <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: "spring", duration: 0.5 }}
 className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
 >
 <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50">
 <div className="flex items-center gap-4">
 <div className="size-12 rounded-2xl bg-teal-100/50 flex items-center justify-center text-teal-600">
 <FileText className="size-6" />
 </div>
 <h2 className="text-xl font-semibold text-stone-900">{selectedReport.type}</h2>
 </div>
 <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-stone-200/50 rounded-xl transition-colors">
 <X className="size-5 text-stone-500" />
 </button>
 </div>
 <div className="p-8 space-y-6">
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Client</p>
 <p className="font-bold text-stone-900 text-lg flex items-center gap-2">
 <User className="size-5 text-teal-500" />
 {selectedReport.client?.name || 'Unknown'}
 </p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Submited On</p>
 <p className="font-bold text-stone-900 text-lg flex items-center gap-2">
 <Calendar className="size-5 text-teal-500" />
 {new Date(selectedReport.createdAt).toLocaleString()}
 </p>
 </div>
 <div className="space-y-2">
 <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Details</p>
 <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-stone-700 leading-relaxed">
 {selectedReport.details}
 </div>
 </div>

 </div>
 <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end">
 <button
 onClick={() => setSelectedReport(null)}
 className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-100 transition-all shadow-sm"
 >
 Close
 </button>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}

// Icon helper
function ChevronDownIcon({ className }: { className?: string }) {
 return (
 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
 <path d="m6 9 6 6 6-6" />
 </svg>
 );
}
