
import { useState } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";




export default function StaffTasksPage() {
 const [tasks, setTasks] = useState([
 { id: 1, title: "Complete medication log for Margaret Thompson", priority: "high", completed: false, dueDate: "2025-12-19" },
 { id: 2, title: "Submit timesheet for last week", priority: "medium", completed: false, dueDate: "2025-12-20" },
 { id: 3, title: "Review care plan updates", priority: "low", completed: false, dueDate: "2025-12-21" },
 { id: 4, title: "Attend team meeting", priority: "medium", completed: true, dueDate: "2025-12-18" },
 ]);

 const toggleTask = (id: number) => {
 setTasks(tasks.map(task =>
 task.id === id ? { ...task, completed: !task.completed } : task
 ));
 };

 const getPriorityColor = (priority: string) => {
 switch (priority) {
 case "high": return "text-red-600 bg-red-50";
 case "medium": return "text-yellow-600 bg-yellow-50";
 case "low": return "text-green-600 bg-green-50";
 default: return "text-stone-600 bg-stone-50";
 }
 };

 const activeTasks = tasks.filter(t => !t.completed);
 const completedTasks = tasks.filter(t => t.completed);

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Tasks</h1>
 <p className="text-sm text-stone-500">Manage your daily tasks and to-dos</p>
 </div>

 {/* Stats */}
 <div className="grid gap-6 md:grid-cols-3">
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Active Tasks</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">{activeTasks.length}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">Completed</p>
 <p className="mt-2 text-3xl font-bold text-stone-900">{completedTasks.length}</p>
 </div>
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <p className="text-sm font-medium text-stone-500">High Priority</p>
 <p className="mt-2 text-3xl font-bold text-red-600">
 {activeTasks.filter(t => t.priority === "high").length}
 </p>
 </div>
 </div>

 {/* Active Tasks */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Active Tasks</h2>
 <div className="space-y-3">
 {activeTasks.map((task) => (
 <div key={task.id} className="flex items-start gap-3 rounded-lg border p-4 hover:bg-stone-50">
 <button
 onClick={() => toggleTask(task.id)}
 className="mt-0.5"
 >
 <Circle className="size-5 text-stone-400 hover:text-teal-600" />
 </button>
 <div className="flex-1">
 <p className="text-sm font-medium text-stone-900">{task.title}</p>
 <div className="mt-1 flex items-center gap-2">
 <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityColor(task.priority)}`}>
 {task.priority}
 </span>
 <span className="text-xs text-stone-500">
 Due: {new Date(task.dueDate).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>
 ))}
 {activeTasks.length === 0 && (
 <p className="text-center text-stone-500 py-8">No active tasks</p>
 )}
 </div>
 </div>

 {/* Completed Tasks */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h2 className="text-lg font-semibold text-stone-900 mb-4">Completed Tasks</h2>
 <div className="space-y-3">
 {completedTasks.map((task) => (
 <div key={task.id} className="flex items-start gap-3 rounded-lg border p-4 bg-stone-50">
 <button
 onClick={() => toggleTask(task.id)}
 className="mt-0.5"
 >
 <CheckCircle2 className="size-5 text-teal-600" />
 </button>
 <div className="flex-1">
 <p className="text-sm font-medium text-stone-500 line-through">{task.title}</p>
 <span className="text-xs text-stone-400">
 Completed: {new Date(task.dueDate).toLocaleDateString()}
 </span>
 </div>
 </div>
 ))}
 {completedTasks.length === 0 && (
 <p className="text-center text-stone-500 py-8">No completed tasks</p>
 )}
 </div>
 </div>
 </div>
 );
}
