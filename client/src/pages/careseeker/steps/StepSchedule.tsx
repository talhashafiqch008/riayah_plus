
import { m, LazyMotion, domAnimation } from "framer-motion";
import {
 ArrowRight, ArrowLeft, Calendar, Clock, Check,
 Sun, Moon, Sunrise, Sunset, CalendarDays, Repeat,
 CalendarClock, Zap, CalendarRange, ChevronDown
} from "lucide-react";

// Lucide icons for consistency
const TIME_SLOTS = [
 { id: 'morning', label: 'Morning', time: '6am - 12pm', icon: Sunrise },
 { id: 'afternoon', label: 'Afternoon', time: '12pm - 6pm', icon: Sun },
 { id: 'evening', label: 'Evening', time: '6pm - 10pm', icon: Sunset },
 { id: 'overnight', label: 'Overnight', time: '10pm - 6am', icon: Moon },
];

const FREQUENCY_OPTIONS = [
 {
 id: 'one_time',
 label: 'One-time',
 description: 'A single visit or session',
 icon: CalendarDays
 },
 {
 id: 'weekly',
 label: 'Weekly',
 description: 'Regular weekly schedule',
 icon: Repeat
 },
 {
 id: 'daily',
 label: 'Daily',
 description: 'Everyday care support',
 icon: CalendarRange
 },
 {
 id: 'flexible',
 label: 'As Needed',
 description: 'Book when you need',
 icon: Zap
 },
];

const DAYS_OF_WEEK = [
 { id: 'sun', label: 'Sun' },
 { id: 'mon', label: 'Mon' },
 { id: 'tue', label: 'Tue' },
 { id: 'wed', label: 'Wed' },
 { id: 'thu', label: 'Thu' },
 { id: 'fri', label: 'Fri' },
 { id: 'sat', label: 'Sat' },
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

// Helper Component for Time Selection
function TimePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
 // Parse time string (HH:mm) to internal state
 const parseTime = (timeStr: string) => {
 if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };
 const [h, m] = timeStr.split(':').map(Number);
 const period = h >= 12 ? 'PM' : 'AM';
 const hour = h % 12 || 12;
 return {
 hour: hour.toString(),
 minute: m.toString().padStart(2, '0'),
 period
 };
 };

 const { hour, minute, period } = parseTime(value);

 const updateTime = (newHour: string, newMinute: string, newPeriod: string) => {
 let h = parseInt(newHour);
 if (newPeriod === 'PM' && h !== 12) h += 12;
 if (newPeriod === 'AM' && h === 12) h = 0;
 const timeStr = `${h.toString().padStart(2, '0')}:${newMinute}`;
 onChange(timeStr);
 };

 return (
 <div className="flex gap-2">
 <div className="relative flex-1">
 <select
 className="w-full p-3 rounded-xl ring-1 ring-stone-200/50 bg-stone-800 appearance-none font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
 value={hour}
 onChange={(e) => updateTime(e.target.value, minute, period)}
 >
 {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
 <option key={h} value={h}>{h}</option>
 ))}
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
 <ChevronDown className="size-4" />
 </div>
 </div>
 <div className="relative flex-1">
 <select
 className="w-full p-3 rounded-xl ring-1 ring-stone-200/50 bg-stone-800 appearance-none font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
 value={minute}
 onChange={(e) => updateTime(hour, e.target.value, period)}
 >
 {['00', '15', '30', '45'].map(m => ( // Simplified to 15m intervals for cleaner UI, or use 0-55 step 5
 // Let's stick to 15m intervals for now as it's cleaner for onboarding
 <option key={m} value={m}>{m}</option>
 ))}
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
 <ChevronDown className="size-4" />
 </div>
 </div>
 <div className="relative flex-1">
 <select
 className="w-full p-3 rounded-xl ring-1 ring-stone-200/50 bg-stone-800 appearance-none font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
 value={period}
 onChange={(e) => updateTime(hour, minute, e.target.value)}
 >
 <option value="AM">AM</option>
 <option value="PM">PM</option>
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
 <ChevronDown className="size-4" />
 </div>
 </div>
 </div>
 );
}

