
import { useState, useEffect , useRef } from 'react';
import { Calendar, Clock, Plus, Trash2, Save, Loader2, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { client } from '@/lib/api/client';


const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
 monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
 thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

interface TimeSlot {
 id?: number;
 day_of_week: string;
 start_time: string;
 end_time: string;
 is_instant_book: boolean;
 instant_book_rate: string;
}

export default function AvailabilityPage() {
 const [slots, setSlots] = useState<TimeSlot[]>([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 fetchAvailability();
 }, []);

 const fetchAvailability = async () => {
 try {
 setLoading(true);
 const response = await client.get('/provider/availability');
 if (response.data.success && response.data.slots) {
 setSlots(response.data.slots.map((s: Record<string, unknown>) => ({
 id: s.id as number,
 day_of_week: s.day_of_week as string,
 start_time: s.start_time as string,
 end_time: s.end_time as string,
 is_instant_book: (s.is_instant_book as boolean) || false,
 instant_book_rate: String(s.instant_book_rate || ''),
 })));
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load availability');
 }
 } finally {
 setLoading(false);
 }
 };

 const addSlot = (day: string) => {
 setSlots(prev => [...prev, {
 day_of_week: day,
 start_time: '09:00',
 end_time: '17:00',
 is_instant_book: false,
 instant_book_rate: '',
 }]);
 };

 const removeSlot = (index: number) => {
 setSlots(prev => prev.filter((_, i) => i !== index));
 };

 const updateSlot = (index: number, field: keyof TimeSlot, value: string | boolean) => {
 setSlots(prev => prev.map((slot, i) =>
 i === index ? { ...slot, [field]: value } : slot
 ));
 };

 const handleSave = async () => {
 try {
 setSaving(true);
 const payload = slots.map(s => ({
 day_of_week: s.day_of_week,
 start_time: s.start_time,
 end_time: s.end_time,
 is_instant_book: s.is_instant_book,
 instant_book_rate: s.instant_book_rate ? parseFloat(s.instant_book_rate) : null,
 }));

 const response = await client.post('/provider/availability', { slots: payload });
 if (response.data.success) {
 toast.success('Availability saved successfully');
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to save availability');
 } else {
 toast.error('Failed to save availability');
 }
 } finally {
 setSaving(false);
 }
 };

 const getSlotsForDay = (day: string) => slots.filter((_, i) => slots[i].day_of_week === day);

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 );
 }

 return (
 <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
 <div>
 <h1 className="text-3xl font-semibold text-stone-900 tracking-tight flex items-center gap-3">
 <Calendar className="size-8 text-teal-600" />
 My Availability
 </h1>
 <p className="text-stone-500 mt-2 text-lg">
 Set your weekly schedule so careseekers know when you are available.
 </p>
 </div>
 <Button
 onClick={handleSave}
 disabled={saving}
 className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl h-12 px-6"
 >
 {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
 Save Schedule
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {DAYS.map(day => (
 <div key={day} className="bg-white rounded-3xl border border-stone-200/60 p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-stone-900">{DAY_LABELS[day]}</h3>
 <button
 onClick={() => addSlot(day)}
 className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"
 >
 <Plus className="size-4" />
 </button>
 </div>

 <div className="space-y-3">
 {getSlotsForDay(day).length === 0 ? (
 <p className="text-sm text-stone-400 text-center py-4">No slots set</p>
 ) : (
 slots.map((slot, index) =>
 slot.day_of_week === day ? (
 <div key={`item-${index}`} className="bg-stone-50 rounded-xl p-3 space-y-2">
 <div className="flex items-center gap-2">
 <Clock className="size-4 text-stone-400" />
 <input
 type="time"
 value={slot.start_time}
 onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
 className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm w-24"
 />
 <span className="text-stone-400">-</span>
 <input
 type="time"
 value={slot.end_time}
 onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
 className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm w-24"
 />
 <button
 onClick={() => removeSlot(index)}
 className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
 >
 <Trash2 className="size-4" />
 </button>
 </div>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
 <input
 type="checkbox"
 checked={slot.is_instant_book}
 onChange={(e) => updateSlot(index, 'is_instant_book', e.target.checked)}
 className="rounded border-stone-300"
 />
 <Zap className="size-3.5" />
 Instant Book
 </label>
 {slot.is_instant_book && (
 <input
 type="number"
 value={slot.instant_book_rate}
 onChange={(e) => updateSlot(index, 'instant_book_rate', e.target.value)}
 placeholder="Rate SAR"
 className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm w-24"
 />
 )}
 </div>
 </div>
 ) : null
 )
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
