
import { useState } from 'react';
import { createSession } from '@/lib/api';
import { isApiError } from '@/lib/errors';
import { BookingError } from '@/lib/errors/domain';
import { ErrorFallback } from '@/components/errors/ErrorFallback';
import { z } from 'zod';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import toast from 'react-hot-toast';

const formatLocalDateTime = (date: Date | string | undefined) => {
 if (!date) return '';
 const d = typeof date === 'string' ? new Date(date) : date;
 return d.toISOString();
};

const sessionBookingSchema = z.object({
 scheduledAt: z.string().min(1, 'Please select a date and time'),
 type: z.string().min(1, 'Please select a service type'),
 duration: z.number().min(1, 'Duration must be at least 1 minute')
});

interface Provider {
 id: string;
 firstName?: string;
 lastName?: string;
}

interface BookingModalProps {
 isOpen: boolean;
 onClose: () => void;
 provider: Provider;
}

export default function BookingModal({ isOpen, onClose, provider }: BookingModalProps) {
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 scheduledAt: '',
 type: 'one-off',
 duration: 60,
 notes: '',
 });
 const [success, setSuccess] = useState(false);
 const [domainError, setDomainError] = useState<BookingError | null>(null);

 if (!isOpen || !provider) return null;

 const handleSubmit = async (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 setLoading(true);
 setDomainError(null);

 const validation = sessionBookingSchema.safeParse(formData);
 if (!validation.success) {
 const firstError = validation.error.issues[0];
 toast.error(firstError?.message || 'Please check your booking details');
 setLoading(false);
 return;
 }

 try {
 const startDate = new Date(formData.scheduledAt);
 const endDate = new Date(startDate.getTime() + Number(formData.duration) * 60000);
 const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

 await createSession({
 providerId: provider.id,
 scheduledAt: formatLocalDateTime(startDate),
 startTime: formatTime(startDate),
 endTime: formatTime(endDate),
 bookingType: formData.type,
 notes: formData.notes,
 });
 setSuccess(true);
 setTimeout(() => {
 onClose();
 setSuccess(false);
 }, 2000);
 } catch (error) {
 console.error('Booking failed:', error);
 if (error instanceof BookingError) {
 setDomainError(error);
 } else if (isApiError(error)) {
 toast.error(error.message || 'Failed to book session. Please try again.');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to book session. Please try again.');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <AnimatePresence>
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
 >
 <m.div
 initial={{ scale: 0.95 }}
 animate={{ scale: 1 }}
 className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
 >
 <div className="p-6">
 <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Book Session</h2>
 <p className="text-neutral-600 mb-6">
 Schedule a visit with <span className="font-semibold text-primary-700">{provider.firstName} {provider.lastName}</span>
 </p>

 {success ? (
 <div className="text-center py-8">
 <div className="text-5xl mb-4">✅</div>
 <h3 className="text-xl font-semibold text-neutral-900">Booking Requested!</h3>
 <p className="text-neutral-500 mt-2">The provider will verify your request shortly.</p>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label htmlFor="date---time" className="block text-sm font-medium text-neutral-700 mb-1">Date & Time</label>
 <input id="date---time"
 type="datetime-local"
 required
 className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none"
 value={formData.scheduledAt}
 onChange={(e) => setFormData(prev => ({...prev, scheduledAt: e.target.value }))}
 />
 </div>

 <div>
 <label htmlFor="service-type" className="block text-sm font-medium text-neutral-700 mb-1">Service Type</label>
 <select id="service-type"
 className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none"
 value={formData.type}
 onChange={(e) => setFormData(prev => ({...prev, type: e.target.value }))}
 >
 <option value="consultation">Consultation</option>
 <option value="care_visit">Home Care Visit</option>
 <option value="telehealth">Telehealth Call</option>
 </select>
 </div>

 <div>
 <label htmlFor="duration--minutes" className="block text-sm font-medium text-neutral-700 mb-1">Duration (Minutes)</label>
 <select id="duration--minutes"
 className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none"
 value={formData.duration}
 onChange={(e) => setFormData(prev => ({...prev, duration: Number(e.target.value) }))}
 >
 <option value={30}>30 Minutes</option>
 <option value={60}>1 Hour</option>
 <option value={120}>2 Hours</option>
 <option value={240}>4 Hours</option>
 </select>
 </div>

 <div>
 <label htmlFor="notes--optional" className="block text-sm font-medium text-neutral-700 mb-1">Notes (Optional)</label>
 <textarea id="notes--optional"
 className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none"
 rows={3}
 placeholder="Describe your needs..."
 value={formData.notes}
 onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value }))}
 />
 </div>

 {domainError && (
 <div className="pt-2">
 <ErrorFallback
 error={domainError}
 onRetry={() => handleSubmit()}
 onDismiss={() => setDomainError(null)}
 />
 </div>
 )}

 <div className="flex gap-3 pt-4">
 <button
 type="button"
 onClick={onClose}
 className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 font-medium rounded-lg hover:bg-neutral-200 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
 >
 {loading ? 'Booking...' : 'Confirm Request'}
 </button>
 </div>
 </form>
 )}
 </div>
 </m.div>
 </m.div>
 </AnimatePresence>
 );
}
