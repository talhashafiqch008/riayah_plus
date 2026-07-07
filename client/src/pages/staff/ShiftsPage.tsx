
import { Calendar, Clock, MapPin, User } from "lucide-react";


export default function StaffShiftsPage() {
 const shifts = [
 {
 id: 1,
 patient: "Margaret Thompson",
 date: "2025-12-19",
 startTime: "09:00",
 endTime: "13:00",
 location: "123 Oak Street, Melbourne",
 service: "Personal Care",
 status: "upcoming",
 },
 {
 id: 2,
 patient: "Robert Chen",
 date: "2025-12-19",
 startTime: "14:00",
 endTime: "18:00",
 location: "456 Pine Avenue, Melbourne",
 service: "Nursing Care",
 status: "upcoming",
 },
 {
 id: 3,
 patient: "Sarah Johnson",
 date: "2025-12-20",
 startTime: "10:00",
 endTime: "14:00",
 location: "789 Elm Road, Melbourne",
 service: "Companionship",
 status: "upcoming",
 },
 ];

 return (
 <div className="gap-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">My Shifts</h1>
 <p className="text-sm text-stone-500">View and manage your upcoming shifts</p>
 </div>

 {/* Stats */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Today's Shifts</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">2</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">This Week</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">8</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Total Hours</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">32</p>
 </div>
 </div>

 {/* Shifts List */}
 <div className="gap-y-4">
 {shifts.map((shift) => (
 <div key={shift.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-x-3 mb-3">
 <div className="size-10 rounded-full bg-teal-100 flex items-center justify-center">
 <User className="size-5 text-teal-700" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{shift.patient}</h3>
 <p className="text-sm text-stone-500">{shift.service}</p>
 </div>
 </div>

 <div className="grid gap-2 text-sm text-stone-600">
 <div className="flex items-center">
 <Calendar className="mr-2 size-4 text-stone-400" />
 <span>{new Date(shift.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
 </div>
 <div className="flex items-center">
 <Clock className="mr-2 size-4 text-stone-400" />
 <span>{shift.startTime} - {shift.endTime}</span>
 </div>
 <div className="flex items-center">
 <MapPin className="mr-2 size-4 text-stone-400" />
 <span>{shift.location}</span>
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-y-2">
 <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 text-center">
 {shift.status}
 </span>
 <button className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
 View Details
 </button>
 <button className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
 Get Directions
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
