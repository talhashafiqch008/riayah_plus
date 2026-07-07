"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProviders, mockPatients } from "@/demo/coordinator/data";
import { TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import {
  Users,
  Stethoscope,
  TrendingUp,
  DollarSign,
  Star,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Phone,
  Award,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  status: "active" | "on_leave" | "inactive";
  rating: number;
  completedTasks: number;
  totalTasks: number;
  revenue: number;
  hoursWorked: number;
  joinDate: string;
  phone: string;
  location: string;
  patients: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  completedVisits: number;
}

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState("staff");
  
  const [staff, setStaff] = useState<StaffMember[]>([
    {
      id: "staff-001",
      name: "Dr. Sarah Johnson",
      role: "General Physician",
      specialization: "Internal Medicine",
      status: "active",
      rating: 4.8,
      completedTasks: 145,
      totalTasks: 150,
      revenue: 45000,
      hoursWorked: 320,
      joinDate: "2025-01-15",
      phone: "+966 50 123 4567",
      location: "Al-Riyad Clinic",
      patients: 45,
    },
    {
      id: "staff-002",
      name: "Nurse Ahmed",
      role: "Registered Nurse",
      specialization: "Home Care",
      status: "active",
      rating: 4.9,
      completedTasks: 210,
      totalTasks: 220,
      revenue: 32000,
      hoursWorked: 380,
      joinDate: "2025-03-10",
      phone: "+966 50 987 6543",
      location: "Patient Homes",
      patients: 30,
    },
    {
      id: "staff-003",
      name: "Dr. Khalid",
      role: "Physiotherapist",
      specialization: "Physical Therapy",
      status: "active",
      rating: 4.7,
      completedTasks: 98,
      totalTasks: 105,
      revenue: 28000,
      hoursWorked: 280,
      joinDate: "2025-02-20",
      phone: "+966 50 456 7890",
      location: "Al-Riyad Clinic",
      patients: 25,
    },
    {
      id: "staff-004",
      name: "Helper Ali",
      role: "Support Worker",
      specialization: "Daily Living",
      status: "on_leave",
      rating: 4.5,
      completedTasks: 180,
      totalTasks: 190,
      revenue: 18000,
      hoursWorked: 350,
      joinDate: "2025-04-01",
      phone: "+966 50 789 0123",
      location: "Patient Homes",
      patients: 15,
    },
    {
      id: "staff-005",
      name: "Dr. Fatima",
      role: "Specialist",
      specialization: "Cardiology",
      status: "active",
      rating: 4.9,
      completedTasks: 85,
      totalTasks: 90,
      revenue: 52000,
      hoursWorked: 240,
      joinDate: "2025-01-05",
      phone: "+966 50 321 6547",
      location: "Main Hospital",
      patients: 20,
    },
  ]);

  const [revenue] = useState<RevenueData[]>([
    { month: "Jan", revenue: 45000, expenses: 28000, profit: 17000, completedVisits: 120 },
    { month: "Feb", revenue: 52000, expenses: 31000, profit: 21000, completedVisits: 145 },
    { month: "Mar", revenue: 48000, expenses: 29000, profit: 19000, completedVisits: 130 },
    { month: "Apr", revenue: 61000, expenses: 35000, profit: 26000, completedVisits: 165 },
    { month: "May", revenue: 58000, expenses: 33000, profit: 25000, completedVisits: 155 },
    { month: "Jun", revenue: 67000, expenses: 38000, profit: 29000, completedVisits: 180 },
  ]);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);
  const totalProfit = revenue.reduce((sum, r) => sum + r.profit, 0);
  const totalVisits = revenue.reduce((sum, r) => sum + r.completedVisits, 0);
  const avgRating = staff.reduce((sum, s) => sum + s.rating, 0) / staff.length;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      active: { bg: "bg-green-100", text: "text-green-700" },
      on_leave: { bg: "bg-amber-100", text: "text-amber-700" },
      inactive: { bg: "bg-red-100", text: "text-red-700" },
    };
    const c = config[status] || config.active;
    return (
      <Badge className={`${c.bg} ${c.text} capitalize`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Organization</h1>
          <p className="text-slate-600 mt-1">Staff management, performance tracking, and revenue analytics</p>
        </div>
        <Badge className="bg-purple-100 text-purple-800 px-3 py-1.5 font-semibold w-fit">
          <Users className="w-3 h-3 mr-1" />
          Management
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staff.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Staff", value: staff.filter((s) => s.status === "active").length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Revenue", value: `$${(totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Rating", value: avgRating.toFixed(1), icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <Card key={i} className="hover:shadow-lg hover:-translate-y-1 transition-colors transition-transform duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-600 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TabNav
        tabs={[
          { id: "staff", label: "Staff Management" },
          { id: "performance", label: "Performance" },
          { id: "revenue", label: "Revenue" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "staff" && (
        <div className="space-y-4">
          {staff.map((member) => {
            const completionRate = Math.round((member.completedTasks / member.totalTasks) * 100);
            return (
              <Card key={member.id} className="border-l-4 border-l-transparent hover:border-l-4 hover:border-l-blue-500 transition-colors transition-transform duration-300">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Stethoscope className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900">{member.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">{member.role}</span>
                            {getStatusBadge(member.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Award className="w-4 h-4" />
                          <span>{member.specialization}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4" />
                          <span>{member.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="w-4 h-4" />
                          <span>{member.patients} patients</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>Joined {member.joinDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span>{member.hoursWorked} hours</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-slate-600">Rating:</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < Math.floor(member.rating) ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{member.rating}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">Completion:</span>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${completionRate}%` }} />
                          </div>
                          <span className="text-sm font-semibold">{completionRate}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-right">
                      <div className="text-2xl font-bold text-slate-900">${member.revenue.toLocaleString()}</div>
                      <div className="text-sm text-slate-600">Revenue Generated</div>
                      <div className="text-sm font-semibold text-green-600">{member.completedTasks} tasks completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "performance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Staff Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staff.map((member) => {
                  const completionRate = Math.round((member.completedTasks / member.totalTasks) * 100);
                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{member.name}</span>
                          <span className="text-sm text-slate-600">({member.role})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-600">{member.completedTasks} tasks</span>
                          <span className="text-sm font-semibold text-green-600">{completionRate}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Activity className="w-5 h-5 text-green-600" />
                  Task Completion Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">This Week</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">142 tasks</span>
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Week</span>
                    <span className="font-semibold text-slate-900">128 tasks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On-time Completion</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-600">94%</span>
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overdue Tasks</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-600">8</span>
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-blue-600" />
                  Patient Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Patients</span>
                    <span className="font-semibold text-slate-900">{mockPatients.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Care Plans Active</span>
                    <span className="font-semibold text-slate-900">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Patient Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-600">4.6/5</span>
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Goal Achievement</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-600">87%</span>
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "revenue" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <DollarSign className="w-5 h-5 text-green-600" />
                Revenue Analytics (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">${(totalRevenue / 1000).toFixed(0)}K</p>
                    <p className="text-sm text-green-600">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">${(totalProfit / 1000).toFixed(0)}K</p>
                    <p className="text-sm text-blue-600">Total Profit</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">{totalVisits}</p>
                    <p className="text-sm text-blue-600">Completed Visits</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {revenue.map((data, i) => {
                    const maxRevenue = Math.max(...revenue.map((r) => r.revenue));
                    const width = (data.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{data.month}</span>
                          <div className="flex gap-4">
                            <span className="text-slate-600">Revenue: ${data.revenue.toLocaleString()}</span>
                            <span className="text-green-600">Profit: ${data.profit.toLocaleString()}</span>
                            <span className="text-blue-600">{data.completedVisits} visits</span>
                          </div>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Revenue by Service Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Home Visits", value: 35, amount: 102000 },
                    { label: "Clinic Sessions", value: 28, amount: 81600 },
                    { label: "Telehealth", value: 15, amount: 43700 },
                    { label: "Procedures", value: 12, amount: 35000 },
                    { label: "Consultations", value: 10, amount: 29100 },
                  ].map((service, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{service.label}</span>
                        <span className="font-semibold text-slate-900">${service.amount.toLocaleString()} ({service.value}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${service.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-blue-600" />
                  Revenue by Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staff.map((member, i) => {
                    const percentage = Math.round((member.revenue / totalRevenue) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{member.name}</span>
                          <span className="font-semibold text-slate-900">${member.revenue.toLocaleString()} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
