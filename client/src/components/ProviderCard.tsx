/**
 * Provider Card Component
 * Display provider match results with score visualization
 */

import { Star, MapPin, Clock, DollarSign, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { MatchResult } from '@/lib/matching-engine';

interface ProviderCardProps {
 match: MatchResult;
 onViewDetails: (providerId: string) => void;
 onBook: (providerId: string) => void;
}

export default function ProviderCard({ match, onViewDetails, onBook }: ProviderCardProps) {
 const { provider, scores, distance_km, next_available, hourly_rate, match_reasons, potential_concerns, rank } = match;

 return (
 <div className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-lg transition-all cursor-pointer group">
 <div className="flex items-start justify-between mb-4">
 {/* Provider Info */}
 <div className="flex items-start gap-4 flex-1">
 {/* Avatar */}
 <div className="size-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
 {provider.id.substring(0, 2).toUpperCase()}
 </div>

 {/* Details */}
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h3 className="text-lg font-semibold text-stone-900">Provider #{rank}</h3>
 {provider.is_verified && (
 <CheckCircle className="size-5 text-teal-600" />
 )}
 </div>

 {/* Rating */}
 <div className="flex items-center gap-2 mb-2">
 <div className="flex items-center gap-1">
 <Star className="size-4 fill-amber-400 text-amber-400" />
 <span className="text-sm font-medium text-stone-700">{provider.average_rating.toFixed(1)}</span>
 </div>
 <span className="text-xs text-stone-500">({provider.review_count} reviews)</span>
 <span className="text-xs text-stone-400">•</span>
 <span className="text-xs text-stone-600">{provider.years_experience}+ years exp</span>
 </div>

 {/* Quick Stats */}
 <div className="flex items-center gap-4 text-sm text-stone-600">
 <div className="flex items-center gap-1">
 <MapPin className="size-4" />
 <span>{distance_km}km away</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock className="size-4" />
 <span>{next_available}</span>
 </div>
 <div className="flex items-center gap-1">
 <DollarSign className="size-4" />
 <span>{hourly_rate} {provider.currency}/hr</span>
 </div>
 </div>
 </div>
 </div>

 {/* Match Score */}
 <div className="text-center">
 <div className="relative size-20">
 <svg className="size-20 transform -rotate-90">
 <circle
 cx="40"
 cy="40"
 r="36"
 stroke="#e2e8f0"
 strokeWidth="6"
 fill="none"
 />
 <circle
 cx="40"
 cy="40"
 r="36"
 stroke="#0d9488"
 strokeWidth="6"
 fill="none"
 strokeDasharray={`${2 * Math.PI * 36}`}
 strokeDashoffset={`${2 * Math.PI * 36 * (1 - scores.total / 100)}`}
 strokeLinecap="round"
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-2xl font-bold text-teal-600">{scores.total}</span>
 </div>
 </div>
 <p className="text-xs text-stone-500 mt-1">Match Score</p>
 </div>
 </div>

 {/* Score Breakdown */}
 <div className="grid grid-cols-3 gap-3 mb-4">
 <ScorePill label="Skills" score={scores.qualification} />
 <ScorePill label="Experience" score={scores.experience} />
 <ScorePill label="Location" score={scores.location} />
 <ScorePill label="Availability" score={scores.availability} />
 <ScorePill label="Rating" score={scores.rating} />
 <ScorePill label="Compliance" score={scores.compliance} />
 </div>

 {/* Match Reasons */}
 {match_reasons.length > 0 && (
 <div className="mb-4">
 <p className="text-xs font-medium text-stone-700 mb-2">Why this match:</p>
 <div className="space-y-1">
 {match_reasons.slice(0, 3).map((reason) => (
 <div key={reason} className="flex items-start gap-2">
 <CheckCircle className="size-4 text-teal-600 mt-0.5 flex-shrink-0" />
 <span className="text-xs text-stone-600">{reason}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Concerns */}
 {potential_concerns.length > 0 && (
 <div className="mb-4">
 <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
 <AlertCircle className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
 <span className="text-xs text-amber-800">{potential_concerns[0]}</span>
 </div>
 </div>
 )}

 {/* Actions */}
 <div className="flex gap-3">
 <button
 onClick={() => onViewDetails(provider.id)}
 className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors text-sm"
 >
 View Profile
 </button>
 <button
 onClick={() => onBook(provider.id)}
 className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-sm flex items-center justify-center gap-2"
 >
 Book Now
 <ChevronRight className="size-4" />
 </button>
 </div>
 </div>
 );
}

function ScorePill({ label, score }: { label: string; score: number }) {
 const getColor = (score: number) => {
 if (score >= 80) return 'bg-teal-100 text-teal-700';
 if (score >= 60) return 'bg-blue-100 text-blue-700';
 if (score >= 40) return 'bg-amber-100 text-amber-700';
 return 'bg-stone-100 text-stone-700';
 };

 return (
 <div className={`px-3 py-1.5 rounded-lg ${getColor(score)}`}>
 <p className="text-xs font-medium">{label}</p>
 <p className="text-sm font-bold">{score}</p>
 </div>
 );
}
