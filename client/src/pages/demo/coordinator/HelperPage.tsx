"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockProviders, mockCarePlans } from "@/demo/coordinator/data";
import { StatusBadge, StatCard, TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import { DemoTask } from "@/demo/coordinator/types";
import { exportProviderSchedule } from "@/demo/coordinator/pdf-export";
import {
  CheckCircle,
  Clock,
  Play,
  Video,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Star,
  UserCheck,
  Home,
  Utensils,
  Pill,
  Heart,
  Download,
  BookOpen,
  Lightbulb,
  ThumbsUp,
  MessageSquare,
  Phone,
  Calendar,
  TrendingUp,
  Award,
  ArrowUpRight,
} from "lucide-react";

const taskIcons: Record<string, typeof Home> = {
  "Meal Preparation": Utensils,
  "Medication": Pill,
  "Walking": Heart,
  default: Home,
};



export default function DemoCoordinatorHelperView() {
  const [helper] = useState(mockProviders[2]);
  const [tasks, setTasks] = useState<DemoTask[]>(
    mockCarePlans.flatMap((plan) => plan.tasks.filter((task) => task.assignedTo === helper.name || task.role === "helper"))
  );
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});

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
      prev.map((task) => (task.id === taskId ? { ...task, notes: taskNotes[taskId] || task.notes } : task))
    );
    setExpandedTask(null);
  };

  const pendingTasks = tasks.filter((task) => task.status === "pending" || task.status === "assigned");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");

  const trainingVideos = [
    { id: "vid-1", title: "Safe Meal Preparation for Elderly", duration: "3:45", category: "Daily Living" },
    { id: "vid-2", title: "Medication Administration Basics", duration: "5:20", category: "Clinical" },
    { id: "vid-3", title: "Fall Prevention Techniques", duration: "4:15", category: "Safety" },
    { id: "vid-4", title: "Proper Lifting and Transfer", duration: "6:00", category: "Safety" },
  ];

  const helperTips = [
    "Always wash hands before and after patient contact",
    "Report any changes in patient condition immediately",
    "Follow the task instructions exactly as shown in videos",
    "Be kind and patient — your care makes a difference",
    "Keep the patient's environment clean and safe",
    "Document any unusual observations in the task notes",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Helper Dashboard</h1>
          <p className="text-slate-600 mt-1">Simple task list, guided instructions, and completion reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportProviderSchedule(helper.name)} className="gap-2 shadow-sm">
            <Download className="w-4 h-4" />
            Export Schedule
          </Button>
          <div className="text-right">
            <p className="font-semibold text-slate-900">{helper.name}</p>
            <p className="text-sm text-slate-600">{helper.role}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center text-2xl shadow-sm">
            {helper.avatar}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Clock} value={pendingTasks.length} label="Tasks to Do" color="#f59e0b" trend="-1" />
        <StatCard icon={CheckCircle} value={completedTasks.length} label="Done Today" color="#10b981" trend="+3" />
        <StatCard icon={Star} value={helper.rating} label="Your Rating" color="#8b5cf6" />
      </div>

      <TabNav
        tabs={[
          { id: "tasks", label: "My Tasks" },
          { id: "training", label: "Training" },
          { id: "tips", label: "Tips" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "tasks" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>My Tasks</h2>
          <div className="space-y-4">
            {tasks.map((task) => {
              const Icon = taskIcons[task.title] || taskIcons.default;
              return (
                <Card key={task.id} className={`border-l-4 ${task.status === "completed" ? "border-l-green-500" : "border-l-amber-500"} hover:shadow-lg hover:-translate-y-0.5 motion-safe:transition-all duration-300`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${task.status === "completed" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900 text-lg">{task.title}</h4>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{task.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            {task.assignedTo || "You"}
                          </span>
                          <span className="capitalize">{task.frequency}</span>
                        </div>

                        {task.status !== "completed" && (
                          <div className="flex gap-3 mt-4 flex-wrap">
                            {task.status === "pending" || task.status === "assigned" ? (
                              <Button size="sm" onClick={() => handleStartTask(task.id)} className="gap-2 rounded-lg shadow-sm">
                                <Play className="w-3 h-3" />
                                Start Task
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => handleCompleteTask(task.id)} className="gap-2 bg-green-600 hover:bg-green-700 rounded-lg shadow-sm">
                                <CheckCircle className="w-3 h-3" />
                                Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowVideo(showVideo === task.id ? null : task.id)}
                              className="gap-2 rounded-lg"
                            >
                              <Video className="w-3 h-3" />
                              Watch Guide
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                              className="gap-2 rounded-lg"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Notes
                            </Button>
                          </div>
                        )}

                        {showVideo === task.id && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-sm font-semibold text-slate-700 mb-3">Training Video</p>
                            <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                              <div className="text-center text-white">
                                <Video className="w-10 h-10 mx-auto mb-3" />
                                <p className="text-sm font-semibold">Video Player (Demo)</p>
                                <p className="text-xs text-slate-400 mt-1">How to: {task.title}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-3">
                              Follow the video instructions carefully. Pause and rewind as needed.
                            </p>
                          </div>
                        )}

                        {expandedTask === task.id && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-sm font-semibold text-slate-700 mb-3">Task Notes</p>
                            <textarea
                              value={taskNotes[task.id] || ""}
                              onChange={(e) => setTaskNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                              placeholder="Enter any observations, issues, or comments about this task..."
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

                        {task.status === "completed" && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Completed at {task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : "N/A"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {tasks.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No tasks assigned yet. Check back later.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "training" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>Training Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-300 border-l-4 border-l-transparent hover:border-l-red-500 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Video className="w-7 h-7 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm">{video.title}</h4>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {video.duration}
                        </span>
                        <Badge variant="outline" className="text-xs font-semibold">{video.category}</Badge>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shadow-sm">
                      <Play className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "tips" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>Helper Tips</h2>
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 shadow-sm">
            <CardContent className="p-5">
              <div className="space-y-4">
                {helperTips.map((tip) => (
                  <div key={tip} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-amber-600" />
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center shadow-sm">
                  <Award className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Performance</h3>
                  <p className="text-sm text-slate-600">Your task completion stats</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tasks Completed</span>
                  <span className="font-semibold text-slate-900">{completedTasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">In Progress</span>
                  <span className="font-semibold text-slate-900">{inProgressTasks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Pending</span>
                  <span className="font-semibold text-slate-900">{pendingTasks.length}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 mt-2">
                  <div className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-colors transition-transform duration-500" style={{ width: `${tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-slate-600 text-center font-medium">
                  {tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion rate
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
