
import { Bell, User } from "lucide-react";

export function Topbar() {
 return (
 <header className="flex h-16 items-center justify-between border-b bg-white px-6">
 <div>
 <h2 className="text-lg font-semibold text-stone-900">Welcome back, Staff Member</h2>
 <p className="text-sm text-stone-500">Manage your shifts and tasks</p>
 </div>

 <div className="flex items-center gap-4">
 <button className="relative rounded-full p-2 hover:bg-stone-100">
 <Bell className="size-5 text-stone-600" />
 <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
 </button>

 <div className="flex items-center gap-3 border-l pl-4">
 <div className="size-8 rounded-full bg-teal-100 flex items-center justify-center">
 <User className="size-5 text-teal-700" />
 </div>
 </div>
 </div>
 </header>
 );
}
