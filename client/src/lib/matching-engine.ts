/**
 * Matching Engine
 * Main engine for intelligent provider-careseeker matching
 */

import { CareIntent } from '@/types/care-intent';
import { ScoringAlgorithm, ProviderProfile, ScoreBreakdown } from './scoring-algorithm';
import { DistanceCalculator } from './distance-calculator';

export interface MatchRequest {
    careseeker_id: string;
    care_intent: CareIntent;
    careseeker_location: { latitude: number; longitude: number };

    // Filters
    max_distance_km: number;
    budget_max?: number;
    budget_min?: number;

    // Preferences
    gender_preference?: 'MALE' | 'FEMALE' | 'NO_PREFERENCE';
    language_preferences: string[];

    // Pagination
    page?: number;
    limit?: number;
}

export interface MatchResult {
    provider_id: string;
    rank: number;
    total_score: number;

    // Score breakdown
    scores: ScoreBreakdown;

    // Match details
    distance_km: number;
    next_available: string;
    hourly_rate: number;

    // Flags
    is_verified: boolean;
    meets_all_requirements: boolean;
    has_immediate_availability: boolean;

    // Explanation
    match_reasons: string[];
    potential_concerns: string[];

    // Provider info (for display)
    provider: ProviderProfile;
}

interface ScoredProvider {
    provider: ProviderProfile;
    scores: ScoreBreakdown;
    distance: number;
    matchReasons: string[];
    concerns: string[];
}

class MatchingEngine {
    /**
     * Find matching providers for a careseeker
     */
    static async findMatches(
        request: MatchRequest,
        providers: ProviderProfile[]
    ): Promise<MatchResult[]> {
        // Step 1: Apply hard filters
        const filteredProviders = this.applyHardFilters(request, providers);

        // Step 2: Calculate scores for each provider
        const scoredProviders = filteredProviders.map(provider => {
            const scores = ScoringAlgorithm.calculateTotalScore(
                request.care_intent,
                provider,
                request.careseeker_location
            );

            const distance = DistanceCalculator.calculateDistance(
                request.careseeker_location,
                provider.location
            );

            const matchReasons = ScoringAlgorithm.generateMatchReasons(
                scores,
                request.care_intent,
                provider
            );

            const concerns = this.identifyConcerns(request, provider, scores);

            return {
                provider,
                scores,
                distance,
                matchReasons,
                concerns
            };
        });

        // Step 3: Sort by score
        scoredProviders.sort((a, b) => b.scores.total - a.scores.total);

        // Step 4: Apply urgency prioritization
        const prioritized = this.applyUrgencyPrioritization(
            scoredProviders,
            request.care_intent.constraints.urgency
        );

        // Step 5: Build match results
        const results: MatchResult[] = prioritized.map((item, index) => ({
            provider_id: item.provider.id,
            rank: index + 1,
            total_score: item.scores.total,
            scores: item.scores,
            distance_km: item.distance,
            next_available: this.formatNextAvailable(item.provider.next_available_hours),
            hourly_rate: item.provider.hourly_rate,
            is_verified: item.provider.is_verified,
            meets_all_requirements: item.scores.compliance === 100,
            has_immediate_availability: item.provider.next_available_hours <= 24,
            match_reasons: item.matchReasons,
            potential_concerns: item.concerns,
            provider: item.provider
        }));

        // Step 6: Paginate
        const page = request.page || 1;
        const limit = request.limit || 20;
        const start = (page - 1) * limit;
        const end = start + limit;

        return results.slice(start, end);
    }

    /**
     * Apply hard filters (must pass all)
     */
    private static applyHardFilters(
        request: MatchRequest,
        providers: ProviderProfile[]
    ): ProviderProfile[] {
        return providers.filter(provider => {
            // Must be active and accepting clients
            if (!provider.is_active || !provider.accepts_new_clients) {
                return false;
            }

            // Must match care type
            if (!provider.care_types.includes(request.care_intent.type)) {
                return false;
            }

            // Gender preference filter
            if (request.gender_preference && request.gender_preference !== 'NO_PREFERENCE') {
                if (provider.gender !== request.gender_preference) {
                    return false;
                }
            }

            // Language filter (must have at least one match)
            const hasLanguageMatch = provider.languages.some(lang =>
                request.language_preferences.includes(lang)
            );
            if (!hasLanguageMatch) {
                return false;
            }

            // Budget filter
            if (request.budget_max && provider.hourly_rate > request.budget_max) {
                return false;
            }
            if (request.budget_min && provider.hourly_rate < request.budget_min) {
                return false;
            }

            // Distance filter
            const distance = DistanceCalculator.calculateDistance(
                request.careseeker_location,
                provider.location
            );
            if (distance > request.max_distance_km) {
                return false;
            }

            // Compliance filter (all must pass)
            if (!provider.license_valid ||
                !provider.background_check_current ||
                !provider.insurance_active) {
                return false;
            }

            return true;
        });
    }

    /**
     * Apply urgency-based prioritization
     */
    private static applyUrgencyPrioritization(
        scoredProviders: ScoredProvider[],
        urgency: string
    ): ScoredProvider[] {
        if (urgency === 'IMMEDIATE') {
            // Filter to only immediate availability
            const immediate = scoredProviders.filter(
                p => p.provider.next_available_hours <= 24
            );

            // Sort by soonest availability
            immediate.sort((a, b) =>
                a.provider.next_available_hours - b.provider.next_available_hours
            );

            return immediate;
        }

        if (urgency === 'WITHIN_WEEK') {
            // Boost score for providers available within a week
            scoredProviders.forEach(p => {
                if (p.provider.next_available_hours <= 168) {
                    p.scores.total += 10; // Urgency bonus
                }
            });

            // Re-sort
            scoredProviders.sort((a, b) => b.scores.total - a.scores.total);
        }

        return scoredProviders;
    }

    /**
     * Identify potential concerns
     */
    private static identifyConcerns(
        request: MatchRequest,
        provider: ProviderProfile,
        scores: ScoreBreakdown
    ): string[] {
        const concerns: string[] = [];

        if (scores.qualification < 70) {
            concerns.push('May not have all required qualifications');
        }

        if (scores.availability < 50) {
            concerns.push('Limited availability match');
        }

        if (scores.location < 40) {
            concerns.push('Located farther away');
        }

        if (provider.review_count < 5) {
            concerns.push('Limited reviews available');
        }

        if (provider.years_experience < 2) {
            concerns.push('Relatively new provider');
        }

        if (!provider.is_verified) {
            concerns.push('Verification pending');
        }

        return concerns;
    }

    /**
     * Format next available time
     */
    private static formatNextAvailable(hours: number): string {
        if (hours <= 24) {
            return 'Available today';
        } else if (hours <= 48) {
            return 'Available tomorrow';
        } else if (hours <= 168) {
            const days = Math.ceil(hours / 24);
            return `Available in ${days} days`;
        } else {
            const weeks = Math.ceil(hours / 168);
            return `Available in ${weeks} weeks`;
        }
    }

    /**
     * Get match statistics
     */
    static getMatchStatistics(results: MatchResult[]): {
        total_matches: number;
        avg_score: number;
        immediate_available: number;
        verified_count: number;
    } {
        return {
            total_matches: results.length,
            avg_score: results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + r.total_score, 0) / results.length)
                : 0,
            immediate_available: results.filter(r => r.has_immediate_availability).length,
            verified_count: results.filter(r => r.is_verified).length
        };
    }
}