interface StepScheduleProps {
 data: Record<string, unknown>;
 onUpdate: (data: Record<string, unknown>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepSchedule({ data, onUpdate, onNext, onBack }: StepScheduleProps) {
 const selectedDays: string[] = (data.preferredDays as string[]) || [];
 const selectedTimeSlots: string[] = ((data.preferredTimeSlots as string[]) as string[]) || [];

 const toggleDay = (dayId: string) => {
 const newDays = selectedDays.includes(dayId)
 ? selectedDays.filter(d => d !== dayId)
 : [...selectedDays, dayId];
 onUpdate({ preferredDays: newDays });
 };

 const toggleTimeSlot = (slotId: string) => {
 const newSlots = selectedTimeSlots.includes(slotId)
 ? selectedTimeSlots.filter(s => s !== slotId)
 : [...selectedTimeSlots, slotId];
 onUpdate({ preferredTimeSlots: newSlots, isCustomTime: false });
 };

 // Frequency is required for matching
 const isValid = data.scheduleType as string;

 return (
 <div className="space-y-10">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-3 mb-2">
 <div className="size-12 bg-teal-100 rounded-2xl flex items-center justify-center rotate-3">
 <CalendarClock className="size-6 text-teal-600" />
 </div>
 <div>
 <h2 className="text-2xl font-semibold text-stone-900 leading-none">When do you need care?</h2>
 <p className="text-stone-500 mt-1">Select your preferred schedule.</p>
 </div>
 </div>
 </m.div>

 {/* Frequency */}
 <m.div {...fadeIn} transition={{ delay: 0.1 }}>
 <div className="flex items-center gap-2 mb-4">
 <Clock className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">How often?</h3>
 <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wide">Required</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {FREQUENCY_OPTIONS.map((option, index) => {
 const isSelected = (data.scheduleType as string) === option.id;
 const Icon = option.icon;
 return (
 <m.button
 key={option.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 + index * 0.05 }}
 onClick={() => onUpdate({ scheduleType: option.id })}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`group p-5 rounded-[24px] border-2 text-left transition-transform duration-300 relative overflow-hidden ${isSelected ? 'border-teal-500 bg-teal-600 text-white shadow-lg' : 'ring-1 ring-stone-100/50 bg-stone-800 hover:border-stone-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]' }`}
 >
 <div className="flex items-center gap-4 relative z-10">
 <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-50 text-stone-500 group-hover:bg-stone-100'}`}>
 <Icon className="size-6" />
 </div>
 <div className="flex-1">
 <span className={`text-lg font-bold block mb-0.5 ${isSelected ? 'text-white' : 'text-stone-900'}`}>
 {option.label}
 </span>
 <span className={`text-xs ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
 {option.description}
 </span>
 </div>
 {isSelected && <Check className="size-6 text-white" />}
 </div>
 </m.button>
 );
 })}
 </div>
 </m.div>

 {/* Preferred Days - only show if not one-time */}
 <m.div>
 {(data.scheduleType as string) && data.scheduleType !== 'one_time' && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 transition={{ duration: 0.3 }}
 className="overflow-hidden"
 >
 <div className="py-2 space-y-4">
 <div className="flex items-center gap-2">
 <CalendarDays className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Preferred Days</h3>
 <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full uppercase tracking-wide">Optional</span>
 </div>
 <div className="flex gap-2 w-full justify-between sm:justify-start">
 {DAYS_OF_WEEK.map((day) => {
 const isSelected = selectedDays.includes(day.id);
 return (
 <m.button
 key={day.id}
 onClick={() => toggleDay(day.id)}
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 className={`w-10 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 font-bold text-sm transition-transform duration-300 flex flex-col items-center justify-center gap-1 ${isSelected ? 'border-teal-500 bg-teal-600 text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'ring-1 ring-stone-100/50 text-stone-400 hover:border-stone-300 hover:text-stone-600' }`}
 >
 <span className="text-[10px] font-normal opacity-70 block sm:hidden">{day.label.charAt(0)}</span>
 <span className="text-[10px] font-normal opacity-70 hidden sm:block">{day.label}</span>
 {isSelected && <div className="size-1 bg-stone-800 rounded-full mt-0.5" />}
 </m.button>
 );
 })}
 </div>
 </div>
 </m.div>
 )}
 </m.div>

 {/* Preferred Times */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }}>
 <div className="flex items-center gap-2 mb-4">
 <Clock className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Preferred Time Slots</h3>
 <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full uppercase tracking-wide">Optional</span>
 </div>

 <div className="grid grid-cols-2 gap-3 mb-4">
 {TIME_SLOTS.map((slot) => {
 const isSelected = selectedTimeSlots.includes(slot.id);
 const Icon = slot.icon;
 return (
 <m.button
 key={slot.id}
 onClick={() => toggleTimeSlot(slot.id)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className={`p-4 rounded-2xl border-2 text-left transition-transform duration-300 flex items-center gap-3 ${isSelected && !Boolean(data.isCustomTime) ? 'border-teal-500 bg-teal-600 text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'ring-1 ring-stone-100/50 hover:border-stone-300 bg-stone-800' }`}
 >
 <Icon className={`size-5 ${isSelected && !Boolean(data.isCustomTime) ? 'text-white' : 'text-stone-400'}`} />
 <div>
 <span className={`font-bold text-sm block ${isSelected && !Boolean(data.isCustomTime) ? 'text-white' : 'text-stone-900'}`}>
 {slot.label}
 </span>
 <span className={`text-[10px] block ${isSelected && !Boolean(data.isCustomTime) ? 'text-stone-400' : 'text-stone-400'}`}>
 {slot.time}
 </span>
 </div>
 </m.button>
 );
 })}
 </div>

 {/* Custom Time Option */}
 <div className="space-y-4">
 <m.button
 onClick={() => {
 const newIsCustom = !Boolean(data.isCustomTime);
 onUpdate({
 isCustomTime: newIsCustom,
 // Optional: Clear presets if going to custom?
 preferredTimeSlots: newIsCustom ? [] : (data.preferredTimeSlots as string[])
 });
 }}
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.99 }}
 className={`w-full p-4 rounded-2xl border-2 text-left transition-transform duration-300 flex items-center justify-between ${(data.isCustomTime as boolean) ? 'border-stone-900 bg-stone-50' : 'ring-1 ring-stone-100/50 hover:border-stone-300 bg-stone-800' }`}
 >
 <div className="flex items-center gap-3">
 <div className={`size-10 rounded-xl flex items-center justify-center ${(data.isCustomTime as boolean) ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-500' }`}>
 <Clock className="size-5" />
 </div>
 <div>
 <span className="font-bold text-stone-900 block">Custom Hours</span>
 <span className="text-xs text-stone-500">Choose specific start and end times</span>
 </div>
 </div>
 {Boolean(data.isCustomTime) && <Check className="size-5 text-stone-900" />}
 </m.button>

 {/* Custom Time Inputs */}
 {Boolean(data.isCustomTime) && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="space-y-4 p-5 bg-stone-50 rounded-2xl ring-1 ring-stone-100/50"
 >
 <div className="space-y-1.5">
 <span className="text-xs font-bold text-stone-500 uppercase ml-1">Start Time</span>
 <TimePicker
 value={data.customStartTime as string}
 onChange={(val) => onUpdate({ customStartTime: val })}
 />
 </div>
 <div className="space-y-1.5">
 <span className="text-xs font-bold text-stone-500 uppercase ml-1">End Time</span>
 <TimePicker
 value={data.customEndTime as string}
 onChange={(val) => onUpdate({ customEndTime: val })}
 />
 </div>
 </m.div>
 )}
 </div>
 </m.div>

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.3 }}
 className="flex justify-between items-center pt-8 border-t ring-1 ring-stone-100/50"
 >
 <button
 onClick={onBack}
 className="group flex items-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors px-4 py-2 rounded-xl hover:bg-stone-100"
 >
 <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
 Back
 </button>
 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className="px-8 py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
 >
 Continue
 <ArrowRight className="size-5" />
 </m.button>
 </m.div>
 </div>
 );
}
