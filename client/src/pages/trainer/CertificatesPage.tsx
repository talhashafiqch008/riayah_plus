
import { useEffect, useState } from "react";
import { Award, Download, Eye, Calendar, User, Plus } from "lucide-react";
import { getMyCertificates } from "@/lib/api/courses";
import toast from "react-hot-toast";


interface Certificate {
 id: number;
 student_name: string;
 course_name: string;
 issue_date: string;
 certificate_number: string;
 grade: string;
 status: string;
}

export default function TrainerCertificatesPage() {
 const [certificates, setCertificates] = useState<Certificate[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 async function loadCertificates() {
 try {
 const response = await getMyCertificates();
 setCertificates(response.data || []);
 } catch {
 toast.error("Failed to load certificates");
 } finally {
 setIsLoading(false);
 }
 }
 loadCertificates();
 }, []);

 const gradeACount = certificates.filter((c) => c.grade && c.grade.startsWith("A")).length;

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Certificates</h1>
 <p className="text-sm text-stone-500">Manage student certificates and achievements</p>
 </div>
 <button className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
 <Plus className="mr-2 size-4" />
 Issue Certificate
 </button>
 </div>

 <div className="grid gap-6 md:grid-cols-4">
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Total Issued</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">{certificates.length}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">This Month</p>
 <p className="mt-2 text-3xl font-bold text-teal-600">{certificates.length}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Grade A</p>
 <p className="mt-2 text-3xl font-bold text-green-600">{gradeACount}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Pending</p>
 <p className="mt-2 text-3xl font-bold text-orange-600">0</p>
 </div>
 </div>

 {isLoading ? (
 <div className="py-12 text-center text-sm text-stone-500">Loading certificates…</div>
 ) : certificates.length === 0 ? (
 <div className="text-center py-12 rounded-xl border bg-white">
 <Award className="mx-auto size-12 text-stone-400 mb-4" />
 <p className="text-stone-500">No certificates issued yet</p>
 </div>
 ) : (
 <div className="grid gap-4">
 {certificates.map((cert) => (
 <div key={cert.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-x-3 mb-3">
 <div className="rounded-lg bg-yellow-50 p-2">
 <Award className="size-5 text-yellow-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{cert.course_name}</h3>
 <p className="text-sm text-stone-500">Certificate #{cert.certificate_number}</p>
 </div>
 </div>

 <div className="grid gap-2 text-sm text-stone-600">
 <div className="flex items-center">
 <User className="mr-2 size-4 text-stone-400" />
 <span>{cert.student_name}</span>
 </div>
 <div className="flex items-center">
 <Calendar className="mr-2 size-4 text-stone-400" />
 <span>
 {cert.issue_date
 ? new Date(cert.issue_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
 : "N/A"}
 </span>
 </div>
 <div className="flex items-center gap-x-2">
 <span className="text-stone-600">Grade:</span>
 <span className={`font-semibold ${cert.grade?.startsWith("A") ? "text-green-600" : cert.grade?.startsWith("B") ? "text-blue-600" : "text-stone-600" }`}>
 {cert.grade}
 </span>
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-y-2 ml-6">
 <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 text-center">
 {cert.status}
 </span>
 <button className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
 <Eye className="mr-2 size-4" />
 View
 </button>
 <button className="flex items-center rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
 <Download className="mr-2 size-4" />
 Download
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
