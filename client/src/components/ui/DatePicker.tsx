
import { useState, useRef, useEffect, useCallback } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

const formatLocalDate = (date: Date | string | undefined) => {
 if (!date) return '';
 const d = typeof date === 'string' ? new Date(date) : date;
 return d.toISOString().split('T')[0];
};

interface DatePickerProps {
 value: string; // ISO date string YYYY-MM-DD
 onChange: (date: string) => void;
 label?: string;
 placeholder?: string;
 className?: string;
 minDate?: Date;
 maxDate?: Date;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
 "January", "February", "March", "April", "May", "June",
 "July", "August", "September", "October", "November", "December"
];

export function DatePicker({ value, onChange, label, placeholder = "Select date", className, minDate, maxDate }: DatePickerProps) {
 const [isOpen, setIsOpen] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 // Parse input date or default to today
 const currentDate = value ? new Date(value) : new Date();

 // View state (for navigation)
 const [viewDate, setViewDate] = useState(currentDate);
 const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

 // Sync view only when opening (optional, or keep independent)
 useEffect(() => {
 if (isOpen && value) {
 setViewDate(new Date(value));
 }
 }, [isOpen, value]);

 // Close on outside click
 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 setViewMode('days');
 }
 }
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 // Format date for display
 const displayValue = value ? new Date(value).toLocaleDateString("en-US", {
 year: "numeric",
 month: "long",
 day: "numeric"
 }) : "";

 // Calendar Logic
 const getDaysInMonth = (date: Date) => {
 const year = date.getFullYear();
 const month = date.getMonth();
 const days = new Date(year, month + 1, 0).getDate();
 const firstDay = new Date(year, month, 1).getDay();
 return { days, firstDay };
 };

 const { days, firstDay } = getDaysInMonth(viewDate);

 const handleDateClick = (day: number) => {
 const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
 // Handle timezone offset padding for YYYY-MM-DD string
 const offset = newDate.getTimezoneOffset();
 const adjustedDate = new Date(newDate.getTime() - (offset * 60 * 1000));
 onChange(formatLocalDate(adjustedDate));
 setIsOpen(false);
 };

 const changeMonth = (increment: number) => {
 const newDate = new Date(viewDate);
 newDate.setMonth(newDate.getMonth() + increment);
 setViewDate(newDate);
 };

 const changeYear = (year: number) => {
 const newDate = new Date(viewDate);
 newDate.setFullYear(year);
 setViewDate(newDate);
 setViewMode('months'); // go back to months or days? let's go to months then days
 };

 const generateYears = (startYear: number, count: number) => {
 return Array.from({ length: count }, (_, i) => startYear - 10 + i);
 };

 const handleToggleOpen = useCallback(() => {
 setIsOpen(prev => !prev);
 }, []);

 const handleViewYears = useCallback(() => {
 setViewMode('years');
 }, []);

 const handleViewDays = useCallback(() => {
 setViewMode('days');
 }, []);

 return (
 <div className={cn("relative", className)} ref={containerRef}>
 {/* Input Trigger */}
 <div role="button" tabIndex={0}
 onClick={handleToggleOpen}
 className={cn(
 "w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-white hover:border-teal-200",
 isOpen && "border-teal-500 bg-white ring-4 ring-teal-500/10"
 )}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}>
 <span className={cn("font-medium text-lg", !value ? "text-stone-400" : "text-stone-900")}>
 {displayValue || placeholder}
 </span>
 <CalendarIcon className={cn("size-5 text-stone-400", isOpen && "text-teal-500")} />
 </div>

 {/* Dropdown */}
 <AnimatePresence>
 {isOpen && (
 <m.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="absolute z-50 mt-2 w-full min-w-[300px] bg-white rounded-2xl shadow-xl border border-stone-100 p-4 overflow-hidden"
 >
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 {viewMode === 'days' && (
 <>
 <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-stone-100 rounded-lg">
 <ChevronLeft className="size-5 text-stone-600" />
 </button>
 <button
 onClick={handleViewYears}
 className="font-bold text-stone-900 flex items-center gap-1 hover:bg-stone-50 px-2 py-1 rounded-lg"
 >
 {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
 <ChevronDown className="size-4 text-stone-400" />
 </button>
 <button onClick={() => changeMonth(1)} className="p-1 hover:bg-stone-100 rounded-lg">
 <ChevronRight className="size-5 text-stone-600" />
 </button>
 </>
 )}
 {viewMode !== 'days' && (
 <button
 onClick={handleViewDays}
 className="flex items-center gap-1 text-sm font-bold text-stone-500 hover:text-stone-900"
 >
 <ChevronLeft className="size-4" /> Back
 </button>
 )}
 </div>

 {/* Days View */}
 {viewMode === 'days' && (
 <>
 <div className="grid grid-cols-7 mb-2">
 {DAYS.map((d) => (
 <div key={d} className="text-center text-xs font-bold text-stone-400 py-1">
 {d}
 </div>
 ))}
 </div>
 <div className="grid grid-cols-7 gap-1">
 {Array.from({ length: firstDay }).map((_, i) => (
 <div key={`empty-${i}`} />
 ))}
 {Array.from({ length: days }).map((_, i) => {
 const day = i + 1;
 const currentDayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
 const isSelected = value && new Date(value).toDateString() === currentDayDate.toDateString();
 const isToday = new Date().toDateString() === currentDayDate.toDateString();

 return (
 <button
 key={day}
 onClick={() => handleDateClick(day)}
 className={cn(
 "size-9 rounded-full flex items-center justify-center text-sm transition-all relative",
 isSelected
 ? "bg-stone-900 text-white font-bold shadow-md transform scale-105"
 : "text-stone-700 hover:bg-stone-100",
 isToday && !isSelected && "text-teal-600 font-bold bg-teal-50"
 )}
 >
 {day}
 {isToday && !isSelected && (
 <div className="absolute bottom-1 size-1 bg-teal-500 rounded-full" />
 )}
 </button>
 );
 })}
 </div>
 </>
 )}

 {/* Years View */}
 {viewMode === 'years' && (
 <div className="h-[250px] overflow-y-auto custom-scrollbar grid grid-cols-3 gap-2">
 {generateYears(viewDate.getFullYear(), 100).map((year) => (
 <button
 key={year}
 onClick={() => {
 changeYear(year);
 setViewMode('months');
 }}
 className={cn(
 "py-2 rounded-xl text-sm font-medium transition-colors",
 year === viewDate.getFullYear()
 ? "bg-stone-900 text-white"
 : "bg-stone-50 hover:bg-stone-100 text-stone-700"
 )}
 >
 {year}
 </button>
 ))}
 </div>
 )}

 {/* Months View */}
 {viewMode === 'months' && (
 <div className="grid grid-cols-2 gap-2">
 {MONTHS.map((month, index) => (
 <button
 key={month}
 onClick={() => {
 const newDate = new Date(viewDate);
 newDate.setMonth(index);
 setViewDate(newDate);
 setViewMode('days');
 }}
 className={cn(
 "py-3 rounded-xl text-sm font-medium transition-colors border",
 index === viewDate.getMonth()
 ? "bg-teal-50 border-teal-200 text-teal-700 font-bold"
 : "bg-white border-transparent hover:bg-stone-50 text-stone-700"
 )}
 >
 {month}
 </button>
 ))}
 </div>
 )}

 </m.div>
 )}
 </AnimatePresence>
 </div>
 );
}
