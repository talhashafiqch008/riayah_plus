"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockProviders, mockCarePlans } from "@/demo/coordinator/data";
import { StatusBadge, StatCard, ProgressBar, TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import { DemoTask } from "@/demo/coordinator/types";
import { exportProviderSchedule } from "@/demo/coordinator/pdf-export";
import {
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  Star,
  Activity,
  ChevronDown,
  ChevronUp,
  UserCheck,
  MapPin,
  Phone,
  AlertCircle,
  Download,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Stethoscope,
  ClipboardList,
  PhoneCall,
  Video,
  MessageSquare,
  FileBarChart,
  ArrowUpRight,
} from "lucide-react";



export default function DemoCoordinatorProviderView() {
  const [provider] = useState(mockProviders[0]);
  const [tasks, setTasks] = useState<DemoTask[]>(
    mockCarePlans.flatMap((plan) => plan.tasks.filter((task) => task.assignedTo === provider.name))
  );
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [visitNotes, setVisitNotes] = useState<Record<string, string>>({});
  const [showSchedule, setShowSchedule] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(query) ||
      task.status.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const handleStartTask = (taskId: string) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: "in_progress" as const } : task)));
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: "completed" as const, completedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const handleSaveNotes = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, notes: visitNotes[taskId] || task.notes } : task))
    );
    setExpandedTask(null);
  };

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((task) => task.dueDate === today);
  const pendingTasks = tasks.filter((task) => task.status === "pending" || task.status === "assigned");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");

  const schedule = [
    { time: "08:00", task: "Medication Administration", patient: "Ahmad Al-Rashid", status: "completed" },
    { time: "09:30", task: "Morning Physiotherapy Session", patient: "Ahmad Al-Rashid", status: "completed" },
    { time: "11:00", task: "Blood Pressure Monitoring", patient: "Fatima Al-Saud", status: "in_progress" },
    { time: "14:00", task: "Afternoon Exercise Routine", patient: "Ahmad Al-Rashid", status: "pending" },
    { time: "16:00", task: "Evening Medication", patient: "Fatima Al-Saud", status: "pending" },
  ];

  const performance = {
    completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    onTimeRate: 92,
    patientSatisfaction: provider.rating,
    totalPatients: 3,
    totalHours: 45,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Provider Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage your schedule, execute tasks, and submit visit reports</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-48"
          />
          <Button variant="outline" onClick={() => exportProviderSchedule(provider.name)} className="gap-2 shadow-sm">
            <Download className="w-4 h-4" />
            Export Schedule
          </Button>
          <div className="text-right">
            <p className="font-semibold text-slate-900">{provider.name}</p>
            <p className="text-sm text-slate-600">{provider.role}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-2xl shadow-sm">
            {provider.avatar}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} value={todayTasks.length} label="Today's Tasks" color="#3b82f6" />
        <StatCard icon={Clock} value={pendingTasks.length} label="Pending" color="#f59e0b" trend="-2" />
        <StatCard icon={CheckCircle} value={completedTasks.length} label="Completed" color="#10b981" trend="+5" />
        <StatCard icon={Star} value={provider.rating} label="Your Rating" color="#8b5cf6" />
      </div>

      <TabNav
        tabs={[
          { id: "schedule", label: "Schedule" },
          { id: "tasks", label: "Tasks" },
          { id: "patients", label: "Patients" },
          { id: "performance", label: "Performance" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Today&apos;s Schedule</h2>
            <button onClick={() => setShowSchedule(!showSchedule)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Toggle schedule">
              {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {showSchedule && (
            <div className="space-y-4">
              {schedule.map((item) => (
                <Card key={item.time} className={`border-l-4 ${item.status === "completed" ? "border-l-green-500" : "border-l-blue-500"} hover:shadow-lg hover:-translate-y-0.5 motion-safe:transition-all duration-300`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-20 text-center">
                        <p className="text-sm font-bold text-slate-900">{item.time}</p>
                        <div className={`w-3 h-3 rounded-full mx-auto mt-2 ${item.status === "completed" ? "bg-green-500" : "bg-blue-500"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 text-lg">{item.task}</h4>
                          {item.status === "completed" && <CheckCircle className="w-5 h-5 text-green-600" />}
                        </div>
                        <p className="text-sm text-slate-600 flex items-center gap-2 mb-3">
                          <UserCheck className="w-4 h-4" />
                          {item.patient}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-2 rounded-lg">
                            <PhoneCall className="w-3 h-3" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2 rounded-lg">
                            <MapPin className="w-3 h-3" />
                            Navigate
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2 rounded-lg">
                            <Video className="w-3 h-3" />
                            Video
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>Assigned Tasks</h2>
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className={`border-l-4 ${task.status === "completed" ? "border-l-green-500" : "border-l-blue-500"} hover:shadow-lg hover:-translate-y-0.5 motion-safe:transition-all duration-300`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900 text-lg">{task.title}</h4>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="text-sm text-slate-600 mb-3 leading-relaxed">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.dueDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.frequency}
                        </span>
                      </div>
                      {task.notes && (
                        <div className="mt-3 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600">
                          <strong className="text-slate-900">Visit Notes:</strong> {task.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {task.status === "assigned" && (
                        <Button size="sm" onClick={() => handleStartTask(task.id)} className="rounded-lg shadow-sm">
                          Start
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <>
                          <Button size="sm" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} variant="outline" className="rounded-lg">
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button size="sm" onClick={() => handleCompleteTask(task.id)} className="bg-green-600 hover:bg-green-700 rounded-lg shadow-sm">
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {task.status === "completed" && (
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      )}
                    </div>
                  </div>

                  {expandedTask === task.id && task.status === "in_progress" && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="text-sm font-semibold text-slate-700">Visit Notes</label>
                      <textarea
                        value={visitNotes[task.id] || ""}
                        onChange={(e) => setVisitNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                        placeholder="Enter clinical notes, observations, patient response..."
                        className="w-full mt-2 border border-slate-200 rounded-lg px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-3 mt-3">
                        <Button size="sm" onClick={() => handleSaveNotes(task.id)} className="rounded-lg shadow-sm">
                          Save Notes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setExpandedTask(null)} className="rounded-lg">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No tasks assigned to you yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "patients" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>My Patients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockCarePlans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-lg">{plan.patientName}</h4>
                      <p className="text-sm text-slate-600 mb-3">{plan.title}</p>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <Badge className="bg-blue-50 text-blue-700 font-semibold">{plan.tasks.length} tasks</Badge>
                        <Badge className="bg-green-50 text-green-700 font-semibold">{plan.tasks.filter(t => t.status === "completed").length} completed</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="gap-2 rounded-lg">
                          <Phone className="w-3 h-3" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 rounded-lg">
                          <MessageSquare className="w-3 h-3" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 rounded-lg">
                          <FileText className="w-3 h-3" />
                          Notes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Performance Metrics</h2>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Task Completion Rate</span>
                    </div>
                    <ProgressBar progress={performance.completionRate} color="bg-green-500" size="md" showLabel={true} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">On-Time Performance</span>
                    </div>
                    <ProgressBar progress={performance.onTimeRate} color="bg-blue-500" size="md" showLabel={true} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Patient Satisfaction</span>
                    </div>
                    <ProgressBar progress={(performance.patientSatisfaction / 5) * 100} color="bg-blue-500" size="md" showLabel={true} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Provider Profile</h2>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-3xl shadow-sm">
                    {provider.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{provider.name}</h3>
                    <p className="text-sm text-slate-600">{provider.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-bold">{provider.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Specialty</span>
                    <span className="text-sm font-semibold text-slate-900">{provider.specialty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Hourly Rate</span>
                    <span className="text-sm font-semibold text-slate-900">{provider.hourlyRate} SAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Availability</span>
                    <span className="text-sm font-semibold text-slate-900">{provider.availability.join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Patients</span>
                    <span className="text-sm font-semibold text-slate-900">{performance.totalPatients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Hours This Week</span>
                    <span className="text-sm font-semibold text-slate-900">{performance.totalHours}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
