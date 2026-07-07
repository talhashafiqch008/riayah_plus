
import { useEffect, useState } from "react";
import { Search, Mail, Phone, Award } from "lucide-react";
import { getTrainerStudents } from "@/lib/api/courses";
import toast from "react-hot-toast";


interface Student {
 id: number;
 name: string;
 email: string;
 phone: string;
 enrolled_courses: number;
 completed_courses: number;
 progress: number;
 status: string;
}

export default function TrainerStudentsPage() {
 const [searchQuery, setSearchQuery] = useState("");
 const [students, setStudents] = useState<Student[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 async function loadStudents() {
 try {
 const response = await getTrainerStudents();
 setStudents(response.data || []);
 } catch {
 toast.error("Failed to load students");
 } finally {
 setIsLoading(false);
 }
 }
 loadStudents();
 }, []);

 const filteredStudents = students.filter((student) =>
 student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 student.email.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Students</h1>
 <p className="text-sm text-stone-500">Manage and track student progress</p>
 </div>

 <div className="flex w-full max-w-md items-center rounded-lg border bg-white px-3 py-2">
 <Search className="mr-2 size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search students..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent text-sm focus:outline-none"
 />
 </div>

 {isLoading ? (
 <div className="py-12 text-center text-sm text-stone-500">Loading students…</div>
 ) : filteredStudents.length === 0 ? (
 <div className="py-12 text-center text-sm text-stone-500">No students found.</div>
 ) : (
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {filteredStudents.map((student) => (
 <div key={`${student.id}-${student.name}`} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="size-12 rounded-full bg-teal-100 flex items-center justify-center">
 <span className="text-lg font-semibold text-teal-700">
 {student.name.split(" ").map((n) => n[0]).join("")}
 </span>
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">{student.name}</h3>
 <span className="text-xs text-green-600 font-medium">{student.status}</span>
 </div>
 </div>
 </div>

 <div className="space-y-2 text-sm text-stone-600 mb-4">
 <div className="flex items-center">
 <Mail className="mr-2 size-4 text-stone-400" />
 <span className="truncate">{student.email}</span>
 </div>
 <div className="flex items-center">
 <Phone className="mr-2 size-4 text-stone-400" />
 <span>{student.phone}</span>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex items-center justify-between text-sm">
 <span className="text-stone-600">Enrolled Courses</span>
 <span className="font-semibold text-stone-900">{student.enrolled_courses}</span>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="text-stone-600">Completed</span>
 <span className="font-semibold text-stone-900">{student.completed_courses}</span>
 </div>
 <div>
 <div className="flex items-center justify-between text-sm mb-1">
 <span className="text-stone-600">Overall Progress</span>
 <span className="font-semibold text-stone-900">{student.progress}%</span>
 </div>
 <div className="w-full bg-stone-200 rounded-full h-2">
 <div
 className="bg-teal-600 h-2 rounded-full"
 style={{ width: `${student.progress}%` }}
 />
 </div>
 </div>
 </div>

 <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-stone-600">
 <Award className="size-4 text-yellow-500" />
 <span>{student.completed_courses} certificates earned</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
