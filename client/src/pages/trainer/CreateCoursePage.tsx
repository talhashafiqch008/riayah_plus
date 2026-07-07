
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from "lucide-react";
import { createCourse } from "@/lib/api/courses";
import toast from "react-hot-toast";


export default function CreateCoursePage() {
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [lessons, setLessons] = useState([{ title: "", duration: "" }]);
 const [formData, setFormData] = useState({
 title: "",
 description: "",
 duration: "",
 category: "Home Care",
 level: "Beginner",
 });

 const addLesson = () => {
 setLessons([...lessons, { title: "", duration: "" }]);
 };

 const removeLesson = (index: number) => {
 setLessons(lessons.filter((_, i) => i !== index));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSubmitting(true);
 try {
 const payload = {
 title: formData.title,
 description: formData.description,
 duration: formData.duration,
 category: formData.category,
 level: formData.level,
 status: "draft" as const,
 // TODO: Consider combining iterations
 lessons: lessons
 .filter((l) => l.title.trim() !== "")
 .map((l) => ({ title: l.title, duration: l.duration })),
 };
 await createCourse(payload);
 toast.success("Course created successfully!");
 navigate("/trainer/courses");
 } catch {
 toast.error("Failed to create course. Please try again.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <button
 onClick={() => navigate(-1)}
 className="rounded-md p-2 hover:bg-stone-100"
 >
 <ArrowLeft className="size-5" />
 </button>
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Create New Course</h1>
 <p className="text-sm text-stone-500">Design a new training course</p>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Course Details</h2>

 <div className="space-y-4">
 <div>
 <label htmlFor="input-src-app-trainer-courses-create-page-tsx-77-79" className="block text-sm font-medium text-stone-700 mb-2">
 Course Title *
 </label>
 <input
 type="text"
 required
 value={formData.title}
 onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 placeholder="e.g., Introduction to Home Care"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-trainer-courses-create-page-tsx-91-93" className="block text-sm font-medium text-stone-700 mb-2">
 Description *
 </label>
 <textarea
 required
 rows={4}
 value={formData.description}
 onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 placeholder="Describe what students will learn..."
 />
 </div>

 <div className="grid gap-4 md:grid-cols-3">
 <div>
 <label htmlFor="input-src-app-trainer-courses-create-page-tsx-106-108" className="block text-sm font-medium text-stone-700 mb-2">
 Duration *
 </label>
 <input
 type="text"
 required
 value={formData.duration}
 onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 placeholder="e.g., 8 weeks"
 />
 </div>

 <div>
 <label htmlFor="input-src-app-trainer-courses-create-page-tsx-120-122" className="block text-sm font-medium text-stone-700 mb-2">
 Category *
 </label>
 <select
 value={formData.category}
 onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 >
 <option>Home Care</option>
 <option>Patient Safety</option>
 <option>Medical Equipment</option>
 <option>Communication Skills</option>
 </select>
 </div>

 <div>
 <label htmlFor="input-src-app-trainer-courses-create-page-tsx-136-138" className="block text-sm font-medium text-stone-700 mb-2">
 Level *
 </label>
 <select
 value={formData.level}
 onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 >
 <option>Beginner</option>
 <option>Intermediate</option>
 <option>Advanced</option>
 </select>
 </div>
 </div>
 </div>
 </div>

 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-stone-900">Course Lessons</h2>
 <button
 type="button"
 onClick={addLesson}
 className="flex items-center rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 <Plus className="mr-1 size-4" />
 Add Lesson
 </button>
 </div>

 <div className="space-y-3">
 {lessons.map((lesson, index) => (
 <div key={lesson.title || index} className="flex items-center gap-3">
 <input
 type="text"
 placeholder="Lesson title"
 value={lesson.title}
 onChange={(e) => {
 const newLessons = [...lessons];
 newLessons[index].title = e.target.value;
 setLessons(newLessons);
 }}
 className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 <input
 type="text"
 placeholder="Duration"
 value={lesson.duration}
 onChange={(e) => {
 const newLessons = [...lessons];
 newLessons[index].duration = e.target.value;
 setLessons(newLessons);
 }}
 className="w-32 rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 {lessons.length > 1 && (
 <button
 type="button"
 onClick={() => removeLesson(index)}
 className="rounded-md p-2 text-red-600 hover:bg-red-50"
 >
 <X className="size-5" />
 </button>
 )}
 </div>
 ))}
 </div>
 </div>

 <div className="flex justify-end gap-3">
 <button
 type="button"
onClick={() => navigate(-1)}
 className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting}
 className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? 'Creating...' : 'Create Course'}
 </button>
 </div>
 </form>
 </div>
 );
}
