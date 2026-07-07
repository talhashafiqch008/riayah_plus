"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockCarePlans, mockPatients, mockProviders } from "@/demo/coordinator/data";
import { tokens } from "@/demo/coordinator/tokens";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  Target,
  Zap,
  BarChart3,
  Heart,
  Shield,
  MapPin,
  Phone,
} from "lucide-react";

interface LiveTask {
  id: string;
  title: string;
  patient: string;
  provider: string;
  status: "in_progress" | "completed" | "pending" | "overdue";
  progress: number;
  startTime: string;
  estimatedDuration: string;
  location: string;
  type: string;
}

interface Alert {
  id: string;
  type: "warning" | "critical" | "info" | "success";
  message: string;
  timestamp: string;
  patient?: string;
  task?: string;
}

export default function MonitoringPage() {
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([
    {
      id: "task-001",
      title: "Morning Medication",
      patient: "Ahmad Al-Rashid",
      provider: "Nurse Ahmed",
      status: "in_progress",
      progress: 65,
      startTime: "08:00",
      estimatedDuration: "15 min",
      location: "Patient Home",
      type: "medication",
    },
    {
      id: "task-002",
      title: "Physiotherapy Session",
      patient: "Fatima Al-Saud",
      provider: "Dr. Khalid",
      status: "in_progress",
      progress: 40,
      startTime: "09:30",
      estimatedDuration: "45 min",
      location: "Al-Riyad Clinic",
      type: "therapy",
    },
    {
      id: "task-003",
      title: "Blood Pressure Check",
      patient: "Mohammed Al-Farsi",
      provider: "Dr. Sarah Johnson",
      status: "completed",
      progress: 100,
      startTime: "07:00",
      estimatedDuration: "10 min",
      location: "Patient Home",
      type: "vitals",
    },
    {
      id: "task-004",
      title: "Meal Preparation",
      patient: "Ahmad Al-Rashid",
      provider: "Helper Ali",
      status: "pending",
      progress: 0,
      startTime: "11:00",
      estimatedDuration: "30 min",
      location: "Patient Home",
      type: "daily_living",
    },
    {
      id: "task-005",
      title: "Afternoon Exercise",
      patient: "Fatima Al-Saud",
      provider: "Dr. Khalid",
      status: "overdue",
      progress: 0,
      startTime: "14:00",
      estimatedDuration: "20 min",
      location: "Al-Riyad Clinic",
      type: "therapy",
    },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "alert-001",
      type: "critical",
      message: "Blood pressure exceeded threshold for Ahmad Al-Rashid",
      timestamp: "10:15 AM",
      patient: "Ahmad Al-Rashid",
      task: "Blood Pressure Monitoring",
    },
    {
      id: "alert-002",
      type: "warning",
      message: "Task overdue: Afternoon Exercise for Fatima Al-Saud",
      timestamp: "14:30 PM",
      patient: "Fatima Al-Saud",
      task: "Afternoon Exercise",
    },
    {
      id: "alert-003",
      type: "success",
      message: "Morning medication completed successfully",
      timestamp: "08:15 AM",
      patient: "Ahmad Al-Rashid",
      task: "Morning Medication",
    },
    {
      id: "alert-004",
      type: "info",
      message: "New care plan created for Mohammed Al-Farsi",
      timestamp: "09:00 AM",
    },
  ]);

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTasks((prev) =>
        prev.map((task) => {
          if (task.status === "in_progress" && task.progress < 100) {
            return { ...task, progress: Math.min(task.progress + Math.random() * 15, 100) };
          }
          if (task.progress >= 100 && task.status === "in_progress") {
            return { ...task, status: "completed" as const };
          }
          return task;
        })
      );
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLiveTasks((prev) =>
        prev.map((task) => ({
          ...task,
          progress: task.status === "in_progress" ? Math.min(task.progress + Math.random() * 20, 100) : task.progress,
        }))
      );
      setIsRefreshing(false);
      setLastUpdate(new Date());
    }, 1000);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const stats = useMemo(() => ({
    activeTasks: liveTasks.filter((t) => t.status === "in_progress").length,
    completedToday: liveTasks.filter((t) => t.status === "completed").length,
    overdueTasks: liveTasks.filter((t) => t.status === "overdue").length,
    pendingTasks: liveTasks.filter((t) => t.status === "pending").length,
    completionRate: Math.round(
      (liveTasks.filter((t) => t.status === "completed").length / liveTasks.length) * 100
    ),
  }), [liveTasks]);

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bg: string; label: string }> = {
      in_progress: { color: "text-blue-700", bg: "bg-blue-50", label: "In Progress" },
      completed: { color: "text-green-700", bg: "bg-green-50", label: "Completed" },
      pending: { color: "text-amber-700", bg: "bg-amber-50", label: "Pending" },
      overdue: { color: "text-red-700", bg: "bg-red-50", label: "Overdue" },
    };
    return config[status] || config.pending;
  };

  const getAlertConfig = (type: string) => {
    const config: Record<string, { color: string; bg: string; icon: typeof AlertCircle }> = {
      critical: { color: "text-red-700", bg: "bg-red-50", icon: AlertCircle },
      warning: { color: "text-amber-700", bg: "bg-amber-50", icon: AlertCircle },
      info: { color: "text-blue-700", bg: "bg-blue-50", icon: Bell },
      success: { color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
    };
    return config[type] || config.info;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Real-Time Monitoring</h1>
          <p className="text-slate-600 mt-1">Live task tracking and care execution monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 px-3 py-1.5 font-semibold">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 5s
      </div>
      
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {stats.activeTasks} active tasks, {stats.completedToday} completed, {stats.overdueTasks} overdue
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Active Tasks", value: stats.activeTasks, icon: Activity, color: "text-blue-600", bg: "bg-blue-50", trend: "up" },
          { label: "Completed Today", value: stats.completedToday, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", trend: "up" },
          { label: "Overdue", value: stats.overdueTasks, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", trend: "down" },
          { label: "Pending", value: stats.pendingTasks, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", trend: "neutral" },
          { label: "Completion Rate", value: `${stats.completionRate}%`, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50", trend: "up" },
        ].map((stat, i) => (
          <Card key={i} className="hover:shadow-lg hover:-translate-y-1 transition-colors transition-transform duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    {stat.trend === "up" && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                    {stat.trend === "down" && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Zap className="w-5 h-5 text-blue-600" />
                Live Task Execution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveTasks.map((task) => {
                  const status = getStatusConfig(task.status);
                  return (
                    <div
                      key={task.id}
                      className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-colors transition-transform duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{task.title}</h4>
                            <Badge className={`${status.bg} ${status.color} capitalize`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {task.patient}
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {task.provider}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.startTime}
                          </div>
                          <div className="text-xs text-slate-500">{task.estimatedDuration}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              task.status === "overdue"
                                ? "bg-red-500"
                                : task.status === "completed"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">{Math.round(task.progress)}%</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {task.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {task.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-900">Task Completion by Provider</h4>
                  {mockProviders.map((provider, i) => {
                    const completed = Math.round(Math.random() * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{provider.name}</span>
                          <span className="font-semibold">{completed}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                            style={{ width: `${completed}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-900">Patient Outcomes</h4>
                  {mockPatients.map((patient, i) => {
                    const progress = Math.round(Math.random() * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{patient.name}</span>
                          <span className="font-semibold">{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Bell className="w-5 h-5 text-amber-600" />
                Alerts & Notifications
                <Badge className="bg-red-100 text-red-700">{alerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alerts.map((alert) => {
                  const config = getAlertConfig(alert.type);
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${config.bg} border-opacity-50`}
                    >
                      <div className="flex items-start gap-2">
                        <config.icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                            <span>{alert.timestamp}</span>
                            {alert.patient && <span>• {alert.patient}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-slate-900">System Health</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Task Completion Rate</span>
                  <span className="font-semibold text-green-600">{stats.completionRate}%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.completionRate}%` }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Provider Availability</span>
                  <span className="font-semibold text-blue-600">85%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "85%" }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Patient Satisfaction</span>
                  <span className="font-semibold text-amber-600">4.6/5</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "92%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
