
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
 Home,
 BookOpen,
 Users,
 Upload,
 Award,
 BarChart,
 LogOut,
 GraduationCap
} from "lucide-react";

const sidebarItems = [
 { label: "Dashboard", icon: Home, href: "/trainer" },
 { label: "My Courses", icon: BookOpen, href: "/trainer/courses" },
 { label: "Students", icon: Users, href: "/trainer/students" },
 { label: "Upload Content", icon: Upload, href: "/trainer/upload" },
 { label: "Certificates", icon: Award, href: "/trainer/certificates" },
 { label: "Analytics", icon: BarChart, href: "/trainer/analytics" },
];

export function Sidebar() {
 const { pathname } = useLocation();

 return (
 <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white text-stone-900 transition-transform">
 <div className="flex h-16 items-center border-b px-6">
 <GraduationCap className="size-6 text-teal-600 mr-2" />
 <span className="text-xl font-bold text-teal-700">Trainer Portal</span>
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
