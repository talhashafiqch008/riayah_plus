"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockPatients, mockCarePlans } from "@/demo/coordinator/data";
import { exportPatientProgress, exportCarePlanPDF } from "@/demo/coordinator/pdf-export";
import { StatusBadge, StatCard, ProgressBar, TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  FileText,
  Activity,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertCircle,
  Heart,
  Download,
  Upload,
  Mic,
  Phone,
  Video,
  MapPin,
  Star,
  ArrowUpRight,
  Send,
  ChevronRight,
} from "lucide-react";

export default function DemoCoordinatorCareSeekerView() {
  const [patient] = useState(mockPatients[0]);
  const [plans, setPlans] = useState(mockCarePlans.filter((p) => p.patientId === patient.id));
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [messages, setMessages] = useState([
    { id: 1, sender: "coordinator", text: "Good morning! Your care plan for this week is ready for review.", time: "08:00 AM" },
    { id: 2, sender: "family", text: "Thank you. Can we add more physiotherapy sessions?", time: "08:15 AM" },
    { id: 3, sender: "coordinator", text: "Absolutely. I'll add 2 extra sessions to your plan.", time: "08:30 AM" },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedFiles] = useState([
    { id: 1, name: "MRI_Brain_Report.pdf", size: "2.4 MB", date: "2026-05-10" },
    { id: 2, name: "Blood_Test_Results.pdf", size: "1.1 MB", date: "2026-05-12" },
  ]);

  const handleApprove = (planId: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? { ...plan, status: "approved" as const, approvedAt: new Date().toISOString().split("T")[0], approvedBy: "Family" }
          : plan
      )
    );
  };

  const handleReject = (planId: string) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id === planId ? { ...plan, status: "draft" as const } : plan))
    );
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "family", text: newMessage, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setNewMessage("");
  };

  const activePlan = useMemo(() => plans.find((p) => p.status === "active"), [plans]);
  const pendingPlan = useMemo(() => plans.find((p) => p.status === "pending_approval"), [plans]);
  const completedTasks = useMemo(() => activePlan?.tasks.filter((t) => t.status === "completed").length || 0, [activePlan]);
  const totalTasks = useMemo(() => activePlan?.tasks.length || 0, [activePlan]);
  const progress = useMemo(() => totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0, [completedTasks, totalTasks]);

  const filteredPlans = useMemo(() => {
    if (!searchQuery) return plans;
    const query = searchQuery.toLowerCase();
    return plans.filter((plan) =>
      plan.title.toLowerCase().includes(query) ||
      plan.tasks.some((t) => t.title.toLowerCase().includes(query)) ||
      plan.status.toLowerCase().includes(query)
    );
  }, [plans, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Care Seeker Dashboard</h1>
          <p className="text-slate-600 mt-1">Track your care plan, approve tasks, and communicate with your coordinator</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans..."
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-48"
          />
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-semibold">{patient.name}</span>
          </div>
          <Button variant="outline" onClick={() => exportPatientProgress(patient.id)} className="gap-2 shadow-sm">
            <Download className="w-4 h-4" />
            Export Progress
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Activity} value={completedTasks} label="Tasks Completed Today" color="#10b981" trend="+3" />
        <StatCard icon={Clock} value={totalTasks - completedTasks} label="Remaining Tasks" color="#f59e0b" />
        <StatCard icon={TrendingUp} value={`${Math.round(progress)}%`} label="Daily Progress" color="#3b82f6" trend="+8%" />
      </div>

      <TabNav
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "plans", label: "Care Plans" },
          { id: "documents", label: "Documents" },
          { id: "communication", label: "Communication" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Today's Care Plan</h2>
            {activePlan ? (
              <div className="space-y-4">
                {activePlan.tasks.map((task) => (
                  <Card key={task.id} className={task.status === "completed" ? "border-l-4 border-l-green-500 shadow-sm" : "border-l-4 border-l-blue-500 shadow-sm hover:shadow-lg hover:-translate-y-0.5 motion-safe:transition-all duration-300"}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${task.status === "completed" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                          {task.status === "completed" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 text-lg">{task.title}</h4>
                            <StatusBadge status={task.status} />
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              {task.assignedTo || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="p-8 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">No active care plan. Please approve a pending plan.</p>
                </CardContent>
              </Card>
            )}

            {pendingPlan && (
              <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg mb-2">Care Plan Pending Approval</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        {pendingPlan.title} — Please review and approve to activate care services.
                      </p>
                      <div className="flex gap-3">
                        <Button onClick={() => handleApprove(pendingPlan.id)} className="gap-2 shadow-sm">
                          <CheckCircle className="w-4 h-4" />
                          Approve Plan
                        </Button>
                        <Button variant="outline" onClick={() => handleReject(pendingPlan.id)} className="gap-2">
                          <XCircle className="w-4 h-4" />
                          Request Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Medical Profile</h2>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Age</span>
                    <span className="text-sm text-slate-900 font-medium">{patient.age} years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Condition</span>
                    <span className="text-sm text-slate-900 text-right max-w-[60%] font-medium">{patient.condition}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Priority</span>
                    <Badge className={patient.priority === "high" ? "bg-red-100 text-red-700 font-semibold" : patient.priority === "medium" ? "bg-amber-100 text-amber-700 font-semibold" : "bg-green-100 text-green-700 font-semibold"}>
                      {patient.priority}
                    </Badge>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Medical Data</p>
                    <ul className="space-y-2">
                      {patient.medicalData.map((data) => (
                        <li key={data} className="text-sm text-slate-600 flex items-start gap-2">
                          <FileText className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                          {data}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Care Goals</p>
                    <ul className="space-y-2">
                      {patient.goals.map((goal) => (
                        <li key={goal} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>My Care Plans</h2>
            <Badge variant="outline" className="font-semibold">{filteredPlans.length} plans</Badge>
          </div>
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const completed = plan.tasks.filter((t) => t.status === "completed").length;
              const progress = plan.tasks.length > 0 ? (completed / plan.tasks.length) * 100 : 0;
              return (
                <Card key={plan.id} className="hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900 text-lg">{plan.title}</h3>
                          <StatusBadge status={plan.status} />
                        </div>
                        <ProgressBar progress={progress} color="bg-blue-500" size="md" showLabel={true} />
                        <div className="flex justify-between text-sm text-slate-600 mb-3 mt-1">
                          <span className="font-medium">{completed}/{plan.tasks.length} tasks completed</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Created: {plan.createdAt}</span>
                          {plan.approvedAt && <span>Approved: {plan.approvedAt}</span>}
                          <span className="font-semibold">Budget: {plan.totalBudget.toLocaleString()} SAR</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {plan.status === "pending_approval" && (
                          <Button size="sm" onClick={() => handleApprove(plan.id)}>
                            Approve
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => exportCarePlanPDF(plan.id)}>
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={`${tokens.typography.h2} text-slate-900`}>Medical Documents</h2>
            <Button className="gap-2 shadow-sm">
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-300 border-l-4 border-l-red-500">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{file.size} • Uploaded {file.date}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center shadow-sm">
                  <Mic className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">Voice Note Upload</h3>
                  <p className="text-sm text-slate-600">Upload voice notes or medical reports for AI analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "communication" && (
        <div className="space-y-6">
          <h2 className={`${tokens.typography.h2} text-slate-900`}>Communication</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "family" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 ${msg.sender === "family" ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg" : "bg-slate-100 text-slate-900 shadow-sm"}`}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <p className={`text-xs mt-2 ${msg.sender === "family" ? "text-blue-200" : "text-slate-500"}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button onClick={sendMessage} size="sm" className="rounded-xl shadow-sm">
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl">
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Contact Options</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-3 py-3 h-auto rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">Call Coordinator</p>
                        <p className="text-xs text-slate-500">+966 50 123 4567</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3 py-3 h-auto rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">Video Call</p>
                        <p className="text-xs text-slate-500">Start a video consultation</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3 py-3 h-auto rounded-xl">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">Emergency Location</p>
                        <p className="text-xs text-slate-500">Share your location</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
