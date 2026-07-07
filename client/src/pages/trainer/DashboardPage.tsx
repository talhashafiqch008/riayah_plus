import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, Award, TrendingUp, Plus } from "lucide-react";
import { getTrainerCourses, getTrainerAnalytics } from "@/lib/api/courses";
import type { TrainerAnalytics } from "@/types/api";

interface TrainerCourse {
  id: number;
  title: string;
  students: number;
  completion: number;
  status: string;
}

export default function TrainerDashboardPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<TrainerCourse[]>([]);
  const [analytics, setAnalytics] = useState<TrainerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [coursesRes, analyticsRes] = await Promise.all([
          getTrainerCourses(),
          getTrainerAnalytics(),
        ]);
        setCourses(coursesRes.data || []);
        setAnalytics(analyticsRes.data || null);
      } catch {
        setCourses([]);
        setAnalytics(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = analytics
    ? [
        { label: "Total Courses", value: String(analytics.active_courses || 0), icon: BookOpen, color: "blue" },
        { label: "Total Students", value: String(analytics.total_students || 0), icon: Users, color: "emerald" },
        { label: "Certificates Issued", value: String(analytics.certificates_issued || 0), icon: Award, color: "yellow" },
        { label: "Avg. Completion", value: `${analytics.completion_rate || 0}%`, icon: TrendingUp, color: "green" },
      ]
    : [
        { label: "Total Courses", value: "0", icon: BookOpen, color: "blue" },
        { label: "Total Students", value: "0", icon: Users, color: "emerald" },
        { label: "Certificates Issued", value: "0", icon: Award, color: "yellow" },
        { label: "Avg. Completion", value: "0%", icon: TrendingUp, color: "green" },
      ];

  return (
    <div className="gap-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500">Your courses and student overview</p>
        </div>
        <button
          onClick={() => navigate("/trainer/courses/create")}
          className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          <Plus className="mr-2 size-4" />
          Create Course
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">{stat.value}</p>
              </div>
              <div className={`rounded-xl bg-${stat.color}-50 p-3`}>
                <stat.icon className={`size-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">My Courses</h3>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-stone-500">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-500">No courses yet. Create your first course above.</div>
        ) : (
          <div className="gap-y-4">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-start gap-x-4">
                  <div className="rounded-lg bg-teal-50 p-3">
                    <BookOpen className="size-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{course.title}</p>
                    <div className="mt-2 flex items-center gap-x-4 text-xs text-stone-500">
                      <span>{course.students} students</span>
                      <span>•</span>
                      <span>{course.completion}% avg. completion</span>
                    </div>
                    <div className="mt-2 w-48 bg-stone-200 rounded-full h-2">
                      <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${course.completion}%` }} />
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${course.status === "active" ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-700"}`}>
                  {course.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Recent Activity</h3>
        <div className="gap-y-3">
          <div className="flex items-start gap-x-3 text-sm">
            <div className="size-2 rounded-full bg-green-500 mt-1.5" />
            <div>
              <p className="text-stone-900">No recent activity to display</p>
              <p className="text-stone-500 text-xs">Activity will appear here as students progress</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
