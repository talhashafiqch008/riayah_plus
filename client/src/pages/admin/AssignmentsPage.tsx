
import { useState, useEffect , useRef } from 'react';
import { UserCheck, Calendar, Search } from "lucide-react";
import toast from 'react-hot-toast';
import { createStaffAssignment, getCareOrders, getStaffAssignments, getUsers } from '@/lib/api';

interface CareOrder {
 id: string;
 careRecipient: { firstName: string; lastName: string };
 service: { name: string };
 startDate: string;
 hoursPerWeek: number;
 status: string;
}

interface StaffMember {
 id: string;
 firstName: string;
 lastName: string;
 role: string;
}

interface Assignment {
 id: string;
 careOrder: CareOrder;
 primaryStaff: StaffMember;
 backupStaff?: StaffMember;
 status: string;
}

export default function StaffAssignmentPage() {
 const [assignments, setAssignments] = useState<Assignment[]>([]);
 const [careOrders, setCareOrders] = useState<CareOrder[]>([]);
 const [staff, setStaff] = useState<StaffMember[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchAllData();
 }, []);

 const fetchAllData = async () => {
 try {
 setLoading(true);
 const [assignmentsData, careOrdersData, usersData] = await Promise.all([
 getStaffAssignments(),
 getCareOrders(),
 getUsers(),
 ]);

 setAssignments(assignmentsData as Assignment[]);
 setCareOrders((careOrdersData as CareOrder[]).filter((order: CareOrder) => order.status === "ACTIVE"));
 setStaff((usersData as StaffMember[]).filter((user: StaffMember) =>
 ["SUPPORT_WORKER", "NURSE", "DOCTOR"].includes(user.role)
 ));
 } catch (error) {
 console.error("Failed to fetch data:", error);
 } finally {
 setLoading(false);
 }
 };

 const createAssignment = async (orderId: string, primaryStaffId: string) => {
 try {
 await createStaffAssignment({
 careOrderId: orderId,
 primaryStaffId,
 });
 fetchAllData();
 } catch (error) {
 console.error("Failed to create assignment:", error);
 toast.error('Failed to create assignment. Please try again.');
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Staff Assignments</h1>
 <p className="text-sm text-stone-500">Assign staff to care orders</p>
 </div>

 {/* Search */}
 <div className="flex w-full max-w-md items-center rounded-lg border bg-white px-3 py-2">
 <Search className="mr-2 size-5 text-stone-400" />
 <input
 type="text"
 placeholder="Search assignments..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-transparent text-sm focus:outline-none"
 />
 </div>

 <div className="grid gap-6 lg:grid-cols-2">
 {/* Unassigned Care Orders */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h3 className="text-lg font-semibold mb-4">Unassigned Care Orders</h3>
 <div className="space-y-3">
 {/* TODO: Consider combining iterations */}
 {careOrders
 .filter(order => !assignments.some(a => a.careOrder.id === order.id))
 .map((order) => (
 <div key={order.id} className="rounded-lg border p-4">
 <div className="flex justify-between items-start mb-3">
 <div>
 <h4 className="font-semibold text-stone-900">
 {order.careRecipient.firstName} {order.careRecipient.lastName}
 </h4>
 <p className="text-sm text-stone-600">{order.service.name}</p>
 <p className="text-xs text-stone-500 mt-1">
 {order.hoursPerWeek} hrs/week • Starts {new Date(order.startDate).toLocaleDateString()}
 </p>
 </div>
 </div>
 <select
 onChange={(e) => e.target.value && createAssignment(order.id, e.target.value)}
 className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
 defaultValue=""
 >
 <option value="">Assign staff…</option>
 {staff.map((member) => (
 <option key={member.id} value={member.id}>
 {member.firstName} {member.lastName} ({member.role.replace("_", " ")})
 </option>
 ))}
 </select>
 </div>
 ))}
 {careOrders.filter(order => !assignments.some(a => a.careOrder.id === order.id)).length === 0 && (
 <p className="text-sm text-stone-500 text-center py-4">No unassigned orders</p>
 )}
 </div>
 </div>

 {/* Active Assignments */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h3 className="text-lg font-semibold mb-4">Active Assignments</h3>
 <div className="space-y-3">
 {assignments.map((assignment) => (
 <div key={assignment.id} className="rounded-lg border p-4">
 <div className="flex items-start justify-between mb-2">
 <div>
 <h4 className="font-semibold text-stone-900">
 {assignment.careOrder.careRecipient.firstName} {assignment.careOrder.careRecipient.lastName}
 </h4>
 <p className="text-sm text-stone-600">{assignment.careOrder.service.name}</p>
 </div>
 <span className={`rounded-full px-2 py-1 text-xs font-semibold ${assignment.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-700" }`}>
 {assignment.status}
 </span>
 </div>
 <div className="space-y-2 mt-3">
 <div className="flex items-center text-sm">
 <UserCheck className="size-4 text-teal-600 mr-2" />
 <span className="text-stone-700">
 <strong>Primary:</strong> {assignment.primaryStaff.firstName} {assignment.primaryStaff.lastName}
 </span>
 </div>
 {assignment.backupStaff && (
 <div className="flex items-center text-sm">
 <UserCheck className="size-4 text-stone-400 mr-2" />
 <span className="text-stone-700">
 <strong>Backup:</strong> {assignment.backupStaff.firstName} {assignment.backupStaff.lastName}
 </span>
 </div>
 )}
 <div className="flex items-center text-sm text-stone-500">
 <Calendar className="size-4 mr-2" />
 {assignment.careOrder.hoursPerWeek} hrs/week
 </div>
 </div>
 </div>
 ))}
 {assignments.length === 0 && (
 <p className="text-sm text-stone-500 text-center py-4">No active assignments</p>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
