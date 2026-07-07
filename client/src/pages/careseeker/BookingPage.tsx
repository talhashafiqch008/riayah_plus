/**
 * Booking Confirmation Page
 * Complete booking flow with payment integration
 */


;
import { Link } from 'react-router-dom';
import { useState, useEffect , useRef } from 'react';
import { Calendar } from '@/components/booking/Calendar';
import { TimeSlotSelector } from '@/components/booking/TimeSlotSelector';
import { Button } from '@/components/ui/button';
import {
 CheckCircle,
 Calendar as CalendarIcon,
 Clock,
 User,
 CreditCard,
 ArrowLeft,
 Shield,
 Video,
 Phone,
 MessageSquare,
 Home,
 MapPin,
 Star,
 Sparkles,
 ChevronRight,
 Lock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from "react-hot-toast";
import { createBooking, getProviderDetails } from '@/lib/api';
import { payWithCredits } from '@/lib/api/bookings';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { isApiError } from '@/lib/errors';
import { BookingError, PaymentError } from '@/lib/errors/domain';
import { ErrorFallback } from '@/components/errors/ErrorFallback';
import { bookingSchema } from '@/lib/validation';

const formatLocalDate = (date: Date | string | undefined) => {
 if (!date) return '';
 const d = typeof date === 'string' ? new Date(date) : date;
 return d.toISOString().split('T')[0];
};

const formatLocalDateTime = (date: Date | string | undefined) => {
 if (!date) return '';
 const d = typeof date === 'string' ? new Date(date) : date;
 return d.toISOString();
};

interface TimeSlot {
 startTime: string;
 endTime: string;
 available: boolean;
}

interface Provider {
 id: string;
 name: string;
 avatar?: string;
 role: string;
 hourlyRate: number;
 currency: string;
 verified: boolean;
 service_location?: string;
 availability?: {
 days: string[];
 timeSlots: string[];
 };
}

const steps = [
 { number: 1, label: 'Date & Service' },
 { number: 2, label: 'Select Time' },
 { number: 3, label: 'Payment' }
];

export default function BookingPage() {
 const navigate = useNavigate();
 const params = useParams();
 const providerId = params.providerId as string;

 const [step, setStep] = useState(1);
 const [selectedDate, setSelectedDate] = useState<Date>();
 const [selectedSlot, setSelectedSlot] = useState<TimeSlot>();
 const [bookingType, setBookingType] = useState<'one-off' | 'package'>('one-off');
 const [visitType, setVisitType] = useState<'visit' | 'online'>('visit');
 const [onlineType, setOnlineType] = useState<'video' | 'audio' | 'chat'>('video');
 const [isPaying, setIsPaying] = useState(false);
 const [provider, setProvider] = useState<Provider | null>(null);
 const [loading, setLoading] = useState(true);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [bookingError, setBookingError] = useState<BookingError | null>(null);
 const [paymentError, setPaymentError] = useState<PaymentError | null>(null);

 const draftKey = `booking_draft_${providerId}`;

 const saveDraft = () => {
 if (!providerId) return;
 const draft = {
 step,
 selectedDate: selectedDate ? formatLocalDate(selectedDate) : undefined,
 selectedSlot,
 bookingType,
 visitType,
 onlineType,
 timestamp: Date.now()
 };
 localStorage.setItem(draftKey, JSON.stringify(draft));
 };

 const loadDraft = () => {
 if (!providerId) return;
 try {
 const saved = localStorage.getItem(draftKey);
 if (saved) {
 const draft = JSON.parse(saved);
 const age = Date.now() - (draft.timestamp || 0);
 if (age < 24 * 60 * 60 * 1000) {
 if (draft.step) setStep(draft.step);
 if (draft.selectedDate) setSelectedDate(new Date(draft.selectedDate));
 if (draft.selectedSlot) setSelectedSlot(draft.selectedSlot);
 if (draft.bookingType) setBookingType(draft.bookingType);
 if (draft.visitType) setVisitType(draft.visitType);
 if (draft.onlineType) setOnlineType(draft.onlineType);
 } else {
 localStorage.removeItem(draftKey);
 }
 }
 } catch {
 localStorage.removeItem(draftKey);
 }
 };

 const clearDraft = () => {
 localStorage.removeItem(draftKey);
 };

 // TODO: Refactor cascading setState into useReducer or batched update
 // TODO: Combine multiple setState calls
 useEffect(() => {
 const loadProvider = async () => {
 if (!providerId) return;
 try {
 const data = await getProviderDetails(providerId) as Provider;
 setProvider(data);
 if (data.service_location === 'remote') {
 setVisitType('online');
 } else {
 setVisitType('visit');
 }
 loadDraft();
 } catch (error) {
 console.error('Failed to load provider', error);
 toast.error('Provider not found');
 } finally {
 setLoading(false);
 }
 };
 loadProvider();
 }, [providerId]);

 useEffect(() => {
 if (!loading) {
 saveDraft();
 }
 }, [step, selectedDate, selectedSlot, bookingType, visitType, onlineType]);

 const handleDateSelect = (date: Date) => {
 setSelectedDate(date);
 setSelectedSlot(undefined);
 setStep(2);
 };

 const handleSlotSelect = (slot: TimeSlot) => {
 setSelectedSlot(slot);
 };

 const handleConfirmBooking = async () => {
 if (!selectedDate || !selectedSlot) {
 toast.error('Please select a date and time slot');
 return;
 }

 setIsSubmitting(true);

 const payload = {
 providerId: providerId,
 scheduledAt: formatLocalDateTime(selectedDate),
 startTime: selectedSlot.startTime,
 endTime: selectedSlot.endTime,
 bookingType: bookingType === 'package' ? 'recurring' : bookingType,
 serviceType: visitType,
 consultationMethod: visitType === 'online' ? onlineType : undefined,
 };

 const validation = bookingSchema.safeParse(payload);
 if (!validation.success) {
 const firstError = validation.error.issues[0];
 toast.error(firstError?.message || 'Please check your booking details');
 return;
 }

 setIsSubmitting(true);
 setBookingError(null);

 try {
 const bookingResponse = await createBooking(payload) as { success: boolean; booking: { id: string | number } };

 const bookingId = bookingResponse.booking?.id;

 if (!bookingId) {
 throw new Error('Failed to retrieve booking ID');
 }

 const hourlyRate = provider?.hourlyRate;
 if (!hourlyRate) {
 throw new Error('Provider rate not available');
 }
 setStep(3);
 } catch (error) {
 console.error(error);
 if (error instanceof BookingError) {
 setBookingError(error);
 } else if (isApiError(error)) {
 toast.error(error.message || 'Failed to process booking initialization');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to process booking initialization');
 }
 } finally {
 setIsSubmitting(false);
 }
 };

 const { user } = useAuth();

 const handlePayWithCredits = async () => {
 if (!provider || !selectedDate || !selectedSlot) return;

 setIsPaying(true);
 setPaymentError(null);
 try {
 const payload = {
 providerId: providerId,
 scheduledAt: selectedDate.toLocaleDateString('en-CA'),
 startTime: selectedSlot.startTime,
 endTime: selectedSlot.endTime,
 bookingType: bookingType === 'package' ? 'recurring' : bookingType,
 serviceType: visitType,
 consultationMethod: visitType === 'online' ? onlineType : undefined,
 notes: '',
 };

 const bookingResponse = await createBooking(payload) as { success: boolean; booking: { id: string | number } };
 const bookingId = bookingResponse.booking?.id;

 if (!bookingId) {
 throw new Error('Failed to retrieve booking ID');
 }

 const result = await payWithCredits(String(bookingId), provider.hourlyRate);

 if (result.success) {
 clearDraft();
 navigate('/careseeker/bookings');
 toast.success('Booking confirmed! Credits deducted from your wallet.');
 } else {
 throw new Error(result.message || 'Payment failed');
 }
 } catch (error) {
 if (error instanceof PaymentError) {
 setPaymentError(error);
 } else if (isApiError(error)) {
 toast.error(error.message || 'Failed to process payment');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to process payment');
 }
 } finally {
 setIsPaying(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-stone-50">
 <div className="size-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
 </div>
 );
 }

 if (!provider) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Provider not found</h2>
 <Button onClick={() => navigate(-1)}>Go Back</Button>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50/50 pb-12 selection:bg-teal-100 selection:text-teal-900">
 {/* Soft Header */}
 <header className="bg-white/80 backdrop-blur-md border-b ring-1 ring-stone-200/50 sticky top-0 z-50">
 <div className="max-w-7xl mx-auto p-4">
 <div className="flex items-center gap-4">
 <button
 onClick={() => navigate(-1)}
 className="size-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors text-stone-600"
 >
 <ArrowLeft className="size-5" />
 </button>
 <div>
 <h1 className="text-lg font-semibold text-stone-900 md:hidden">Booking</h1>
 <div className="hidden md:block text-sm font-medium text-stone-500">
 Booking Session with
 </div>
 </div>
 </div>
 </div>
 </header>

 <div className="max-w-5xl mx-auto px-4 py-8">

 {/* Provider Card Summary */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-[2.5rem] p-6 mb-8 ring-1 ring-stone-100/50 shadow-xl shadow-stone-200/50 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 size-64 bg-teal-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />

 <div className="relative flex flex-col md:flex-row items-center gap-6">
 <div className="relative">
 <div className="size-24 rounded-[2rem] bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-teal-200">
 {provider.avatar ? (
 <img width={100} height={100} src={provider.avatar} alt={provider.name} className="size-full object-cover rounded-[2rem]" loading="lazy" />
 ) : (
 provider.name.charAt(0)
 )}
 </div>
 {provider.verified && (
 <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-xl border-4 border-white " title="Verified">
 <Shield className="size-4" />
 </div>
 )}
 </div>

 <div className="text-center md:text-left flex-1">
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">{provider.name}</h1>
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-stone-600">
 <span className="bg-stone-100 px-3 py-1 rounded-full text-stone-700">{provider.role}</span>
 <span className="flex items-center gap-1 text-amber-500">
 <Star className="size-4 fill-current" />
 <span className="text-stone-900 font-bold">4.9</span>
 </span>
  <span className="text-stone-300">•</span>
  <span className="text-teal-600 font-bold text-lg">
    {provider.hourlyRate ? `${provider.currency} ${provider.hourlyRate}` : 'Rate not set'}
  </span>
  <span className="text-stone-400">{provider.hourlyRate ? '/hr' : ''}</span>
  </div>
 </div>

 {/* Progress Steps (Desktop) */}
 <div className="hidden md:flex items-center gap-2 bg-stone-50/80 p-2 rounded-2xl ring-1 ring-stone-100/50">
 {steps.map((s, i) => (
 <div key={s.number} className="flex items-center">
 <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-transform duration-300 ${step === s.number ? 'bg-white  text-teal-700 font-bold' : step > s.number ? 'text-teal-600 font-medium' : 'text-stone-400'}`}>
 <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.number ? 'bg-teal-100 text-teal-700' : 'bg-stone-200 text-stone-500'}`}>
 {step > s.number ? <CheckCircle className="size-4" /> : s.number}
 </div>
 <span>{s.label}</span>
 </div>
 {i < steps.length - 1 && (
 <div className="w-8 h-0.5 bg-stone-200 mx-2" />
 )}
 </div>
 ))}
 </div>
 </div>
 </m.div>

 <div className="max-w-3xl mx-auto">
 <AnimatePresence mode="wait">
 {/* Step 1: Date & Service */}
 {step === 1 && (
 <m.div
 key="step1"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-8"
 >
 <div className="bg-white rounded-[2rem] p-8 ring-1 ring-stone-100/50 shadow-lg shadow-stone-200/40">
 {/* Service Type */}
 {provider.service_location === 'both' && (
 <div className="mb-10">
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <Sparkles className="size-5 text-teal-500" />
 How would you like to meet?
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {[
 { id: 'visit', icon: Home, label: 'Home Visit', desc: 'Provider comes to you' },
 { id: 'online', icon: Video, label: 'Online Session', desc: 'Video, audio or chat' }
 ].map((type) => (
 <button
 key={type.id}
 onClick={() => setVisitType(type.id as 'online' | 'visit')}
 className={`group relative p-6 rounded-[2rem] border-2 text-left transition-transform duration-300 ${visitType === type.id ? 'border-teal-500 bg-teal-50/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] shadow-teal-100' : 'ring-1 ring-stone-100/50 bg-stone-50/50 hover:border-teal-200 hover:bg-white'}`}
 >
 <div className={`size-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${visitType === type.id ? 'bg-teal-500 text-white' : 'bg-white text-stone-400 group-hover:text-teal-500 '}`}>
 <type.icon className="size-6" />
 </div>
 <h3 className={`font-semibold text-lg mb-1 ${visitType === type.id ? 'text-teal-900' : 'text-stone-700'}`}>
 {type.label}
 </h3>
 <p className="text-sm text-stone-500">{type.desc}</p>

 {visitType === type.id && (
 <div className="absolute top-6 right-6 text-teal-500">
 <CheckCircle className="size-6 fill-teal-100" />
 </div>
 )}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Online Method */}
 {visitType === 'online' && (
 <div className="mb-10">
 <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-4">Consultation Method</h2>
 <div className="grid grid-cols-3 gap-3">
 {[
 { id: 'video', icon: Video, label: 'Video' },
 { id: 'audio', icon: Phone, label: 'Audio' },
 { id: 'chat', icon: MessageSquare, label: 'Chat' }
 ].map((method) => (
 <button
 key={method.id}
 onClick={() => setOnlineType(method.id as 'audio' | 'video' | 'chat')}
 className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-transform duration-300 ${onlineType === method.id ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-200' : 'bg-white text-stone-600 ring-1 ring-stone-200/50 hover:border-teal-300 hover:bg-teal-50'}`}
 >
 <method.icon className="size-5 mb-2" />
 <span className="font-bold text-sm">{method.label}</span>
 </button>
 ))}
 </div>
 </div>
 )}

 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <CalendarIcon className="size-5 text-blue-500" />
 Select Date
 </h2>
 <div className="bg-stone-50 p-4 rounded-[2rem]">
 <Calendar
 onDateSelect={handleDateSelect}
 selectedDate={selectedDate}
 availableDaysOfWeek={provider.availability?.days}
 />
 </div>
 </div>
 </m.div>
 )}

 {/* Step 2: Time Selection */}
 {step === 2 && selectedDate && (
 <m.div
 key="step2"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="bg-white rounded-[2rem] p-8 ring-1 ring-stone-100/50 shadow-lg shadow-stone-200/40"
 >
 <div className="flex items-center justify-between mb-8">
 <h2 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
 <Clock className="size-5 text-amber-500" /> Select Time
 </h2>
 <div className="text-sm font-bold bg-stone-100 text-stone-600 px-4 py-2 rounded-full">
 {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
 </div>
 </div>

  <TimeSlotSelector
  providerId={providerId}
  selectedDate={selectedDate}
  onSlotSelect={handleSlotSelect}
  selectedSlot={selectedSlot}
  availableTimeSlots={provider.availability?.timeSlots}
  availableDays={provider.availability?.days}
  />

 {bookingError && (
 <div className="mt-6">
 <ErrorFallback
 error={bookingError}
 onRetry={handleConfirmBooking}
 onDismiss={() => setBookingError(null)}
 />
 </div>
 )}

 <div className="mt-12 flex gap-4">
 <button
 onClick={() => setStep(1)}
 className="px-6 py-4 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
 >
 Back
 </button>
 <button
 onClick={handleConfirmBooking}
 disabled={!selectedSlot || isSubmitting}
 className="flex-1 bg-stone-900 text-white rounded-xl font-bold py-4 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-300 shadow-lg hover:shadow-stone-300 flex items-center justify-center gap-2"
 >
 {isSubmitting ? (
 <>
 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Processing…
 </>
 ) : (
 <>
 Continue to Payment
 <ChevronRight className="size-4" />
 </>
 )}
 </button>
 </div>
 </m.div>
 )}

 {/* Step 3: Payment */}
 {step === 3 && (
 <m.div
 key="step3"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="space-y-6"
 >
 {/* Header Summary */}
 <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
 <div className="absolute top-0 right-0 size-64 bg-teal-500 opacity-10 rounded-full blur-[80px]" />

 <div className="relative z-10">
 <h2 className="text-lg font-medium text-stone-300 mb-1">Total to Pay</h2>
 <div className="text-4xl font-bold mb-8">
 {provider.hourlyRate} credits (<CurrencyDisplay amount={provider.hourlyRate} currency="USD" showSymbol={true} unit="major" />)
 </div>

 <div className="space-y-4">
 <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
 <div className="size-10 rounded-full bg-stone-800 flex items-center justify-center">
 <CalendarIcon className="size-5 text-teal-400" />
 </div>
 <div>
 <div className="text-xs text-stone-400 uppercase font-bold tracking-wider">Date</div>
 <div className="font-medium">{selectedDate?.toLocaleDateString()}</div>
 </div>
 </div>

 <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
 <div className="size-10 rounded-full bg-stone-800 flex items-center justify-center">
 <Clock className="size-5 text-amber-400" />
 </div>
 <div>
 <div className="text-xs text-stone-400 uppercase font-bold tracking-wider">Time</div>
 <div className="font-medium">{selectedSlot?.startTime} - {selectedSlot?.endTime}</div>
 </div>
 </div>

 <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
 <div className="size-10 rounded-full bg-stone-800 flex items-center justify-center">
 {visitType === 'online' ? <Video className="size-5 text-purple-400" /> : <Home className="size-5 text-blue-400" />}
 </div>
 <div>
 <div className="text-xs text-stone-400 uppercase font-bold tracking-wider">Type</div>
 <div className="font-medium capitalize">
 {visitType === 'online' ? `Online (${onlineType})` : 'Home Visit'}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-[2rem] p-8 ring-1 ring-stone-100/50 shadow-lg">
 <div className="flex items-center gap-3 mb-6">
 <CreditCard className="size-5 text-teal-600" />
 <h3 className="font-semibold text-stone-900">Pay with Credits</h3>
 </div>

 <div className="space-y-4">
 <p className="text-stone-600 text-sm">
 Your wallet will be charged <strong>{provider.hourlyRate} credits</strong> for this booking.
 The amount will be held in escrow until the session is completed.
 </p>

 <Button
 onClick={handlePayWithCredits}
 disabled={isPaying}
 className="w-full py-4 text-lg font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-transform duration-300"
 >
 {isPaying ? (
 <span className="flex items-center justify-center gap-2">
 <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Processing&hellip;
 </span>
 ) : (
 `Pay ${provider.hourlyRate} Credits`
 )}
 </Button>

 {paymentError && (
 <div className="mt-2">
 <ErrorFallback
 error={paymentError}
 onRetry={handlePayWithCredits}
 onDismiss={() => setPaymentError(null)}
 />
 </div>
 )}

 {user?.credit_balance?.available_credits !== undefined && (
 <p className="text-xs text-stone-400 text-center">
 Available balance: {user.credit_balance.available_credits} credits
 {user.credit_balance.available_credits < provider.hourlyRate && (
 <span className="text-red-500 block mt-1">
 Insufficient credits. <Link to="/careseeker/wallet" className="underline">Top up your wallet</Link>
 </span>
 )}
 </p>
 )}
 </div>

 <button
 onClick={() => setStep(2)}
 className="w-full mt-6 text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
 >
 Change Details
 </button>
 </div>

 <div className="flex items-center justify-center gap-2 text-xs text-stone-400 font-medium">
 <Shield className="size-3" />
 Credits are held securely in escrow until session completion
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </div>
 );
}
