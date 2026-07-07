
;
import { useState, useEffect , useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowLeft, MessageSquare, Loader2, ThumbsUp, Calendar, User } from 'lucide-react';
import { getProviderReviews } from '@/lib/api/reviews';
import { getProviderProfile } from '@/lib/api/providers';
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
 reviewer_name: string;
 reviewer_avatar: string | null;
 rating: number;
 comment: string;
 created_at: string;
 session_date: string;
 service_type: string;
 helpful?: number;
}

export default function ProviderReviewsPage() {
 const [reviews, setReviews] = useState<Review[]>([]);
 const [loading, setLoading] = useState(true);
 const [averageRating, setAverageRating] = useState(0);
 const [ratingCount, setRatingCount] = useState(0);

 useEffect(() => {
 loadReviews();
 }, []);

 const loadReviews = async () => {
 try {
 setLoading(true);
 const profileResponse = await getProviderProfile();
 const providerId = profileResponse.profile?.id || profileResponse.id;
 
 if (!providerId) {
 toast.error('Provider ID not found');
 setLoading(false);
 return;
 }

 const response = await getProviderReviews(providerId);
 if (response.success && response.reviews) {
 const mappedReviews = response.reviews.data.map((r: any) => ({
 id: String(r.id),
 reviewer_name: r.reviewer?.firstName + ' ' + r.reviewer?.lastName || 'Anonymous',
 reviewer_avatar: r.reviewer?.avatar || null,
 rating: r.rating,
 comment: r.comment || '',
 created_at: r.created_at,
 session_date: r.booking?.scheduled_at || r.created_at,
 service_type: r.booking?.service_type || 'Care Session',
 }));
 setReviews(mappedReviews);
          setAverageRating(parseFloat(response.average_rating) || 0);
 setRatingCount(response.rating_count || 0);
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
 <Link to="/provider/dashboard" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div className="flex-1">
 <h1 className="text-2xl font-semibold text-stone-900">Reviews & Ratings</h1>
 <p className="text-stone-600">See what clients are saying about your care</p>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div className="bg-white rounded-xl p-4 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-amber-100 rounded-lg">
 <Star className="size-5 text-amber-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{averageRating.toFixed(1)}</p>
 <p className="text-sm text-stone-500">Average Rating</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-4 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-teal-100 rounded-lg">
 <MessageSquare className="size-5 text-teal-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{ratingCount}</p>
 <p className="text-sm text-stone-500">Total Reviews</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-4 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-green-100 rounded-lg">
 <ThumbsUp className="size-5 text-green-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">
 {ratingCount > 0 ? Math.round((reviews.filter(r => r.rating >= 4).length / ratingCount) * 100) : 0}%
 </p>
 <p className="text-sm text-stone-500">Positive Reviews</p>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 {reviews.length === 0 ? (
 <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
 <MessageSquare className="size-12 text-stone-300 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-stone-900 mb-2">No reviews yet</h3>
 <p className="text-stone-500">Complete bookings and receive reviews from your clients</p>
 </div>
 ) : (
 reviews.map((review) => (
 <div key={review.id} className="bg-white rounded-xl p-6 border border-stone-200">
 <div className="flex items-start gap-4">
 <div className="size-12 rounded-full bg-stone-100 flex items-center justify-center text-lg font-medium text-stone-600">
 {review.reviewer_avatar ? (
 <img width={100} height={100} src={review.reviewer_avatar} alt={`${review.reviewer_name} avatar`} className="size-full rounded-full object-cover" loading="lazy" />
 ) : (
 <User className="size-5 text-stone-400" />
 )}
 </div>
 <div className="flex-1">
 <div className="flex items-start justify-between mb-2">
 <div>
 <h3 className="font-medium text-stone-900">{review.reviewer_name}</h3>
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
 <span>{getTimeAgo(review.created_at)}</span>
 </div>

 <p className="text-stone-700">{review.comment}</p>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
}
