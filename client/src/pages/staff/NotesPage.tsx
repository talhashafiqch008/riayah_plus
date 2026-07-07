
import { useState, useRef } from "react";
import { Plus, FileText, Calendar, User, Edit, Eye } from "lucide-react";




export default function StaffNotesPage() {
 const showCreateModalRef = useRef(false);

 const notes = [
 {
 id: 1,
 patient: "Margaret Thompson",
 date: "2025-12-18",
 duration: "2 hours",
 type: "Personal Care",
 summary: "Assisted with morning routine, medication administration, and light exercises",
 vitals: { bp: "120/80", hr: "72", temp: "98.6°F" },
 status: "completed",
 },
 {
 id: 2,
 patient: "Robert Chen",
 date: "2025-12-17",
 duration: "3 hours",
 type: "Nursing Care",
 summary: "Wound care, vital signs monitoring, medication review",
 vitals: { bp: "118/75", hr: "68", temp: "98.4°F" },
 status: "completed",
 },
 {
 id: 3,
 patient: "Sarah Johnson",
 date: "2025-12-16",
 duration: "4 hours",
 type: "Companionship",
 summary: "Social activities, meal preparation, light housekeeping",
 vitals: { bp: "125/82", hr: "75", temp: "98.7°F" },
 status: "completed",
 },
 ];

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Session Notes</h1>
 <p className="text-sm text-stone-500">Document patient care sessions</p>
 </div>
 <button
 onClick={() => showCreateModalRef.current = true}
 className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 <Plus className="mr-2 size-4" />
 New Note
 </button>
 </div>

 {/* Stats */}
 <div className="grid gap-6 md:grid-cols-4">
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Total Notes</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">{notes.length}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">This Week</p>
 <p className="mt-2 text-3xl font-bold text-teal-600">12</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">This Month</p>
 <p className="mt-2 text-3xl font-bold text-blue-600">48</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Pending Review</p>
 <p className="mt-2 text-3xl font-bold text-orange-600">2</p>
 </div>
 </div>

 {/* Notes List */}
 <div className="space-y-4">
 {notes.map((note) => (
 <div key={note.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-3">
 <div className="rounded-lg bg-teal-50 p-2">
 <FileText className="size-5 text-teal-600" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-stone-900">{note.patient}</h3>
 <p className="text-sm text-stone-500">{note.type}</p>
 </div>
 </div>

 <div className="grid gap-3 mb-4">
 <div className="flex items-center text-sm text-stone-600">
 <Calendar className="mr-2 size-4 text-stone-400" />
 <span>{new Date(note.date).toLocaleDateString()} • {note.duration}</span>
 </div>
 <p className="text-sm text-stone-700">{note.summary}</p>
 </div>

 {/* Vitals */}
 <div className="grid grid-cols-3 gap-4 p-3 bg-stone-50 rounded-lg">
 <div>
 <p className="text-xs text-stone-500">Blood Pressure</p>
 <p className="text-sm font-semibold text-stone-900">{note.vitals.bp}</p>
 </div>
 <div>
 <p className="text-xs text-stone-500">Heart Rate</p>
 <p className="text-sm font-semibold text-stone-900">{note.vitals.hr} bpm</p>
 </div>
 <div>
 <p className="text-xs text-stone-500">Temperature</p>
 <p className="text-sm font-semibold text-stone-900">{note.vitals.temp}</p>
 </div>
 </div>
 </div>

 <div className="flex flex-col gap-2 ml-6">
 <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 text-center">
 {note.status}
 </span>
 <button className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">
 <Eye className="size-4 inline mr-1" />
 View
 </button>
 <button className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
 <Edit className="size-4 inline mr-1" />
 Edit
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {notes.length === 0 && (
 <div className="text-center py-12 rounded-xl border bg-white">
 <FileText className="mx-auto size-12 text-stone-400 mb-4" />
 <p className="text-stone-500">No session notes found</p>
 </div>
 )}
 </div>
 );
}
