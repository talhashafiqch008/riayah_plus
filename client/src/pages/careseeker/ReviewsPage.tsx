
;
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
 ArrowLeft, Star, MessageSquare, ThumbsUp, Clock,
 Search, Calendar, CheckCircle,
 AlertCircle, Send, X, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMyReviews, submitReview } from '@/lib/api/reviews';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';


function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
 const sizeClasses = {
 sm: 'size-3',
 md: 'size-4',
 lg: 'size-5'
 };

 return (
 <div className="flex gap-0.5">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`${sizeClasses[size]} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300' }`}
 />
 ))}
 </div>
 );
}

interface Review {
 id: string;
 provider_name: string;
 provider_avatar: string | null;
 provider_role: string;
 rating: number;
 comment: string;
 created_at: string;
 session_date: string;
 service_type: string;
 helpful?: number;
 response?: {
 text: string;
 created_at: string;
 };
}

interface PendingReview {
 id: string;
 booking_id: string;
 provider_id: string;
 provider_name: string;
 provider_avatar: string | null;
 provider_role: string;
 session_date: string;
 service_type: string;
}

export default function ReviewsPage() {
 const [activeTab, setActiveTab] = useState<'my-reviews' | 'pending'>('my-reviews');
 const [searchQuery, setSearchQuery] = useState('');
 const [filterRating, setFilterRating] = useState<number | null>(null);
 const [showReviewModal, setShowReviewModal] = useState(false);
 const [selectedPending, setSelectedPending] = useState<PendingReview | null>(null);
 const [newRating, setNewRating] = useState(0);
 const [newComment, setNewComment] = useState('');
 const [hoveredStar, setHoveredStar] = useState(0);
 
 const [reviews, setReviews] = useState<Review[]>([]);
 const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);

 useEffect(() => {
 loadReviews();
 }, []);

 const loadReviews = async () => {
 try {
 setLoading(true);
 const response = await getMyReviews();
 if (response.success && response.reviews) {
 const mappedReviews = response.reviews.data.map((r: any) => ({
 id: String(r.id),
 provider_name: r.provider?.user?.firstName + ' ' + r.provider?.user?.lastName || 'Provider',
 provider_avatar: r.provider?.user?.avatar || null,
 provider_role: r.provider?.provider_role || 'Care Provider',
 rating: r.rating,
 comment: r.comment || '',
 created_at: r.created_at,
 session_date: r.booking?.scheduled_at || r.created_at,
 service_type: r.booking?.service_type || 'Care Session',
 }));
 setReviews(mappedReviews);
 setPendingReviews([]);
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to load reviews');
 }
 } finally {
 setLoading(false);
 }
 };

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 const getTimeAgo = (dateString: string) => {
 const now = new Date();
 const date = new Date(dateString);
 const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

 if (diffInDays === 0) return 'Today';
 if (diffInDays === 1) return 'Yesterday';
 if (diffInDays < 7) return `${diffInDays} days ago`;
 if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
 return formatDate(dateString);
 };

 const filteredReviews = reviews.filter(review => {
 const matchesSearch = review.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 review.comment.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesRating = filterRating === null || review.rating === filterRating;
 return matchesSearch && matchesRating;
 });

 const handleOpenReviewModal = (pending: PendingReview) => {
 setSelectedPending(pending);
 setNewRating(0);
 setNewComment('');
 setShowReviewModal(true);
 };

 const handleSubmitReview = async () => {
 if (newRating === 0 || !selectedPending) return;
 
 setSubmitting(true);
 try {
 await submitReview({
 provider_id: selectedPending.provider_id,
 rating: newRating,
 comment: newComment,
 booking_id: selectedPending.booking_id,
 });
 toast.success('Review submitted successfully!');
 setShowReviewModal(false);
 setSelectedPending(null);
 loadReviews();
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to submit review');
 }
 } finally {
 setSubmitting(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <Loader2 className="size-8 animate-spin text-teal-600" />
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <Link to="/careseeker" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold text-stone-900">Reviews & Ratings</h1>
 <p className="text-stone-600">Share your experience with care providers</p>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div className="bg-white rounded-xl p-4 ring-1 ring-stone-200/50">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-100 rounded-lg">
 <Star className="size-5 text-amber-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{reviews.length}</p>
 <p className="text-sm text-stone-500">Reviews Given</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-4 ring-1 ring-stone-200/50">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-teal-100 rounded-lg">
 <Clock className="size-5 text-teal-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{pendingReviews.length}</p>
 <p className="text-sm text-stone-500">Pending Reviews</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-4 ring-1 ring-stone-200/50">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-green-100 rounded-lg">
 <ThumbsUp className="size-5 text-green-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">
 {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
 </p>
 <p className="text-sm text-stone-500">Avg Rating</p>
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-2 border-b ring-1 ring-stone-200/50">
 <button
 onClick={() => setActiveTab('my-reviews')}
 className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'my-reviews' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-stone-500 hover:text-stone-700' }`}
 >
 My Reviews
 {reviews.length > 0 && (
 <span className="ml-2 px-2 py-0.5 bg-stone-100 rounded-full text-xs">{reviews.length}</span>
 )}
 </button>
 <button
 onClick={() => setActiveTab('pending')}
 className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-stone-500 hover:text-stone-700' }`}
 >
 Pending
 {pendingReviews.length > 0 && (
 <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{pendingReviews.length}</span>
 )}
 </button>
 </div>

 {activeTab === 'my-reviews' && (
 <div className="flex gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
 <input
 type="text"
 placeholder="Search reviews..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2 ring-1 ring-stone-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 </div>
 <select
 value={filterRating || ''}
 onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
 className="px-4 py-2 ring-1 ring-stone-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
 >
 <option value="">All Ratings</option>
 <option value="5">5 Stars</option>
 <option value="4">4 Stars</option>
 <option value="3">3 Stars</option>
 <option value="2">2 Stars</option>
 <option value="1">1 Star</option>
 </select>
 </div>
 )}

 {activeTab === 'my-reviews' && (
 <div className="space-y-4">
 {filteredReviews.length === 0 ? (
 <div className="text-center py-12 bg-white rounded-xl ring-1 ring-stone-200/50">
 <MessageSquare className="size-12 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-stone-900 mb-2">No reviews yet</h3>
 <p className="text-stone-500">Complete a booking and share your experience</p>
 </div>
 ) : (
 filteredReviews.map((review) => (
 <div key={review.id} className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50">
 <div className="flex items-start gap-4">
 <div className="size-12 rounded-full bg-stone-100 flex items-center justify-center text-lg font-medium text-stone-600">
 {review.provider_avatar ? (
 <img width={100} height={100} src={review.provider_avatar} alt={`${review.provider_name || 'Provider'} avatar`} className="size-full rounded-full object-cover" loading="lazy" />
 ) : (
 review.provider_name.charAt(0)
 )}
 </div>
 <div className="flex-1">
 <div className="flex items-start justify-between mb-2">
 <div>
 <h3 className="font-medium text-stone-900">{review.provider_name}</h3>
 <p className="text-sm text-stone-500">{review.provider_role}</p>
 </div>
 <div className="flex items-center gap-2">
 <StarRating rating={review.rating} />
 <span className="text-sm font-medium text-stone-700">{review.rating}.0</span>
 </div>
 </div>

 <div className="flex items-center gap-4 text-sm text-stone-500 mb-3">
 <span className="flex items-center gap-1">
 <Calendar className="size-3" />
 {formatDate(review.session_date)}
 </span>
 <span className="flex items-center gap-1">
 <CheckCircle className="size-3" />
 {review.service_type}
 </span>
 <span>{getTimeAgo(review.created_at)}</span>
 </div>

 <p className="text-stone-700 mb-3">{review.comment}</p>

 {review.response && (
 <div className="bg-stone-50 rounded-lg p-3 mt-3">
 <p className="text-sm font-medium text-stone-700 mb-1">Provider Response</p>
 <p className="text-sm text-stone-600">{review.response.text}</p>
 <p className="text-xs text-stone-400 mt-1">{getTimeAgo(review.response.created_at)}</p>
 </div>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 )}

 {activeTab === 'pending' && (
 <div className="space-y-4">
 {pendingReviews.length === 0 ? (
 <div className="text-center py-12 bg-white rounded-xl ring-1 ring-stone-200/50">
 <CheckCircle className="size-12 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-stone-900 mb-2">No pending reviews</h3>
 <p className="text-stone-500">You are all caught up!</p>
 </div>
 ) : (
 pendingReviews.map((pending) => (
 <div key={pending.id} className="bg-white rounded-xl p-6 ring-1 ring-stone-200/50">
 <div className="flex items-start gap-4">
 <div className="size-12 rounded-full bg-stone-100 flex items-center justify-center text-lg font-medium text-stone-600">
 {pending.provider_avatar ? (
 <img width={100} height={100} src={pending.provider_avatar} alt={`${pending.provider_name || 'Provider'} avatar`} className="size-full rounded-full object-cover" loading="lazy" />
 ) : (
 pending.provider_name.charAt(0)
 )}
 </div>
 <div className="flex-1">
 <div className="flex items-start justify-between">
 <div>
 <h3 className="font-medium text-stone-900">{pending.provider_name}</h3>
 <p className="text-sm text-stone-500">{pending.provider_role}</p>
 </div>
 <Button
 onClick={() => handleOpenReviewModal(pending)}
 className="bg-teal-600 hover:bg-teal-700"
 >
 <Star className="size-4 mr-2" />
 Rate Session
 </Button>
 </div>
 <div className="flex items-center gap-4 text-sm text-stone-500 mt-2">
 <span className="flex items-center gap-1">
 <Calendar className="size-3" />
 {formatDate(pending.session_date)}
 </span>
 <span className="flex items-center gap-1">
 <CheckCircle className="size-3" />
 {pending.service_type}
 </span>
 </div>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 )}

 {showReviewModal && selectedPending && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-lg w-full p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-semibold">Rate Your Experience</h2>
 <button
 onClick={() => setShowReviewModal(false)}
 className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
 >
 <X className="size-5" />
 </button>
 </div>

 <div className="flex items-center gap-3 mb-6">
 <div className="size-10 rounded-full bg-stone-100 flex items-center justify-center font-medium">
 {selectedPending.provider_name.charAt(0)}
 </div>
 <div>
 <p className="font-medium">{selectedPending.provider_name}</p>
 <p className="text-sm text-stone-500">{selectedPending.provider_role}</p>
 </div>
 </div>

 <div className="mb-6">
 <span className="block text-sm font-medium text-stone-700 mb-2">
 How was your experience?
 </span>
 <div className="flex gap-2 justify-center">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 onMouseEnter={() => setHoveredStar(star)}
 onMouseLeave={() => setHoveredStar(0)}
 onClick={() => setNewRating(star)}
 className="p-1 transition-transform hover:scale-110"
 >
 <Star
 className={`size-8 ${ star <= (hoveredStar || newRating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300' }`}
 />
 </button>
 ))}
 </div>
 <p className="text-center text-sm text-stone-500 mt-2">
 {newRating === 1 && 'Poor'}
 {newRating === 2 && 'Fair'}
 {newRating === 3 && 'Good'}
 {newRating === 4 && 'Very Good'}
 {newRating === 5 && 'Excellent'}
 </p>
 </div>

 <div className="mb-6">
 <label htmlFor="input-src-app-careseeker-reviews-page-tsx-449-451" className="block text-sm font-medium text-stone-700 mb-2">
 Share your experience (optional)
 </label>
 <textarea
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 placeholder="What went well? What could be improved?"
 className="w-full px-4 py-3 ring-1 ring-stone-200/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px] resize-none"
 />
 </div>

 <div className="flex gap-3">
 <Button
 variant="outline"
 className="flex-1"
 onClick={() => setShowReviewModal(false)}
 >
 Cancel
 </Button>
 <Button
 className="flex-1 bg-teal-600 hover:bg-teal-700"
 onClick={handleSubmitReview}
 disabled={newRating === 0 || submitting}
 >
 {submitting ? (
 <Loader2 className="size-4 mr-2 animate-spin" />
 ) : (
 <Send className="size-4 mr-2" />
 )}
 Submit Review
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
