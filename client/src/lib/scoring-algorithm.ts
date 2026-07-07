/**
 * Scoring Algorithm
 * Multi-factor scoring for provider matching
 */

import { CareIntent, CareType } from '@/types/care-intent';
import { AvailabilitySlot } from '@/types/care-intent';
import { DistanceCalculator } from './distance-calculator';
import { AvailabilityMatcher } from './availability-matcher';

export interface ProviderProfile {
    id: string;

    // Qualifications
    care_types: CareType[];
    clinical_skills: string[];
    certifications: string[];
    years_experience: number;

    // Specializations
    cognitive_care_trained: boolean;
    behavioral_experience: boolean;
    medical_conditions_handled: string[];

    // Availability
    availability_slots: AvailabilitySlot[];
    next_available_hours: number;

    // Location
    location: { latitude: number; longitude: number };
    service_radius_km: number;

    // Preferences
    gender: 'MALE' | 'FEMALE';
    languages: string[];
    cultural_capabilities: string[];

    // Pricing
    hourly_rate: number;
    currency: string;

    // Compliance
    license_valid: boolean;
    background_check_current: boolean;
    insurance_active: boolean;
    vaccination_current: boolean;

    // Performance
    average_rating: number;
    review_count: number;
    completed_cases: number;

    // Status
    is_active: boolean;
    is_verified: boolean;
    accepts_new_clients: boolean;
}

export interface ScoreBreakdown {
    qualification: number;
    experience: number;
    availability: number;
    location: number;
    rating: number;
    compliance: number;
    total: number;
}

export class ScoringAlgorithm {
    /**
     * Calculate total match score for a provider
     */
    static calculateTotalScore(
        careIntent: CareIntent,
        provider: ProviderProfile,
        careseekerLocation: { latitude: number; longitude: number }
    ): ScoreBreakdown {
        const qualificationScore = this.calculateQualificationScore(careIntent, provider);
        const experienceScore = this.calculateExperienceScore(provider, careIntent);
        const availabilityScore = this.calculateAvailabilityScoreWrapper(careIntent, provider);
        const locationScore = this.calculateLocationScoreWrapper(careseekerLocation, provider);
        const ratingScore = this.calculateRatingScore(provider);
        const complianceScore = this.calculateComplianceScore(provider);

        // Weighted sum
        const total =
            (qualificationScore * 0.30) +
            (experienceScore * 0.20) +
            (availabilityScore * 0.15) +
            (locationScore * 0.15) +
            (ratingScore * 0.10) +
            (complianceScore * 0.10);

        return {
            qualification: Math.round(qualificationScore),
            experience: Math.round(experienceScore),
            availability: Math.round(availabilityScore),
            location: Math.round(locationScore),
            rating: Math.round(ratingScore),
            compliance: Math.round(complianceScore),
            total: Math.round(total)
        };
    }

    /**
     * 1. Qualification Score (30% weight)
     */
    private static calculateQualificationScore(
        careIntent: CareIntent,
        provider: ProviderProfile
    ): number {
        let score = 0;

        // Care type match (40%)
        const careTypeMatch = provider.care_types.includes(careIntent.type) ? 100 : 0;
        score += careTypeMatch * 0.4;

        // Clinical skills match (30%)
        // This would need the clinical needs from the careseeker
        // For now, assume basic match
        const clinicalMatch = 80; // Placeholder
        score += clinicalMatch * 0.3;

        // Specialized training (20%)
        const certificationBonus = Math.min(provider.certifications.length * 20, 100);
        score += certificationBonus * 0.2;

        // Cognitive care training (10%)
        const cognitiveScore =
            (careIntent.risk_level === 'HIGH' || careIntent.risk_level === 'CRITICAL') &&
                provider.cognitive_care_trained ? 100 : 50;
        score += cognitiveScore * 0.1;

        return score;
    }

