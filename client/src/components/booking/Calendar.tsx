/**
 * Simple Calendar Component
 * Basic calendar for booking system
 */


import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarProps {
 onDateSelect: (date: Date) => void;
 selectedDate?: Date;
 availableDates?: Date[];
 availableDaysOfWeek?: string[];
}

// TODO: Move default value outside component
export function Calendar({ onDateSelect, selectedDate, availableDates = [], availableDaysOfWeek }: CalendarProps) {
 const [view, setView] = useState<'month' | 'week'>('month');
 const [baseDate, setBaseDate] = useState(() => new Date());

 const monthNames = [
 'January', 'February', 'March', 'April', 'May', 'June',
 'July', 'August', 'September', 'October', 'November', 'December'
 ];

 const getStartDateOfWeek = (date: Date) => {
 const d = new Date(date);
 const day = d.getDay();
 const diff = d.getDate() - day; // adjust when day is sunday
 return new Date(d.setDate(diff));
 };

 const handlePrevious = () => {
 if (view === 'month') {
 setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1));
 } else {
 const newDate = new Date(baseDate);
 newDate.setDate(baseDate.getDate() - 7);
 setBaseDate(newDate);
 }
 };

 const handleNext = () => {
 if (view === 'month') {
 setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
 } else {
 const newDate = new Date(baseDate);
 newDate.setDate(baseDate.getDate() + 7);
 setBaseDate(newDate);
 }
 };

 const isDateAvailable = (date: Date) => {
 // Check specific dates if provided
 if (availableDates.length > 0) {
 return availableDates.some(
 d => d.toDateString() === date.toDateString()
 );
 }

 // Check weekdays if provided
 if (availableDaysOfWeek && availableDaysOfWeek.length > 0) {
 const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
 return availableDaysOfWeek.includes(dayName);
 }

 return true;
 };

 const isDateSelected = (date: Date) => {
 return selectedDate?.toDateString() === date.toDateString();
 };

 const isDatePast = (date: Date) => {
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 return date < today;
 };

 const handleDateClick = (date: Date) => {
 if (!isDatePast(date) && isDateAvailable(date)) {
 onDateSelect(date);
 }
 };

 const handleSetWeekView = useCallback(() => setView('week'), []);
 const handleSetMonthView = useCallback(() => setView('month'), []);

 const renderDays = () => {
 const days = [];

 if (view === 'month') {
 const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
 const firstDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).getDay();

 // Empty cells for days before month starts
 for (let i = 0; i < firstDayOfMonth; i++) {
 days.push(<div key={`empty-${i}`} className="p-2"></div>);
 }

 // Days of the month
 for (let day = 1; day <= daysInMonth; day++) {
 const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
 days.push(renderDayButton(date));
 }
 } else {
 // Week View
 const startOfWeek = getStartDateOfWeek(baseDate);
 for (let i = 0; i < 7; i++) {
 const date = new Date(startOfWeek);
 date.setDate(startOfWeek.getDate() + i);
 days.push(renderDayButton(date));
 }
 }

 return days;
 };

 const renderDayButton = (date: Date) => {
 const isPast = isDatePast(date);
 const isAvailable = isDateAvailable(date);
 const isSelected = isDateSelected(date);
 const isToday = new Date().toDateString() === date.toDateString();

 return (
 <button
 key={date.toISOString()}
 onClick={() => handleDateClick(date)}
 disabled={isPast || !isAvailable}
 className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative ${view === 'week' ? 'h-24' : 'h-14'} ${isSelected ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 transform scale-105 z-10' : ''} ${!isSelected && !isPast && isAvailable ? 'hover:bg-teal-50 text-stone-700 hover:text-teal-700' : ''} ${(isPast || !isAvailable) && !isSelected ? 'text-stone-200 cursor-not-allowed' : 'cursor-pointer'} ${isToday && !isSelected ? 'border-2 border-teal-200 bg-teal-50/30 text-teal-700 font-bold' : ''}`}
 >
 <span className={`text-sm ${view === 'week' ? 'mb-1' : ''}`}>{date.getDate()}</span>
 {view === 'week' && isAvailable && !isPast && (
 <span className={`text-[10px] font-medium ${isSelected ? 'text-teal-100' : 'text-teal-600'}`}>
 Available
 </span>
 )}
 </button>
 );
 };

 return (
 <div className="bg-white rounded-[2rem] border border-stone-100 p-6 shadow-sm">
 {/* Header */}
 <div className="flex items-center justify-between mb-8">
 <div className="flex items-center gap-2">
 <button
 onClick={handlePrevious}
 className="p-2 hover:bg-stone-50 rounded-xl transition-colors text-stone-500 border border-transparent hover:border-stone-100"
 >
 <ChevronLeft className="size-5" />
 </button>
 <h3 className="text-xl font-semibold text-stone-900 min-w-[160px] text-center">
 {view === 'month'
 ? `${monthNames[baseDate.getMonth()]} ${baseDate.getFullYear()}`
 : `${monthNames[getStartDateOfWeek(baseDate).getMonth()]} ${getStartDateOfWeek(baseDate).getDate()} - ${new Date(getStartDateOfWeek(baseDate).getTime() + 6 * 86400000).getDate()}`
 }
 </h3>
 <button
 onClick={handleNext}
 className="p-2 hover:bg-stone-50 rounded-xl transition-colors text-stone-500 border border-transparent hover:border-stone-100"
 >
 <ChevronRight className="size-5" />
 </button>
 </div>

 <div className="flex bg-stone-100 p-1 rounded-xl">
 <button
 onClick={handleSetWeekView}
 className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === 'week' ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
 >
 Week
 </button>
 <button
 onClick={handleSetMonthView}
 className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === 'month' ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
 >
 Month
 </button>
 </div>
 </div>

 {/* Day names */}
 <div className="grid grid-cols-7 gap-2 mb-4">
 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
 <div key={day} className="text-center text-xs font-bold text-stone-300 uppercase tracking-widest py-2">
 {day}
 </div>
 ))}
 </div>

 {/* Days grid */}
 <div className="grid grid-cols-7 gap-2">
 {renderDays()}
 </div>

 {/* Legend */}
 <div className="mt-8 pt-6 border-t border-stone-50 flex items-center justify-center sm:justify-end gap-6 text-xs font-bold">
 <div className="flex items-center gap-2">
 <div className="size-3 bg-teal-500 rounded-full shadow-sm shadow-teal-200"></div>
 <span className="text-stone-700">Selected</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="size-3 border-2 border-teal-200 bg-white rounded-full"></div>
 <span className="text-stone-500">Available</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="size-3 bg-stone-100 rounded-full"></div>
 <span className="text-stone-300">Unavailable</span>
 </div>
 </div>
 </div>
 );
}
