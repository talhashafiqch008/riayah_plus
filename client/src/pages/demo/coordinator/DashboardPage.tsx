"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockPatients, mockCarePlans, mockProviders, mockProgress } from "@/demo/coordinator/data";
import { DemoCarePlan, DemoTask } from "@/demo/coordinator/types";
import { exportCoordinatorReport, exportCarePlanPDF } from "@/demo/coordinator/pdf-export";
import { StatusBadge, StatCard, ProgressRing, LoadingSkeleton, ProgressBar, TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import {
  Users,
  ClipboardList,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  DollarSign,
  Plus,
  UserCheck,
  X,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Star,
  ArrowUpRight,
} from "lucide-react";

function TaskCard({ task, onAssign, providers }: { task: DemoTask; onAssign: (taskId: string, provider: string) => void; providers: typeof mockProviders }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:-translate-y-0.5 motion-safe:transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-slate-900 text-lg">{task.title}</h4>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-sm text-slate-600 mb-3 leading-relaxed">{task.description}</p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize font-medium bg-slate-50">{task.category}</Badge>
            <Badge variant="outline" className="text-xs capitalize font-medium bg-slate-50">{task.frequency}</Badge>
            <Badge variant="outline" className="text-xs capitalize font-medium bg-slate-50">{task.role}</Badge>
          </div>
          {task.assignedTo && (
            <p className="text-sm text-blue-600 mt-3 flex items-center gap-2 font-medium">
              <UserCheck className="w-4 h-4" />
              Assigned to: {task.assignedTo}
            </p>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isExpanded ? "Collapse task details" : "Expand task details"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Assign to Provider</label>
            <div className="flex gap-3 mt-2">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} — {p.role} ({p.hourlyRate} SAR/hr)
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => {
                  if (selectedProvider) {
                    onAssign(task.id, selectedProvider);
                    setIsExpanded(false);
                  }
                }}
                disabled={!selectedProvider}
                className="px-4"
              >
                Assign
              </Button>
            </div>
          </div>
          {task.notes && (
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <strong className="text-slate-900">Notes:</strong> {task.notes}
            </div>
          )}
          {task.completedAt && (
            <div className="text-sm text-green-600 flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4" />
              Completed at {new Date(task.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const circumference = 2 * Math.PI * (size / 2 - 10);
          const offset = circumference - (percentage / 100) * circumference;
          const rotation = (currentOffset / total) * 360;
          currentOffset += item.value;
          
          return (
            <circle
              key={`${item.label}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 10}
              fill="none"
              stroke={item.color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(${rotation - 90} ${size / 2} ${size / 2})`}
              className="transition-colors duration-1000"
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-600">{item.label}:</span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemoCoordinatorCoordinatorDashboard() {
  const [selectedPlan, setSelectedPlan] = useState<DemoCarePlan | null>(null);
  const [plans, setPlans] = useState(mockCarePlans);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAssign = (planId: string, taskId: string, provider: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              tasks: plan.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, assignedTo: provider, status: "assigned" as const }
                  : task
              ),
            }
          : plan
      )
    );
    if (selectedPlan?.id === planId) {
      setSelectedPlan((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) =>
                task.id === taskId
                  ? { ...task, assignedTo: provider, status: "assigned" as const }
                  : task
              ),
            }
          : null
      );
    }
  };

  const handleApprove = (planId: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? { ...plan, status: "approved" as const, approvedAt: new Date().toISOString().split("T")[0], approvedBy: "Coordinator" }
          : plan
      )
    );
    if (selectedPlan?.id === planId) {
      setSelectedPlan((prev) =>
        prev
          ? { ...prev, status: "approved" as const, approvedAt: new Date().toISOString().split("T")[0], approvedBy: "Coordinator" }
          : null
      );
    }
  };

  const handleCreatePlan = () => {
    if (!newPlanTitle) return;
    const newPlan: DemoCarePlan = {
      id: `plan-${Date.now()}`,
      patientId: "pat-001",
      patientName: "Ahmad Al-Rashid",
      title: newPlanTitle,
      clinicalBudget: 0,
      dailyLivingBudget: 0,
      equipmentBudget: 0,
      totalBudget: 0,
      status: "draft",
      tasks: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPlans((prev) => [...prev, newPlan]);
    setNewPlanTitle("");
    setShowNewPlan(false);
    setSelectedPlan(newPlan);
  };

  const stats = useMemo(() => ({
    totalPatients: mockPatients.length,
    activePlans: plans.filter((p) => p.status === "active").length,
    pendingTasks: plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "pending").length, 0),
    completedToday: plans.reduce(
      (acc, p) => acc + p.tasks.filter((t) => t.status === "completed" && t.completedAt?.startsWith("2026-06-07")).length,
      0
    ),
  }), [plans]);

  const completionRate = useMemo(() => Math.round(
    (plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length, 0) /
      plans.reduce((acc, p) => acc + p.tasks.length, 0)) * 100
  ), [plans]);

  const taskStatusData = useMemo(() => [
    { label: "Pending", value: plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "pending").length, 0), color: "#94a3b8" },
    { label: "Assigned", value: plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "assigned").length, 0), color: "#3b82f6" },
    { label: "In Progress", value: plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "in_progress").length, 0), color: "#f59e0b" },
    { label: "Completed", value: plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length, 0), color: "#10b981" },
  ], [plans]);

  const [isLoading] = useState(false);

  const filteredPlans = useMemo(() => {
    if (!searchQuery) return plans;
    const query = searchQuery.toLowerCase();
    return plans.filter((plan) => {
      const patient = mockPatients.find((p) => p.id === plan.patientId);
      return (
        plan.title.toLowerCase().includes(query) ||
        patient?.name.toLowerCase().includes(query) ||
        plan.tasks.some((t) => t.title.toLowerCase().includes(query)) ||
        plan.status.toLowerCase().includes(query)
      );
    });
  }, [plans, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Coordinator Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage care plans, assign tasks, and monitor progress</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans, tasks, patients..."
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-64"
          />
          <Button onClick={() => setShowNewPlan(true)} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            New Care Plan
          </Button>
          <Button variant="outline" onClick={exportCoordinatorReport} className="gap-2 shadow-sm">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {isLoading && <LoadingSkeleton lines={4} />}

      {showNewPlan && (
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Create New Care Plan</h3>
              <button onClick={() => setShowNewPlan(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Plan Title</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="e.g., Post-Surgery Recovery Plan"
                  className="w-full mt-2 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCreatePlan} disabled={!newPlanTitle} className="shadow-sm">
                  Create Plan
                </Button>
                <Button variant="outline" onClick={() => setShowNewPlan(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} value={stats.totalPatients} label="Total Patients" color="#3b82f6" trend="+2" />
        <StatCard icon={ClipboardList} value={stats.activePlans} label="Active Plans" color="#10b981" />
        <StatCard icon={Clock} value={stats.pendingTasks} label="Pending Tasks" color="#f59e0b" trend="-5" />
        <StatCard icon={CheckCircle} value={stats.completedToday} label="Completed Today" color="#06b6d4" trend="+12" />
      </div>

      <TabNav
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "plans", label: "Care Plans" },
          { id: "analytics", label: "Analytics" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`${tokens.typography.h2} text-slate-900`}>Care Plans</h2>
              <Badge variant="outline" className="font-semibold">
                {filteredPlans.length} plans
              </Badge>
            </div>
            <div className="space-y-4">
              {filteredPlans.map((plan) => {
                const patient = mockPatients.find((p) => p.id === plan.patientId);
                const completed = plan.tasks.filter((t) => t.status === "completed").length;
                const progress = plan.tasks.length > 0 ? (completed / plan.tasks.length) * 100 : 0;
                return (
                    <Card
                      key={plan.id}
                      className="cursor-pointer hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500"
                      onClick={() => setSelectedPlan(plan.id === selectedPlan?.id ? null : plan)}
                    >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900 text-lg">{plan.title}</h3>
                            <StatusBadge status={plan.status} />
                          </div>
                          <p className="text-sm text-slate-600 mb-3">
                            {patient?.name} — {patient?.condition}
                          </p>
                          <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                            <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-colors duration-500" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex justify-between text-sm text-slate-600">
                            <span className="font-medium">{completed}/{plan.tasks.length} tasks completed</span>
                            <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Created: {plan.createdAt}
                            </span>
                            {plan.approvedAt && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Approved: {plan.approvedAt}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {plan.totalBudget.toLocaleString()} SAR
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <ProgressRing progress={progress} color="#3b82f6" size={50} />
                          <div className="flex flex-col gap-1">
                            {plan.status === "pending_approval" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(plan.id);
                                }}
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportCarePlanPDF(plan.id);
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedPlan && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={`${tokens.typography.h2} text-slate-900`}>Tasks — {selectedPlan.title}</h2>
                  <Badge variant="outline" className="font-semibold">
                    {selectedPlan.tasks.filter((t) => t.status === "completed").length} / {selectedPlan.tasks.length} completed
                  </Badge>
                </div>
                <div className="space-y-4">
                  {selectedPlan.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      providers={mockProviders}
                      onAssign={(taskId, provider) => handleAssign(selectedPlan.id, taskId, provider)}
                    />
                  ))}
                  {selectedPlan.tasks.length === 0 && (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium">No tasks yet. Add tasks to this care plan.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Progress Tracking</h2>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="space-y-5">
                  {mockProgress.map((day) => (
                    <div key={day.date} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-900">{day.date}</span>
                        <ProgressRing progress={(day.completedTasks / day.totalTasks) * 100} color="#3b82f6" size={40} />
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${(day.completedTasks / day.totalTasks) * 100}%` }} />
                      </div>
                      <p className="text-xs text-slate-600">{day.completedTasks}/{day.totalTasks} tasks</p>
                      <p className="text-xs text-slate-500 mt-1">{day.notes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <h2 className={`${tokens.typography.h2} text-slate-900`}>Available Providers</h2>
            <div className="space-y-3">
              {mockProviders.map((provider) => (
                <Card key={provider.id} className="hover:shadow-md motion-safe:transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-lg shadow-sm">
                        {provider.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900">{provider.name}</p>
                        <p className="text-xs text-slate-600">{provider.role} — {provider.specialty}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {provider.rating}
                          </span>
                          <span>{provider.hourlyRate} SAR/hr</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>All Care Plans</h2>
            <Badge variant="outline" className="font-semibold">{filteredPlans.length} plans</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => {
              const patient = mockPatients.find((p) => p.id === plan.patientId);
              const completed = plan.tasks.filter((t) => t.status === "completed").length;
              const progress = plan.tasks.length > 0 ? (completed / plan.tasks.length) * 100 : 0;
              return (
                <Card key={plan.id} className="hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={plan.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportCarePlanPDF(plan.id)}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-lg mb-2">{plan.title}</h3>
                    <p className="text-sm text-slate-600 mb-4">{patient?.name} — {patient?.condition}</p>
                    <ProgressBar progress={progress} color="bg-blue-500" size="md" showLabel={true} />
                    <div className="flex justify-between text-sm text-slate-600 mb-4 mt-1">
                      <span className="font-medium">{completed}/{plan.tasks.length} tasks</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {plan.createdAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {plan.totalBudget.toLocaleString()} SAR
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>Analytics Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{completionRate}%</p>
                    <p className="text-sm text-slate-600">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {plans.reduce((acc, p) => acc + p.totalBudget, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">Total Budget (SAR)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.assignedTo).length, 0)}
                    </p>
                    <p className="text-sm text-slate-600">Assigned Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{stats.activePlans}</p>
                    <p className="text-sm text-slate-600">Active Plans</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Tasks by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["clinical", "daily_living", "equipment"].map((category) => {
                    const count = plans.reduce((acc, p) => acc + p.tasks.filter((t) => t.category === category).length, 0);
                    const total = plans.reduce((acc, p) => acc + p.tasks.length, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={category}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-semibold capitalize">{category.replace("_", " ")}</span>
                          <span className="text-sm text-slate-600 font-medium">{count} tasks ({Math.round(percentage)}%)</span>
                        </div>
                        <ProgressBar progress={percentage} color="bg-blue-500" size="md" showLabel={false} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DonutChart data={taskStatusData} size={120} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
