/**
 * Time Slot Selector Component
 * Displays and allows selection of available time slots
 */


import { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProviderSlots } from '@/lib/api';

interface TimeSlot {
 startTime: string;
 endTime: string;
 available: boolean;
}

interface TimeSlotSelectorProps {
 providerId: string;
 selectedDate: Date;
 onSlotSelect: (slot: TimeSlot) => void;
 selectedSlot?: TimeSlot;
 availableTimeSlots?: string[];
 availableDays?: string[];
}

export function TimeSlotSelector({
 providerId,
 selectedDate,
 onSlotSelect,
 selectedSlot,
 // TODO: Move default value outside component
 availableTimeSlots = [],
 availableDays = []
}: TimeSlotSelectorProps) {
 const [slots, setSlots] = useState<TimeSlot[]>([]);
 const [loading, setLoading] = useState(true);

 // TODO: Move event handler out of effect
 useEffect(() => {
 if (selectedDate) {
 fetchSlots();
 }
 }, [selectedDate]);

 const formatLocalDate = (date: Date | string | undefined) => {
 if (!date) return '';
 const d = typeof date === 'string' ? new Date(date) : date;
 return d.toISOString().split('T')[0];
 };

 const fetchSlots = async () => {
 setLoading(true);
 try {
 const dateStr = formatLocalDate(selectedDate);
 const response = await getProviderSlots(providerId, dateStr);
 const apiSlots = response.slots || [];
 setSlots(apiSlots);
 } catch (error) {
 console.error('Failed to fetch provider slots:', error);
 setSlots([]);
 } finally {
 setLoading(false);
 }
 };

 const formatTime = (time: string) => {
 // Convert 24h to 12h format
 const [hours, minutes] = time.split(':').map(Number);
 const period = hours >= 12 ? 'PM' : 'AM';
 const displayHours = hours % 12 || 12;
 return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
 };

 const isSlotSelected = (slot: TimeSlot) => {
 return selectedSlot?.startTime === slot.startTime &&
 selectedSlot?.endTime === slot.endTime;
 };

 const groupSlotsByPeriod = () => {
 const morning: TimeSlot[] = [];
 const afternoon: TimeSlot[] = [];
 const evening: TimeSlot[] = [];

 slots.forEach(slot => {
 const hour = parseInt(slot.startTime.split(':')[0]);
 if (hour < 12) {
 morning.push(slot);
 } else if (hour < 17) {
 afternoon.push(slot);
 } else {
 evening.push(slot);
 }
 });

 return { morning, afternoon, evening };
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center p-8 bg-stone-50 rounded-[2rem]">
 <div className="animate-spin rounded-full size-8 border-b-2 border-teal-600"></div>
 </div>
 );
 }

  if (slots.length === 0) {
  return (
  <div className="text-center p-12 bg-stone-50 rounded-[2rem] border border-stone-100">
  <Clock className="size-12 text-stone-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-stone-900 mb-2">
  No Available Slots
  </h3>
  <p className="text-stone-500 max-w-xs mx-auto mb-4">
  The provider has no available time slots for this date.
  Please select a different date.
  </p>
  {availableDays.length > 0 && (
    <div className="text-sm text-stone-600">
      <p className="font-medium mb-1">Available on:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {availableDays.map((day) => (
          <span key={day} className="bg-teal-50 text-teal-700 px-2 py-1 rounded-lg capitalize">
            {day}
          </span>
        ))}
      </div>
    </div>
  )}
  </div>
  );
  }

 const { morning, afternoon, evening } = groupSlotsByPeriod();

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div>
 {/* Header removed as it might be redundant depending on parent, but keeping content minimal */}
 <span className="hidden">Selection</span>
 </div>
 </div>

 {/* Morning Slots */}
 {morning.length > 0 && (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
 <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
 <span className="size-2 rounded-full bg-amber-400"></span>
 Morning
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {morning.map((slot) => (
 <button
 key={slot.startTime}
 onClick={() => slot.available && onSlotSelect(slot)}
 disabled={!slot.available}
 className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${isSlotSelected(slot) ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100/50' : slot.available ? 'border-stone-100 bg-white hover:border-teal-300 hover:shadow-md' : 'border-stone-50 bg-stone-50 cursor-not-allowed opacity-40 grayscale' }`}
 >
 <div className="flex items-center justify-center gap-2 relative z-10">
 {isSlotSelected(slot) && (
 <CheckCircle className="size-4 text-teal-600" />
 )}
 <span className={`text-sm font-bold ${isSlotSelected(slot) ? 'text-teal-700' : 'text-stone-700 group-hover:text-teal-700' }`}>
 {formatTime(slot.startTime)}
 </span>
 </div>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Afternoon Slots */}
 {afternoon.length > 0 && (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
 <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
 <span className="size-2 rounded-full bg-orange-400"></span>
 Afternoon
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {afternoon.map((slot) => (
 <button
 key={slot.startTime}
 onClick={() => slot.available && onSlotSelect(slot)}
 disabled={!slot.available}
 className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${isSlotSelected(slot) ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100/50' : slot.available ? 'border-stone-100 bg-white hover:border-teal-300 hover:shadow-md' : 'border-stone-50 bg-stone-50 cursor-not-allowed opacity-40 grayscale' }`}
 >
 <div className="flex items-center justify-center gap-2 relative z-10">
 {isSlotSelected(slot) && (
 <CheckCircle className="size-4 text-teal-600" />
 )}
 <span className={`text-sm font-bold ${isSlotSelected(slot) ? 'text-teal-700' : 'text-stone-700 group-hover:text-teal-700' }`}>
 {formatTime(slot.startTime)}
 </span>
 </div>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Evening Slots */}
 {evening.length > 0 && (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
 <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
 <span className="size-2 rounded-full bg-teal-400"></span>
 Evening
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {evening.map((slot) => (
 <button
 key={slot.startTime}
 onClick={() => slot.available && onSlotSelect(slot)}
 disabled={!slot.available}
 className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${isSlotSelected(slot) ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100/50' : slot.available ? 'border-stone-100 bg-white hover:border-teal-300 hover:shadow-md' : 'border-stone-50 bg-stone-50 cursor-not-allowed opacity-40 grayscale' }`}
 >
 <div className="flex items-center justify-center gap-2 relative z-10">
 {isSlotSelected(slot) && (
 <CheckCircle className="size-4 text-teal-600" />
 )}
 <span className={`text-sm font-bold ${isSlotSelected(slot) ? 'text-teal-700' : 'text-stone-700 group-hover:text-teal-700' }`}>
 {formatTime(slot.startTime)}
 </span>
 </div>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Selected Slot Info */}
 {selectedSlot && (
 <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-6 animate-in fade-in zoom-in duration-300">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 text-teal-800">
 <div className="size-8 rounded-full bg-teal-100 flex items-center justify-center">
 <CheckCircle className="size-5 text-teal-600" />
 </div>
 <div>
 <h4 className="font-semibold text-sm text-teal-900">Slot Selected</h4>
 <span className="font-medium text-teal-700">
 {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
 </span>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
