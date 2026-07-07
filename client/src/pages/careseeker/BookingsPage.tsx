/**
 * My Bookings - Premium Elevated Design
 * Summary stats, smart grouping, countdown timer, calendar view
 */


import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle,
  Video, Phone, ArrowRight, MessageSquare, Star, ChevronRight,
  LayoutList, CalendarDays, TrendingUp, Ban, CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBookings } from '@/lib/api';
import { submitReview } from '@/lib/api/reviews';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";

interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  scheduledAt: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'pending_payment';
  bookingType: 'one-off' | 'package';
  sessionType: 'in-person' | 'video' | 'phone';
  location?: string;
  price: number;
  meetingLink?: string;
  rating?: number;
}

// --- Countdown Hook ---
function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const calculate = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft('Now');
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return setTimeLeft(`${days}d ${hours % 24}h`);
      }
      return setTimeLeft(`${hours}h ${mins}m`);
    };
    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);
  
  return timeLeft;
}

// --- Date Grouping Helper ---
function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  if (diffDays <= 7) return 'This Week';
  return 'Later';
}

// --- Skeleton Component ---
function BookingSkeleton() {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-6 ring-1 ring-stone-100/50 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="size-12 bg-stone-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 rounded w-1/3" />
          <div className="h-3 bg-stone-200 rounded w-1/4" />
        </div>
        <div className="h-6 bg-stone-200 rounded-full w-20" />
      </div>
    </div>
  );
}

