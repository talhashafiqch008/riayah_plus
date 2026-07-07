/* eslint-disable */
// @ts-nocheck
/**
 * Care Intent Types
 * Core data model for intelligent care matching
 * Based on Mable + Hireup + Mobility best practices
 */

// ============================================================================
// CARE TYPES
// ============================================================================

export enum CareType {
    MEDICAL = 'MEDICAL',
    DISABILITY = 'DISABILITY',
    ELDERLY = 'ELDERLY',
    CHILD = 'CHILD',
    COMPANION = 'COMPANION',
    REHABILITATION = 'REHABILITATION',
    MENTAL_HEALTH = 'MENTAL_HEALTH',
    PALLIATIVE = 'PALLIATIVE'
}

const CARE_TYPE_LABELS: Record<CareType, { en: string; ar: string }> = {
    [CareType.MEDICAL]: { en: 'Medical Care', ar: 'الرعاية الطبية' },
    [CareType.DISABILITY]: { en: 'Disability Support', ar: 'دعم ذوي الإعاقة' },
    [CareType.ELDERLY]: { en: 'Elderly Care', ar: 'رعاية المسنين' },
    [CareType.CHILD]: { en: 'Child Care', ar: 'رعاية الأطفال' },
    [CareType.COMPANION]: { en: 'Companionship', ar: 'الرفقة' },
    [CareType.REHABILITATION]: { en: 'Rehabilitation', ar: 'التأهيل' },
    [CareType.MENTAL_HEALTH]: { en: 'Mental Health', ar: 'الصحة النفسية' },
    [CareType.PALLIATIVE]: { en: 'Palliative Care', ar: 'الرعاية التلطيفية' }
};

// ============================================================================
// STATUS & WORKFLOW
// ============================================================================

export enum IntentStatus {
    DRAFT = 'DRAFT',                      // Started but incomplete
    READY_FOR_MATCHING = 'READY',         // Can browse providers
    PENDING_REVIEW = 'PENDING_REVIEW',    // Admin verification needed
    ACTIVE = 'ACTIVE',                    // Currently receiving care
    PAUSED = 'PAUSED',                    // Temporarily paused
    CLOSED = 'CLOSED',                    // Care completed
    RESTRICTED = 'RESTRICTED'             // Compliance issue
}

export enum RiskLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

// ============================================================================
// COMPLIANCE
// ============================================================================

// export interface ComplianceRule {
//     id: string;
//     type: ComplianceType;
//     required: boolean;
//     country_specific: boolean;
//     countries?: string[];
//     description: { en: string; ar: string };
// }

export enum ComplianceType {
    MEDICAL_LICENSE = 'MEDICAL_LICENSE',
    BACKGROUND_CHECK = 'BACKGROUND_CHECK',
    INSURANCE = 'INSURANCE',
    VACCINATION = 'VACCINATION',
    SPECIALIZED_TRAINING = 'SPECIALIZED_TRAINING',
    NATIONAL_ID = 'NATIONAL_ID'
}

// ============================================================================
// MATCHING PREFERENCES
// ============================================================================

// export interface MatchingPreferences {
//     // Provider characteristics
//     gender_preference?: 'MALE' | 'FEMALE' | 'NO_PREFERENCE';
//     language_preference: string[]; // ['ar', 'en']
//     age_range?: { min?: number; max?: number };
//
//     // Experience
//     min_years_experience?: number;
//     required_qualifications?: string[];
//
//     // Cultural
//     cultural_considerations?: string[];
//     religious_requirements?: string[];
//
//     // Continuity
//     prefer_same_provider: boolean;
//     max_provider_changes?: number;
// }

// export interface MatchingConstraints {
//     // Schedule
//     availability_required: AvailabilitySlot[];
//     flexibility: 'STRICT' | 'FLEXIBLE' | 'VERY_FLEXIBLE';
//
//     // Location
//     location: Location;
//     max_distance_km: number;
//     home_visit_required: boolean;
//
//     // Budget
//     budget_range?: {
//         min: number;
//         max: number;
//         currency: string;
//     };
//
//     // Timing
//     start_date: Date;
//     duration_weeks?: number;
//     urgency: 'IMMEDIATE' | 'WITHIN_WEEK' | 'WITHIN_MONTH' | 'FLEXIBLE';
// }

export interface AvailabilitySlot {
    day_of_week: number; // 0-6 (Sunday-Saturday)
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    recurring: boolean;
}

// export interface Location {
//     address: string;
//     city: string;
//     state?: string;
//     country: string;
//     postal_code?: string;
//     coordinates?: {
//         latitude: number;
//         longitude: number;
//     };
// }

// ============================================================================
// CORE CARE INTENT
// ============================================================================

export interface CareIntent {
    id: string;
    patient_id: string;

    // Care definition
    type: CareType;
    status: IntentStatus;

    // Dynamic questionnaire responses
    // Structure varies by care type
    questionnaire_responses: Record<string, unknown>;

    // Computed fields (auto-calculated)
    risk_level: RiskLevel;
    compliance_requirements: ComplianceRule[];

    // Matching criteria
    preferences: MatchingPreferences;
    constraints: MatchingConstraints;

    // Care recipient (if different from patient)
    recipient?: CareRecipient;

    // Metadata
    created_at: Date;
    updated_at: Date;
    version: number;

    // Admin
    admin_notes?: string;
    flagged: boolean;
    flag_reason?: string;
}

// export interface CareRecipient {
//     relationship: string; // 'SELF' | 'PARENT' | 'CHILD' | 'SPOUSE' | 'OTHER'
//     first_name?: string;
//     last_name?: string;
//     date_of_birth?: Date;
//     gender?: 'MALE' | 'FEMALE' | 'OTHER';
//     medical_conditions?: string[];
// }

// ============================================================================
// CARE INTENT CREATION
// ============================================================================

// export interface CreateCareIntentInput {
//     type: CareType;
//     questionnaire_responses: Record<string, unknown>;
//     preferences: Partial<MatchingPreferences>;
//     constraints: Partial<MatchingConstraints>;
//     recipient?: CareRecipient;
// }

// export interface UpdateCareIntentInput {
//     questionnaire_responses?: Record<string, unknown>;
//     preferences?: Partial<MatchingPreferences>;
//     constraints?: Partial<MatchingConstraints>;
//     status?: IntentStatus;
// }

// ============================================================================
// RISK CALCULATION
// ============================================================================

// export interface RiskFactors {
//     medical_complexity: number; // 0-10
//     mobility_limitation: number; // 0-10
//     cognitive_impairment: number; // 0-10
//     behavioral_challenges: number; // 0-10
//     environmental_risks: number; // 0-10
// }

// export interface RiskAssessment {
//     level: RiskLevel;
//     score: number; // 0-100
//     factors: RiskFactors;
//     recommendations: string[];
//     requires_specialized_care: boolean;
// }

// ============================================================================
// HELPER TYPES
// ============================================================================

// export type CareIntentFilter = {
//     status?: IntentStatus[];
//     type?: CareType[];
//     risk_level?: RiskLevel[];
//     patient_id?: string;
// };

// export type CareIntentSort = {
//     field: 'created_at' | 'updated_at' | 'risk_level' | 'status';
//     direction: 'asc' | 'desc';
// };