    /**
     * 2. Experience Score (20% weight)
     */
    private static calculateExperienceScore(
        provider: ProviderProfile,
        careIntent: CareIntent
    ): number {
        let score = 0;

        // Years of experience (50%)
        let yearsScore = 0;
        if (provider.years_experience >= 10) yearsScore = 100;
        else if (provider.years_experience >= 5) yearsScore = 80;
        else if (provider.years_experience >= 3) yearsScore = 60;
        else if (provider.years_experience >= 1) yearsScore = 40;
        else yearsScore = 20;
        score += yearsScore * 0.5;

        // Relevant case count (30%)
        const caseScore = Math.min((provider.completed_cases / 50) * 100, 100);
        score += caseScore * 0.3;

        // Specialized experience (20%)
        const hasSpecializedExp = provider.behavioral_experience ? 100 : 50;
        score += hasSpecializedExp * 0.2;

        return score;
    }

    /**
     * 3. Availability Score (15% weight)
     */
    private static calculateAvailabilityScoreWrapper(
        careIntent: CareIntent,
        provider: ProviderProfile
    ): number {
        const overlapPercentage = AvailabilityMatcher.calculateOverlap(
            careIntent.constraints.availability_required,
            provider.availability_slots
        );

        return AvailabilityMatcher.calculateAvailabilityScore(
            overlapPercentage,
            careIntent.constraints.urgency,
            provider.next_available_hours
        );
    }

    /**
     * 4. Location Score (15% weight)
     */
    private static calculateLocationScoreWrapper(
        careseekerLocation: { latitude: number; longitude: number },
        provider: ProviderProfile
    ): number {
        const distance = DistanceCalculator.calculateDistance(
            careseekerLocation,
            provider.location
        );

        return DistanceCalculator.calculateLocationScore(distance);
    }

    /**
     * 5. Rating Score (10% weight)
     */
    private static calculateRatingScore(provider: ProviderProfile): number {
        let score = 0;

        // Average rating (50%)
        let ratingScore = 0;
        if (provider.average_rating >= 5.0) ratingScore = 100;
        else if (provider.average_rating >= 4.5) ratingScore = 90;
        else if (provider.average_rating >= 4.0) ratingScore = 75;
        else if (provider.average_rating >= 3.5) ratingScore = 50;
        else ratingScore = 25;
        score += ratingScore * 0.5;

        // Review count (30%)
        const reviewScore = Math.min((provider.review_count / 20) * 100, 100);
        score += reviewScore * 0.3;

        // Recent performance (20%) - placeholder
        const recentScore = 80; // Would need recent reviews data
        score += recentScore * 0.2;

        return score;
    }

    /**
     * 6. Compliance Score (10% weight)
     */
    private static calculateComplianceScore(provider: ProviderProfile): number {
        let score = 0;

        score += provider.license_valid ? 25 : 0;
        score += provider.background_check_current ? 25 : 0;
        score += provider.insurance_active ? 25 : 0;
        score += provider.vaccination_current ? 25 : 0;

        return score;
    }

    /**
     * Generate match explanation reasons
     */
    static generateMatchReasons(
        scores: ScoreBreakdown,
        careIntent: CareIntent,
        provider: ProviderProfile
    ): string[] {
        const reasons: string[] = [];

        if (scores.qualification > 90) {
            reasons.push('Highly qualified for your care needs');
        }

        if (scores.location > 80) {
            reasons.push('Located nearby for convenient visits');
        }

        if (scores.availability > 85) {
            reasons.push('Available at your preferred times');
        }

        if (provider.cognitive_care_trained && careIntent.risk_level !== 'LOW') {
            reasons.push('Specialized in cognitive/dementia care');
        }

        if (provider.years_experience >= 5) {
            reasons.push(`${provider.years_experience}+ years of experience`);
        }

        if (provider.average_rating >= 4.5) {
            reasons.push(`Highly rated (${provider.average_rating.toFixed(1)}★)`);
        }

        if (scores.compliance === 100) {
            reasons.push('Fully compliant and verified');
        }

        return reasons;
    }
}