// --- Calendar Mini View ---
function CalendarMiniView({ bookings }: { bookings: Booking[] }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  const bookingDates = new Set(
    bookings.map(b => new Date(b.scheduledAt).toDateString())
  );
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-5 ring-1 ring-stone-100/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-800 text-sm">{monthNames[currentMonth]} {currentYear}</h3>
        <div className="flex gap-1">
          <button 
            onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
              else setCurrentMonth(m => m - 1);
            }}
            className="p-1 hover:bg-stone-100 rounded transition-colors"
          >
            <ChevronRight className="size-4 rotate-180 text-stone-400" />
          </button>
          <button 
            onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
              else setCurrentMonth(m => m + 1);
            }}
            className="p-1 hover:bg-stone-100 rounded transition-colors"
          >
            <ChevronRight className="size-4 text-stone-400" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={`day-header-${i}`} className="text-[10px] font-bold text-stone-400 py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(currentYear, currentMonth, i + 1);
          const isToday = date.toDateString() === today.toDateString();
          const hasBooking = bookingDates.has(date.toDateString());
          return (
            <div 
              key={i} 
              className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors relative
                ${isToday ? 'bg-teal-500 text-white font-bold' : 'text-stone-600 hover:bg-stone-50'}
              `}
            >
              {i + 1}
              {hasBooking && !isToday && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 bg-teal-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled' | 'pending_payment'>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const currency = user?.country === 'EGY' ? 'EGP' : 'QAR';

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await getBookings();
        let bookingsList = Array.isArray(response.bookings) ? response.bookings : (Array.isArray(response) ? response : []);
        if (!bookingsList || bookingsList.length === 0) bookingsList = [];
        
        const mapped: Booking[] = bookingsList.map((b: Record<string, unknown>) => {
          const provider = b.provider as Record<string, unknown> | undefined;
          let sessionType: Booking['sessionType'] = 'in-person';
          if (b.serviceType === 'online') {
            if (b.consultationMethod === 'video') sessionType = 'video';
            else if (b.consultationMethod === 'audio') sessionType = 'phone';
          }
          return {
            id: String(b.id),
            providerId: String(provider?.id || b.providerId || b.id),
            providerName: String(provider?.name || b.providerName || 'Provider'),
            providerAvatar: provider?.avatar as string | undefined,
            scheduledAt: String(b.scheduledAt || b.date || new Date().toISOString()),
            startTime: String(b.startTime || '09:00'),
            endTime: String(b.endTime || '10:00'),
            status: (b.status as Booking['status']) || 'pending',
            bookingType: (b.bookingType as Booking['bookingType']) || 'one-off',
            sessionType,
            location: b.location as string | undefined,
            price: Number(b.price || b.totalPrice || 0),
            meetingLink: b.meetingLink as string | undefined,
            rating: provider?.average_rating as number | undefined,
          };
        });
        
        setBookings(mapped);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        toast.error(isApiError(error) ? error.message : 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleOpenReview = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setReviewRating(0);
    setReviewComment('');
    setShowReviewModal(true);
  }, []);

  const handleSubmitReview = async () => {
    if (!selectedBooking || reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      await submitReview({
        booking_id: selectedBooking.id,
        provider_id: selectedBooking.providerId,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Review submitted!');
      setShowReviewModal(false);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Stats
  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(b => ['pending', 'confirmed', 'pending_payment'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  // Filtering
  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['pending', 'confirmed', 'pending_payment'].includes(b.status);
    return b.status === filter;
  });

  // Sort: upcoming first by date, then completed
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const aUpcoming = ['pending', 'confirmed', 'pending_payment'].includes(a.status);
    const bUpcoming = ['pending', 'confirmed', 'pending_payment'].includes(b.status);
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  // Group by date
  const groupedBookings = sortedBookings.reduce((groups, booking) => {
    const group = getDateGroup(booking.scheduledAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(booking);
    return groups;
  }, {} as Record<string, Booking[]>);

  const groupOrder = ['Today', 'Tomorrow', 'This Week', 'Later'];
  const nextSession = sortedBookings.find(b => ['pending', 'confirmed', 'pending_payment'].includes(b.status));
  const nextSessionCountdown = useCountdown(nextSession?.scheduledAt || new Date().toISOString());

  if (loading) {
    return (
      <div className="min-h-0 bg-transparent space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white/90 backdrop-blur-xl rounded-[var(--radius-xl)] p-5 ring-1 ring-stone-100/50 animate-pulse">
              <div className="h-3 bg-stone-200 rounded w-20 mb-3" />
              <div className="h-8 bg-stone-200 rounded w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => <BookingSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-transparent">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Total', value: stats.total, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
              { label: 'Upcoming', value: stats.upcoming, icon: Clock, color: 'bg-teal-50 text-teal-600' },
              { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Cancelled', value: stats.cancelled, icon: Ban, color: 'bg-red-50 text-red-600' },
            ].map((stat, i) => (
              <m.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[var(--radius-xl)] p-5 ring-1 ring-stone-100/60 shadow-sm shadow-stone-100/50 flex flex-col justify-between group hover:shadow-md hover:shadow-stone-200/40 hover:ring-stone-200/60 transition-all duration-300"
              >
                <div className={`size-11 rounded-[var(--radius-lg)] ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="size-5" strokeWidth={2} />
                </div>
                <div className="text-3xl font-bold text-stone-900 tracking-tight">{stat.value}</div>
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </m.div>
            ))}
          </div>

          {/* Hero: Next Session */}
          {nextSession && (
            <m.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-stone-900 text-white p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
            >
              <div className="absolute top-0 right-0 size-[300px] bg-gradient-to-br from-teal-500 to-blue-600 blur-[80px] rounded-full opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
                    <Clock className="size-3.5" />
                    Up Next · {nextSessionCountdown}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div className="flex items-start gap-4">
                    {nextSession.providerAvatar ? (
                      <img src={nextSession.providerAvatar} alt={`${nextSession.providerName} avatar`} className="size-14 rounded-xl object-cover ring-2 ring-white/20" />
                    ) : (
                      <div className="size-14 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-bold ring-2 ring-white/20">
                        {nextSession.providerName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl md:text-3xl font-semibold mb-1">{nextSession.providerName}</h2>
                      <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                        {nextSession.sessionType === 'video' ? <Video className="size-4" /> : <MapPin className="size-4" />}
                        {nextSession.location || (nextSession.sessionType === 'video' ? 'Video Call' : 'Home Visit')}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-teal-400 font-medium">
                        <span className="flex items-center gap-1"><Clock className="size-3.5" />{nextSession.startTime}</span>
                        <span className="text-white/30">|</span>
                        <span>{new Date(nextSession.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {nextSession.status === 'pending_payment' ? (
                      <Link to={`/careseeker/payment/checkout/${nextSession.id}`} className="px-5 py-3 bg-white text-teal-900 font-bold rounded-[var(--radius-lg)] hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 text-sm">
                        <CreditCard className="size-4" />
                        Pay {currency} {nextSession.price}
                      </Link>
                    ) : (
                      <>
                        <Link to={`/careseeker/messages/?provider=${nextSession.providerId}`} className="px-5 py-3 bg-white/10 backdrop-blur-sm border border-white/10 text-white font-bold rounded-[var(--radius-lg)] hover:bg-white/20 transition-colors flex items-center justify-center gap-2 text-sm">
                          <MessageSquare className="size-4" />
                          Message
                        </Link>
                        {nextSession.sessionType === 'video' && nextSession.meetingLink && (
                          <Link to={nextSession.meetingLink} target="_blank" className="px-5 py-3 bg-teal-500 text-white font-bold rounded-[var(--radius-lg)] hover:bg-teal-400 transition-colors flex items-center justify-center gap-2 text-sm">
                            <Video className="size-4" />
                            Join Call
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </m.section>
          )}

          {/* Filter Chips */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {([
              { key: 'all', label: 'All', count: stats.total },
              { key: 'upcoming', label: 'Upcoming', count: stats.upcoming },
              { key: 'completed', label: 'Completed', count: stats.completed },
              { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
              { key: 'pending_payment', label: 'Unpaid', count: bookings.filter(b => b.status === 'pending_payment').length },
            ] as const).map(chip => (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all duration-300 ${
                  filter === chip.key
                    ? 'bg-stone-900 text-white shadow-md shadow-stone-300/30'
                    : 'bg-white text-stone-600 hover:bg-stone-50 shadow-sm shadow-stone-100/50 ring-1 ring-stone-200/60'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold ${filter === chip.key ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-500'}`}>
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Bookings List */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {sortedBookings.length === 0 ? (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 bg-white rounded-[var(--radius-2xl)] shadow-sm shadow-stone-100/50 ring-1 ring-stone-100/60 flex flex-col items-center justify-center text-center px-6"
                >
                  <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <Calendar className="size-10 text-stone-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-semibold text-stone-800 mb-2 tracking-tight">No bookings found</h3>
                  <p className="text-stone-500 text-sm mb-6 max-w-sm">{filter === 'all' ? 'Book a session with a provider to get started.' : `No ${filter} bookings in this view.`}</p>
                  <Link to="/careseeker/providers">
                    <span className="px-8 py-3 bg-stone-900 text-white text-sm font-bold rounded-[var(--radius-lg)] hover:bg-stone-800 transition-colors inline-flex items-center gap-2 shadow-lg shadow-stone-200/50">
                      <ArrowRight className="size-4" />
                      Find Providers
                    </span>
                  </Link>
                </m.div>
              ) : (
                groupOrder.map(group => {
                  const groupBookings = groupedBookings[group];
                  if (!groupBookings || groupBookings.length === 0) return null;
                  return (
                    <div key={group}>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400 mb-3 px-1">{group}</h3>
                      <div className="space-y-3">
                        {groupBookings.map((booking, idx) => (
                          <BookingRow
                            key={booking.id}
                            booking={booking}
                            idx={idx}
                            currency={currency}
                            onReview={handleOpenReview}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* View Toggle */}
          <div className="bg-white rounded-[var(--radius-xl)] p-2 shadow-sm shadow-stone-100/50 ring-1 ring-stone-100/60 flex gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                viewMode === 'list' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <LayoutList className="size-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                viewMode === 'calendar' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <CalendarDays className="size-4" />
              Calendar
            </button>
          </div>

          {/* Calendar Mini View */}
          <CalendarMiniView bookings={bookings} />

          {/* Quick Actions */}
          <div className="bg-white rounded-[var(--radius-xl)] p-5 shadow-sm shadow-stone-100/50 ring-1 ring-stone-100/60">
            <h3 className="font-semibold text-stone-800 mb-4 text-sm tracking-tight">Quick Actions</h3>
            <div className="space-y-1">
              <Link to="/careseeker/providers" className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-all duration-300 group">
                <div className="size-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <ArrowRight className="size-5" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-semibold text-stone-800 text-sm">Book New Session</div>
                  <div className="text-[12px] text-stone-500 font-medium">Find a care provider</div>
                </div>
              </Link>
              <Link to="/careseeker/messages" className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-all duration-300 group">
                <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <MessageSquare className="size-5" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-semibold text-stone-800 text-sm">Message Provider</div>
                  <div className="text-[12px] text-stone-500 font-medium">Check your conversations</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedBooking && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/95 backdrop-blur-xl rounded-[var(--radius-2xl)] max-w-lg w-full p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-2">Rate Your Experience</h2>
              <p className="text-stone-500 mb-6">How was your session with {selectedBooking.providerName}?</p>
              
              <div className="flex gap-2 justify-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setReviewRating(star)}
                    className="p-2 transition-transform hover:scale-125"
                  >
                    <Star
                      className={`size-10 transition-colors ${
                        star <= (hoveredStar || reviewRating) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience (optional)"
                className="w-full px-4 py-3 bg-stone-50 rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px] resize-none mb-4 text-sm"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-3 rounded-[var(--radius-lg)] text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || submittingReview}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-[var(--radius-lg)] text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Booking Row Component ---
function BookingRow({ booking, idx, currency, onReview }: { booking: Booking; idx: number; currency: string; onReview?: (b: Booking) => void }) {
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isPendingPayment = booking.status === 'pending_payment';
  
  const statusConfig = {
    confirmed: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
    pending: { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
    pending_payment: { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', icon: CreditCard },
    completed: { border: 'border-l-stone-300', bg: 'bg-stone-100', text: 'text-stone-600', icon: CheckCircle },
    cancelled: { border: 'border-l-red-400', bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
  };
  
  const config = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: idx * 0.05 }}
      className={`group bg-white rounded-[var(--radius-xl)] p-5 shadow-sm shadow-stone-100/50 ring-1 ring-stone-100/60 hover:shadow-md hover:shadow-stone-200/30 hover:ring-stone-200/60 transition-all duration-300 border-l-[3px] ${config.border}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Provider Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {booking.providerAvatar ? (
            <img src={booking.providerAvatar} alt={`${booking.providerName} avatar`} className="size-12 rounded-xl object-cover ring-1 ring-stone-200/50 flex-shrink-0 shadow-sm" />
          ) : (
            <div className={`size-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-sm ${config.bg} ${config.text}`}>
              {booking.providerName.charAt(0)}
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-[15px] truncate ${isCancelled ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                {booking.providerName}
              </h3>
              {booking.rating && (
                <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                  <Star className="size-3 fill-amber-400" />
                  <span className="text-[11px] font-bold">{booking.rating}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-[12px] text-stone-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {new Date(booking.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {booking.startTime}
              </span>
              <span className="flex items-center gap-1">
                {booking.sessionType === 'video' ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                <span className="capitalize">{booking.sessionType}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2.5 sm:justify-end">
          <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 tracking-wide ${config.bg} ${config.text}`}>
            <StatusIcon className="size-3.5" strokeWidth={2.5} />
            {booking.status === 'pending_payment' ? 'Unpaid' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </div>
          
          {isCompleted && onReview && (
            <button
              onClick={() => onReview(booking)}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors flex items-center gap-1 border border-amber-200/50"
            >
              <Star className="size-3.5 fill-amber-400" />
              Rate
            </button>
          )}
          
          {isPendingPayment && (
            <Link to={`/careseeker/payment/checkout/${booking.id}`} className="px-3 py-1.5 bg-orange-500 text-white rounded-full text-[11px] font-bold hover:bg-orange-600 transition-colors shadow-sm">
              Pay Now
            </Link>
          )}
        </div>
      </div>
    </m.div>
  );
}
