
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
 Home,
 Calendar,
 Clock,
 CheckSquare,
 FileText,
 MessageSquare,
 LogOut,
 Briefcase
} from "lucide-react";

const sidebarItems = [
 { label: "Dashboard", icon: Home, href: "/staff" },
 { label: "My Shifts", icon: Calendar, href: "/staff/shifts" },
 // { label: "Clock In/Out", icon: Clock, href: "/staff/clock" }, // Removed broken link, attendance is in Shifts
 { label: "Tasks", icon: CheckSquare, href: "/staff/tasks" },
 { label: "Session Notes", icon: FileText, href: "/staff/notes" },
 { label: "Messages", icon: MessageSquare, href: "/staff/messages" },
];

export function Sidebar() {
 const { pathname } = useLocation();

 return (
 <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white text-stone-900 transition-transform">
 <div className="flex h-16 items-center border-b px-6">
 <Briefcase className="size-6 text-teal-600 mr-2" />
 <span className="text-xl font-bold text-teal-700">Staff Portal</span>
 </div>

 <div className="flex flex-col justify-between h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
 <ul className="space-y-2">
 {sidebarItems.map((item) => {
 const isActive = pathname === item.href;
 return (
 <li key={item.href}>
 <Link
 to={item.href}
 className={cn(
 "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
 isActive
 ? "bg-teal-50 text-teal-700"
 : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
 )}
 >
 <item.icon className={cn("mr-3 size-5", isActive ? "text-teal-700" : "text-stone-500")} />
 {item.label}
 </Link>
 </li>
 );
 })}
 </ul>

 <div className="border-t pt-4">
 <button className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
 <LogOut className="mr-3 size-5" />
 Sign Out
 </button>
 </div>
 </div>
 </aside>
 );
}
