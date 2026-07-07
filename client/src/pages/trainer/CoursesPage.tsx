
import { useEffect, useState } from "react";
import { Plus, BookOpen, Users, Clock, Edit, Trash2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { getTrainerCourses, deleteCourse } from "@/lib/api/courses";
import toast from "react-hot-toast";


interface TrainerCourse {
 id: number;
 title: string;
 description: string;
 students: number;
 duration: string;
 status: string;
 completion: number;
 lessons: number;
}

export default function TrainerCoursesPage() {
 const navigate = useNavigate();
 const [courses, setCourses] = useState<TrainerCourse[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [deletingId, setDeletingId] = useState<number | null>(null);

 useEffect(() => {
 async function loadCourses() {
 try {
 const response = await getTrainerCourses();
 setCourses(response.data || []);
 } catch {
 toast.error("Failed to load courses");
 } finally {
 setIsLoading(false);
 }
 }
 loadCourses();
 }, []);

 async function handleDelete(id: number) {
 setDeletingId(id);
 try {
 await deleteCourse(String(id));
 setCourses((prev) => prev.filter((c) => c.id !== id));
 toast.success("Course deleted");
 } catch {
 toast.error("Failed to delete course");
 } finally {
 setDeletingId(null);
 }
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">My Courses</h1>
 <p className="text-sm text-stone-500">Manage your training courses</p>
 </div>
 <button
 onClick={() => navigate("/trainer/courses/create")}
 className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 <Plus className="mr-2 size-4" />
 Create Course
 </button>
 </div>

 {isLoading ? (
 <div className="py-12 text-center text-sm text-stone-500">Loading courses…</div>
 ) : courses.length === 0 ? (
 <div className="py-12 text-center text-sm text-stone-500">No courses yet. Create your first course to get started.</div>
 ) : (
 <div className="grid gap-6">
 {courses.map((course) => (
 <div key={course.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <div className="rounded-lg bg-teal-50 p-2">
 <BookOpen className="size-5 text-teal-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{course.title}</h3>
 <p className="text-sm text-stone-500">{course.description}</p>
 </div>
 </div>

 <div className="mt-4 grid grid-cols-3 gap-4">
 <div className="flex items-center text-sm text-stone-600">
 <Users className="mr-2 size-4 text-stone-400" />
 <span>{course.students} students</span>
 </div>
 <div className="flex items-center text-sm text-stone-600">
 <Clock className="mr-2 size-4 text-stone-400" />
 <span>{course.duration}</span>
 </div>
 <div className="flex items-center text-sm text-stone-600">
 <BookOpen className="mr-2 size-4 text-stone-400" />
 <span>{course.lessons} lessons</span>
 </div>
 </div>

 <div className="mt-4">
 <div className="flex items-center justify-between text-sm mb-2">
 <span className="text-stone-600">Average Completion</span>
 <span className="font-semibold text-stone-900">{course.completion}%</span>
 </div>
 <div className="w-full bg-stone-200 rounded-full h-2">
 <div
 className="bg-teal-600 h-2 rounded-full"
 style={{ width: `${course.completion}%` }}
 />
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-2 ml-6">
 <span className={`rounded-full px-3 py-1 text-xs font-semibold text-center ${course.status === "active" ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-700" }`}>
 {course.status}
 </span>
 <button className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
 <Edit className="size-4 inline mr-1" />
 Edit
 </button>
 <button
 onClick={() => handleDelete(course.id)}
 disabled={deletingId === course.id}
 className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
 >
 <Trash2 className="size-4 inline mr-1" />
 {deletingId === course.id ? "Deleting…" : "Delete"}
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
