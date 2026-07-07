
import { useEffect, useState } from "react";
import { TrendingUp, Users, BookOpen, Award, Calendar } from "lucide-react";
import { getTrainerAnalytics } from "@/lib/api/courses";
import type { TrainerAnalytics, CoursePerformance, MonthlyEnrollment } from "@/types/api";
import toast from "react-hot-toast";


export default function TrainerAnalyticsPage() {
 const [analytics, setAnalytics] = useState<TrainerAnalytics | null>(null);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 async function loadAnalytics() {
 try {
 const response = await getTrainerAnalytics();
 setAnalytics(response.data || null);
 } catch {
 toast.error("Failed to load analytics");
 } finally {
 setIsLoading(false);
 }
 }
 loadAnalytics();
 }, []);

 const stats = analytics
 ? [
 { label: "Total Students", value: String(analytics.total_students || 0), change: "", icon: Users, color: "blue" },
 { label: "Active Courses", value: String(analytics.active_courses || 0), change: "", icon: BookOpen, color: "teal" },
 { label: "Completion Rate", value: `${analytics.completion_rate || 0}%`, change: "", icon: TrendingUp, color: "green" },
 { label: "Certificates Issued", value: String(analytics.certificates_issued || 0), change: "", icon: Award, color: "yellow" },
 ]
 : [
 { label: "Total Students", value: "0", change: "", icon: Users, color: "blue" },
 { label: "Active Courses", value: "0", change: "", icon: BookOpen, color: "teal" },
 { label: "Completion Rate", value: "0%", change: "", icon: TrendingUp, color: "green" },
 { label: "Certificates Issued", value: "0", change: "", icon: Award, color: "yellow" },
 ];

 const coursePerformance: CoursePerformance[] = analytics?.course_performance || [];
 const monthlyEnrollments: MonthlyEnrollment[] = analytics?.monthly_enrollments || [];

 return (
 <div className="gap-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Analytics</h1>
 <p className="text-sm text-stone-500">Track your training performance and student progress</p>
 </div>

 <div className="grid gap-6 md:grid-cols-4">
 {stats.map((stat) => (
 <div key={stat.label} className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-stone-500">{stat.label}</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">{stat.value}</p>
 {stat.change && <p className="mt-1 text-sm text-green-600">{stat.change}</p>}
 </div>
 <div className={`rounded-xl bg-${stat.color}-50 p-3`}>
 <stat.icon className={`size-6 text-${stat.color}-600`} />
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Course Performance</h2>
 {isLoading ? (
 <div className="py-8 text-center text-sm text-stone-500">Loading performance data…</div>
 ) : coursePerformance.length === 0 ? (
 <div className="py-8 text-center text-sm text-stone-500">No course performance data yet.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-stone-200">
 <thead>
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Course
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Students
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Completion Rate
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
 Avg Grade
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-stone-200">
 {coursePerformance.map((course) => (
 <tr key={course.course} className="hover:bg-stone-50">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
 {course.course}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
 {course.students}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="w-full bg-stone-200 rounded-full h-2 mr-2">
 <div
 className="bg-teal-600 h-2 rounded-full"
 style={{ width: `${course.completion}%` }}
 />
 </div>
 <span className="text-sm text-stone-900">{course.completion}%</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900">
 {course.avg_grade}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Monthly Enrollments</h2>
 {isLoading ? (
 <div className="py-8 text-center text-sm text-stone-500">Loading enrollment data…</div>
 ) : monthlyEnrollments.length === 0 ? (
 <div className="py-8 text-center text-sm text-stone-500">No enrollment data yet.</div>
 ) : (
 <div className="h-64 flex items-end justify-between gap-x-2">
 {monthlyEnrollments.map((data) => (
 <div key={data.month} className="flex-1 flex flex-col items-center">
 <div className="w-full bg-teal-600 rounded-t-lg hover:bg-teal-500 transition-colors"
 style={{ height: `${(data.enrollments / 50) * 100}%` }}>
 </div>
 <p className="mt-2 text-sm font-medium text-stone-900">{data.enrollments}</p>
 <p className="text-xs text-stone-500">{data.month}</p>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Top Performing Students</h2>
 <div className="py-8 text-center text-sm text-stone-500">
 Student leaderboard will appear here as enrollments grow.
 </div>
 </div>
 </div>
 );
}
