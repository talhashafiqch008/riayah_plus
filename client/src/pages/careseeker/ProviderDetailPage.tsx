
;
import { useState, useEffect , useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProviderDetails, submitReview } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
 ArrowLeft, Star, MapPin, Shield, Clock, MessageSquare,
 X, CheckCircle, GraduationCap, Globe, Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { isApiError } from '@/lib/errors';




interface Review {
 id: number;
 rating: number;
 comment: string;
 createdAt: string;
 user: {
 id: number;
 name: string;
 };
}

interface Provider {
 id: string;
 user_id?: string;
 name: string;
 avatar?: string;
 role: string;
 rating: number;
 reviewCount: number;
 hourlyRate: number;
 currency: string;
 verified: boolean;
 service_location?: string;
 location?: string;
 experience?: number;
 bio?: string;
 specialties?: string[];
 has_history?: boolean;
 reviews?: Review[];
}

export default function ProviderProfilePage() {
 const params = useParams();
 const navigate = useNavigate();
 const providerId = params.id as string;
 const [provider, setProvider] = useState<Provider | null>(null);
 const [loading, setLoading] = useState(true);

 // Review State
 const [showReviewModal, setShowReviewModal] = useState(false);
 const [reviewRating, setReviewRating] = useState(5);
 const [reviewComment, setReviewComment] = useState('');
 const [submittingReview, setSubmittingReview] = useState(false);

 useEffect(() => {
 const loadProvider = async () => {
 if (!providerId) return;
 try {
 // Fetch provider details
 const data = await getProviderDetails(providerId) as {
 id?: string | number;
 user_id?: string | number;
 userId?: string | number;
 name?: string;
 avatar?: string;
 role?: string;
 license_type?: string;
 averageRating?: number;
 average_rating?: number;
 rating?: number;
 ratingCount?: number;
 rating_count?: number;
 reviewCount?: number;
 hourlyRate?: number;
 hourly_rate?: number;
 currency?: string;
 verified?: boolean;
 service_location?: string;
 location?: string;
 country?: string;
 experience?: number;
 years_experience?: number;
 bio?: string;
 specialties?: string[];
 has_history?: boolean | number;
 hasHistory?: boolean;
 reviews?: unknown[];
 };

 const profileData: Provider = {
 id: String(data.id || providerId),
 user_id: String(data.user_id || data.userId),
 name: data.name || 'Provider',
 avatar: data.avatar,
 role: data.role || data.license_type || 'Care Provider',
 rating: data.averageRating || data.average_rating || data.rating || 5.0,
 reviewCount: data.ratingCount || data.rating_count || data.reviewCount || 0,
 hourlyRate: data.hourlyRate || data.hourly_rate || 0,
 currency: data.currency || 'SAR',
 verified: data.verified !== false,
 service_location: data.service_location,
 location: data.location || data.service_location || (data.country === 'EGY' ? 'Cairo' : 'Doha'),
 experience: data.experience || data.years_experience,
 bio: data.bio,
 specialties: data.specialties || [],
 has_history: data.has_history === 1 || data.has_history === true || data.hasHistory === true,
 reviews: (data.reviews as Review[]) || []
 };

 setProvider(profileData);
 } catch (error) {
 console.error('Failed to load provider', error);
 } finally {
 setLoading(false);
 }
 };
 loadProvider();
 }, [providerId]);

 const handleSubmitReview = async () => {
 if (!reviewComment.trim()) {
 toast.error('Please write a comment');
 return;
 }

 setSubmittingReview(true);
 try {
 await submitReview({
 provider_id: providerId,
 rating: reviewRating,
 comment: reviewComment
 });
 toast.success('Review submitted successfully!');
 setShowReviewModal(false);
 setReviewComment('');
 setReviewRating(5);
 } catch (error) {
 console.error('Failed to submit review', error);
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to submit review');
 } else if (error instanceof Error) {
 toast.error(error.message);
 } else {
 toast.error('Failed to submit review');
 }
 } finally {
 setSubmittingReview(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-stone-50">
 <div className="animate-spin rounded-full size-8 border-b-2 border-teal-600"></div>
 </div>
 );
 }

 if (!provider) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50">
 <h2 className="text-xl font-semibold text-stone-900">Provider Not Found</h2>
 <Button onClick={() => navigate(-1)}>Go Back</Button>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-stone-50/50">
 {/* Header / Nav */}
 <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b ring-1 ring-stone-200/50/60 px-6 py-4">
 <div className="max-w-7xl mx-auto flex items-center justify-between">
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors p-2 hover:bg-stone-100 rounded-full"
 >
 <ArrowLeft className="size-5" />
 <span className="font-medium hidden sm:inline">Back</span>
 </button>
 <span className="font-bold text-stone-900">Provider Profile</span>
 <div className="w-20"></div> {/* Spacer for center alignment */}
 </div>
 </div>

 <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

 {/* Left Column: Sticky Profile Card */}
 <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white rounded-[2rem] p-6 shadow-xl shadow-stone-200/60 border border-white/50 relative overflow-hidden"
 >
 {/* Decorative Top */}
 <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-teal-50 to-blue-50"></div>

 <div className="relative flex flex-col items-center">
 <m.div
 whileHover={{ scale: 1.05 }}
 className="size-32 sm:w-40 sm:h-40 rounded-[2rem] bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-5xl font-bold shadow-lg shadow-teal-200/50 relative z-10 mb-4"
 >
 {provider.avatar ? (
 <img width={100} height={100} src={provider.avatar} alt={provider.name} className="size-full object-cover rounded-[2rem]" loading="lazy" />
 ) : (
 provider.name[0]
 )}
 {provider.verified && (
 <div className="absolute -bottom-3 -right-3 size-10 bg-blue-500 rounded-2xl flex items-center justify-center border-4 border-white " title="Verified Provider">
 <Shield className="size-5 text-white fill-current" />
 </div>
 )}
 </m.div>

 <h1 className="text-2xl font-semibold text-stone-900 text-center mb-1">{provider.name}</h1>
 <p className="text-teal-600 font-medium text-center mb-4 bg-teal-50 px-3 py-1 rounded-full text-sm">
 {provider.role}
 </p>

 <div className="flex items-center gap-2 mb-6 text-stone-600">
 <MapPin className="size-4" />
 <span className="text-sm">{provider.location}</span>
 </div>

 <div className="grid grid-cols-2 gap-4 w-full mb-6">
 <div className="bg-stone-50 rounded-2xl p-4 text-center ring-1 ring-stone-100/50">
 <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xl mb-1">
 <Star className="size-5 fill-current" />
 {provider.rating.toFixed(1)}
 </div>
 <p className="text-xs text-stone-400 uppercase tracking-wide font-bold">Rating</p>
 </div>
 <div className="bg-stone-50 rounded-2xl p-4 text-center ring-1 ring-stone-100/50">
 <div className="flex items-center justify-center gap-1 text-stone-800 font-bold text-xl mb-1">
 {provider.experience || 5}<span className="text-sm text-stone-400">+</span>
 </div>
 <p className="text-xs text-stone-400 uppercase tracking-wide font-bold">Years Exp.</p>
 </div>
 </div>

 <div className="w-full pt-6 border-t ring-1 ring-stone-100/50">
 <div className="flex items-end justify-between mb-6 px-2">
 <div>
 <p className="text-xs text-stone-400 font-bold uppercase">Rate</p>
 <p className="text-sm text-stone-500">per hour</p>
 </div>
 <div className="text-3xl font-bold text-stone-900">
 <span className="text-lg text-stone-400 font-normal mr-1">{provider.currency}</span>
 {provider.hourlyRate}
 </div>
 </div>

 <div className="space-y-3">
 <Link to={`/careseeker/booking/${provider.id}`} className="block">
 <Button size="lg" className="w-full bg-stone-900 hover:bg-stone-800 text-white shadow-xl shadow-stone-900/10 rounded-xl h-12 text-base">
 Book Now
 </Button>
 </Link>
 {provider.user_id ? (
 <Link to={`/careseeker/messages?provider=${provider.user_id}`} className="block">
 <Button variant="outline" size="lg" className="w-full rounded-xl h-12 text-base ring-1 ring-stone-200/50 hover:bg-stone-50 text-stone-600">
 <MessageSquare className="size-4 mr-2" />
 Message
 </Button>
 </Link>
 ) : (
 <Button variant="outline" size="lg" className="w-full rounded-xl h-12 text-base ring-1 ring-stone-200/50 text-stone-400" disabled>
 <MessageSquare className="size-4 mr-2" />
 Message Unavailable
 </Button>
 )}
 </div>

 {provider.has_history && (
 <m.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => setShowReviewModal(true)}
 className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 font-bold text-sm border border-amber-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-transform duration-300"
 >
 <Star className="size-4 fill-amber-500 text-amber-500" />
 Review this Provider
 </m.button>
 )}
 </div>
 </div>
 </m.div>
 </div>

 {/* Right Column: Detailed Info */}
 <div className="lg:col-span-8 space-y-6">

 {/* Stats Banner */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {[
 { icon: CheckCircle, label: 'Identity Verified', sub: 'Background Check', color: 'text-blue-500', bg: 'bg-blue-50' },
 { icon: GraduationCap, label: 'Certified', sub: 'Professional License', color: 'text-purple-500', bg: 'bg-purple-50' },
 { icon: Globe, label: 'Remote Capable', sub: 'Video Consults', color: 'text-teal-500', bg: 'bg-teal-50' }
 ].map((stat, i) => (
 <m.div
 key={stat.label}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 ring-1 ring-stone-100/50 flex items-center gap-3 "
 >
 <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
 <stat.icon className="size-5" />
 </div>
 <div>
 <p className="font-bold text-stone-900 text-sm">{stat.label}</p>
 <p className="text-xs text-stone-500">{stat.sub}</p>
 </div>
 </m.div>
 ))}
 </div>

 {/* About Section */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 className="bg-white rounded-[2rem] p-8  ring-1 ring-stone-100/50"
 >
 <h2 className="text-xl font-semibold text-stone-900 mb-4 flex items-center gap-2">
 <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
 About
 </h2>
 <p className="text-stone-600 leading-8 text-lg">
 {provider.bio || `Experienced ${provider.role} dedicated to providing high-quality care services. Background in patient support and specialized treatments. Compassionate and detail-oriented professional with a focus on patient well-being and comfort. Committed to continuous learning and applying best practices in care delivery.`}
 </p>
 </m.div>

 {/* Specialties Section */}
 {provider.specialties && provider.specialties.length > 0 && (
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="bg-white rounded-[2rem] p-8  ring-1 ring-stone-100/50"
 >
 <h2 className="text-xl font-semibold text-stone-900 mb-6 flex items-center gap-2">
 <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
 Specialties & Skills
 </h2>
 <div className="flex flex-wrap gap-3">
 {provider.specialties.map((s, n) => (
 <div key={s} className="group">
 <div className="px-5 py-3 bg-stone-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 ring-1 ring-stone-200/50 text-teal-900 rounded-2xl font-bold text-sm transition-transform duration-300 cursor-default">
 {s}
 </div>
 </div>
 ))}
 </div>
 </m.div>
 )}

 {/* Reviews Preview (Placeholder) */}
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-[2rem] p-8 text-white relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 size-64 bg-teal-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

 <div className="relative z-10 flex items-center justify-between mb-6">
 <div>
 <h2 className="text-xl font-semibold mb-1">Client Reviews</h2>
 <p className="text-stone-400 text-sm">
 {provider.reviewCount > 0
 ? `${provider.reviewCount} ${provider.reviewCount === 1 ? 'review' : 'reviews'}`
 : 'No reviews yet'}
 </p>
 </div>
 <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
 <Star className="size-5 text-amber-400 fill-current" />
 <span className="font-bold">{provider.rating.toFixed(1)}</span>
 </div>
 </div>

 {provider.reviews && provider.reviews.length > 0 ? (
 <div className="space-y-4">
 {provider.reviews.map((review) => (
 <div key={review.id} className="bg-white/5 rounded-2xl p-6 border border-white/5">
 <div className="flex items-center gap-1 mb-3">
 {[1, 2, 3, 4, 5].map(i => (
 <Star
 key={`star-${i}`}
 className={`size-4 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-600 fill-stone-600'}`}
 />
 ))}
 </div>
 <p className="text-stone-200 mb-4 leading-relaxed">{review.comment}</p>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-300 font-bold text-xs">
 {review.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
 </div>
 <span className="text-sm text-stone-400">{review.user.name} • verified client</span>
 </div>
 <span className="text-xs text-stone-500">
 {new Date(review.createdAt).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric'
 })}
 </span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="bg-white/5 rounded-2xl p-8 border border-white/5 text-center">
 <div className="size-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
 <Star className="size-8 text-stone-500" />
 </div>
 <p className="text-stone-400">No reviews yet. Be the first to review this provider!</p>
 </div>
 )}
 </m.div>

 </div>
 </div>
 </main>

 {/* Review Modal */}
 <AnimatePresence>
 {showReviewModal && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
 onClick={() => setShowReviewModal(false)}
 >
 <m.div
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 onClick={e => e.stopPropagation()}
 className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl overflow-hidden relative"
 >
 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>

 <div className="flex items-center justify-between mb-8">
 <div>
 <h3 className="text-2xl font-semibold text-stone-900">Write a Review</h3>
 <p className="text-stone-500 text-sm">How was your experience?</p>
 </div>
 <button
 onClick={() => setShowReviewModal(false)}
 className="p-2 hover:bg-stone-100 rounded-full transition-colors"
 >
 <X className="size-6 text-stone-400" />
 </button>
 </div>

 <div className="space-y-6">
 {/* Rating */}
 <div className="flex justify-center gap-3 py-4">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 onMouseEnter={() => setReviewRating(star)}
 onClick={() => setReviewRating(star)}
 className="transition-transform hover:scale-110 focus:outline-none group"
 >
 <Star
 className={`size-10 transition-colors ${star <= reviewRating ? 'text-amber-400 fill-amber-400 drop-' : 'text-stone-200 fill-stone-200 group-hover:text-amber-200' }`}
 />
 </button>
 ))}
 </div>

 {/* Comment */}
 <div>
 <label htmlFor="your-feedback" className="block text-sm font-bold text-stone-700 mb-2">Your Feedback</label>
 <textarea id="your-feedback"
 className="w-full p-4 bg-stone-50 ring-1 ring-stone-200/50 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 focus:outline-none resize-none h-32 text-stone-700 transition-transform duration-300 placeholder:text-stone-400"
 placeholder="Share your experience with this provider…"
 value={reviewComment}
 onChange={(e) => setReviewComment(e.target.value)}
 ></textarea>
 </div>

 <Button
 className="w-full h-14 text-lg rounded-xl bg-stone-900 hover:bg-stone-800 shadow-xl shadow-stone-900/10 font-bold"
 onClick={handleSubmitReview}
 disabled={submittingReview}
 >
 {submittingReview ? (
 <span className="flex items-center gap-2">
 <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
 Submitting…
 </span>
 ) : (
 'Submit Review'
 )}
 </Button>
 </div>
 </m.div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 );
}
