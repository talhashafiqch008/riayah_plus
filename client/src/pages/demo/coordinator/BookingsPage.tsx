"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProviders, mockPatients } from "@/demo/coordinator/data";
import { TabNav, EmptyState } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Stethoscope,
  UserCheck,
  AlertCircle,
  Filter,
  ArrowRight,
  Star,
  DollarSign,
  Video,
  Home,
} from "lucide-react";

interface Booking {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  providerType: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  type: "home" | "clinic" | "telehealth";
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  price: number;
  notes: string;
  rating?: number;
}

export default function BookingManagementPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [filterType, setFilterType] = useState("all");
  
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: "bk-001",
      patientId: "pat-001",
      patientName: "Ahmad Al-Rashid",
      providerId: "prov-001",
      providerName: "Dr. Sarah Johnson",
      providerType: "General Physician",
      service: "Routine Checkup",
      date: "2026-06-10",
      time: "09:00",
      duration: "30 min",
      location: "Patient Home",
      type: "home",
      status: "pending",
      price: 200,
      notes: "Regular diabetes checkup",
    },
    {
      id: "bk-002",
      patientId: "pat-002",
      patientName: "Fatima Al-Saud",
      providerId: "prov-002",
      providerName: "Nurse Ahmed",
      providerType: "Registered Nurse",
      service: "Wound Dressing",
      date: "2026-06-10",
      time: "11:00",
      duration: "45 min",
      location: "Patient Home",
      type: "home",
      status: "accepted",
      price: 150,
      notes: "Post-operative wound care",
    },
    {
      id: "bk-003",
      patientId: "pat-003",
      patientName: "Mohammed Al-Farsi",
      providerId: "prov-003",
      providerName: "Dr. Khalid",
      providerType: "Physiotherapist",
      service: "Physiotherapy Session",
      date: "2026-06-11",
      time: "14:00",
      duration: "60 min",
      location: "Al-Riyad Clinic",
      type: "clinic",
      status: "pending",
      price: 300,
      notes: "Knee rehabilitation session",
    },
    {
      id: "bk-004",
      patientId: "pat-001",
      patientName: "Ahmad Al-Rashid",
      providerId: "prov-001",
      providerName: "Dr. Sarah Johnson",
      providerType: "General Physician",
      service: "Medication Review",
      date: "2026-06-08",
      time: "10:00",
      duration: "20 min",
      location: "Video Call",
      type: "telehealth",
      status: "completed",
      price: 100,
      notes: "Monthly medication review",
      rating: 5,
    },
    {
      id: "bk-005",
      patientId: "pat-002",
      patientName: "Fatima Al-Saud",
      providerId: "prov-003",
      providerName: "Dr. Khalid",
      providerType: "Physiotherapist",
      service: "Follow-up Assessment",
      date: "2026-06-09",
      time: "16:00",
      duration: "30 min",
      location: "Al-Riyad Clinic",
      type: "clinic",
      status: "rejected",
      price: 200,
      notes: "Provider unavailable",
    },
  ]);

  const handleAccept = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "accepted" as const } : b))
    );
  };

  const handleReject = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "rejected" as const } : b))
    );
  };

  const handleComplete = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" as const } : b))
    );
  };

  const filteredBookings = useMemo(() => bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return b.status === "pending";
    if (activeTab === "accepted") return b.status === "accepted";
    if (activeTab === "completed") return b.status === "completed";
    if (activeTab === "rejected") return b.status === "rejected";
    return true;
  }).filter((b) => {
    if (filterType === "all") return true;
    return b.type === filterType;
  }), [bookings, activeTab, filterType]);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    accepted: bookings.filter((b) => b.status === "accepted").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    revenue: bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.price, 0),
  }), [bookings]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-amber-100", text: "text-amber-700" },
      accepted: { bg: "bg-blue-100", text: "text-blue-700" },
      completed: { bg: "bg-green-100", text: "text-green-700" },
      rejected: { bg: "bg-red-100", text: "text-red-700" },
      cancelled: { bg: "bg-slate-100", text: "text-slate-700" },
    };
    const c = config[status] || config.pending;
    return (
      <Badge className={`${c.bg} ${c.text} capitalize font-semibold`}>
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "home": return <Home className="w-4 h-4" />;
      case "telehealth": return <Video className="w-4 h-4" />;
      case "clinic": return <Stethoscope className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Booking Management</h1>
          <p className="text-slate-600 mt-1">Accept, reject, and manage care bookings</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 px-3 py-1.5 font-semibold w-fit">
          <Calendar className="w-3 h-3 mr-1" />
          Operations
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pending", value: stats.pending, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Accepted", value: stats.accepted, icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Revenue", value: `$${stats.revenue}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
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

      <div className="flex flex-col sm:flex-row gap-4">
        <TabNav
          tabs={[
            { id: "all", label: "All Bookings" },
            { id: "pending", label: "Pending" },
            { id: "accepted", label: "Accepted" },
            { id: "completed", label: "Completed" },
            { id: "rejected", label: "Rejected" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
        />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="home">Home Visit</option>
            <option value="clinic">Clinic</option>
            <option value="telehealth">Telehealth</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description="There are no bookings in this category"
          />
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="border-l-4 border-l-transparent hover:border-l-4 hover:border-l-blue-500 transition-colors transition-transform duration-300">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg text-slate-900">{booking.service}</h3>
                      {getStatusBadge(booking.status)}
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        {getTypeIcon(booking.type)}
                        <span className="capitalize">{booking.type}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <UserCheck className="w-4 h-4" />
                        <span>{booking.patientName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Stethoscope className="w-4 h-4" />
                        <span>{booking.providerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{booking.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.time} ({booking.duration})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold text-slate-900">${booking.price}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-2">
                      <span className="font-medium">Notes:</span> {booking.notes}
                    </p>
                    
                    {booking.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < booking.rating! ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                          />
                        ))}
                        <span className="text-sm text-slate-600 ml-1">({booking.rating}/5)</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleAccept(booking.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleReject(booking.id)}
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {booking.status === "accepted" && (
                      <Button
                        onClick={() => handleComplete(booking.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    {booking.status === "completed" && (
                      <Button variant="outline">
                        <ArrowRight className="w-4 h-4 mr-1" />
                        View Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
