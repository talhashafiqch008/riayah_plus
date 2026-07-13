/* eslint-disable */
// @ts-nocheck
interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    success?: boolean;
}

interface PaginatedResponse<T = unknown> {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}

interface FilterParams {
    [key: string]: string | number | boolean | undefined;
}

export interface RegisterPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
    /** GDPR: must be true — terms accepted before account creation */
    consentAccepted?: boolean;
}

export interface UpdateProfilePayload {
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar?: string;
    [key: string]: unknown;
}

export interface OnboardingPayload {
    country?: string;
    preferredLanguage?: string;
    careCategories?: string[];
    careNeeds?: Record<string, string[]>;
    [key: string]: unknown;
}

// User payloads
export interface UpdateUserPayload {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
}

// Provider payloads
interface ProviderSearchParams {
    role?: string;
    gender?: string;
    language?: string;
    radiusKm?: number;
    latitude?: number;
    longitude?: number;
}

export interface ProviderFilters extends ProviderSearchParams {
    specialty?: string;
    availability?: string;
    rating?: number;
    [key: string]: unknown;
}

export interface ProviderProfileData {
    bio?: string;
    specialties?: string[];
    languages?: string[];
    hourly_rate?: number;
    experience?: number;
    education?: string;
    certifications?: string[];
    [key: string]: unknown;
}

export interface FamilyMemberPayload {
    first_name?: string;
    last_name?: string;
    relationship?: string;
    date_of_birth?: string;
    phone?: string;
    email?: string;
    password?: string;
    [key: string]: unknown;
}

export interface AgencyStaffPayload {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    password?: string;
    specialty?: string;
    status?: string;
    [key: string]: unknown;
}

export interface BookingPayload {
    providerId: string;
    scheduledAt: string;
    startTime: string;
    endTime: string;
    bookingType?: string;
    serviceType?: string;
    consultationMethod?: string;
    notes?: string;
    [key: string]: unknown;
}

export interface BookingStatusUpdate {
    status: string;
    reason?: string;
}

export interface CareOrderPayload {
    provider_id?: string;
    scheduled_at?: string;
    booking_type?: string;
    duration?: number;
    notes?: string;
    [key: string]: unknown;
}

export interface AdminBookingFilters {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    providerId?: string;
    clientId?: string;
    page?: number;
    perPage?: number;
    [key: string]: unknown;
}
// Admin payloads
export interface StaffAssignmentPayload {
    careOrderId: string;
    primaryStaffId: string;
    role?: string;
    notes?: string;
    [key: string]: unknown;
}

interface VerificationAction {
    status: 'approved' | 'rejected';
    reason?: string;
}

export interface AdminUserFilter {
    role?: string;
    status?: string;
    search?: string;
}

export interface AuditLogParams {
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
    [key: string]: unknown;
}

export interface IncidentPayload {
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: string;
    [key: string]: unknown;
}

export interface TaskPayload {
    title?: string;
    description?: string;
    due_date?: string;
    due_time?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'pending' | 'in-progress' | 'completed' | 'overdue';
    category?: 'medication' | 'hygiene' | 'mobility' | 'nutrition' | 'documentation' | 'clinical' | 'cleaning' | 'other';
    notes?: string;
    assignee_id?: string;
    shift_id?: string;
    [key: string]: unknown;
}

export interface CareRecipientPayload {
    name: string;
    relationship: string;
    age?: number;
    medical_conditions?: string;
    care_needs?: string;
    emergency_contact?: string;
    [key: string]: unknown;
}

// Shift payloads
export interface ShiftPayload {
    startTime: string;
    endTime: string;
    location?: string;
    notes?: string;
}

// Service payloads
export interface ServicePayload {
    name?: string;
    description?: string;
    price?: number;
    duration?: number;
    isActive?: boolean;
    [key: string]: unknown;
}
// Payment payloads
export interface PaymentIntentPayload {
    bookingId: string;
    idempotencyKey?: string;
    currency?: string;
    amount?: number;
    [key: string]: unknown;
}

// Document payloads
interface DocumentUploadPayload {
    type: string;
    file: File;
    title?: string;
}

export interface OnboardingDocumentPayload {
    url: string;
    type: string;
    metadata?: unknown;
}

// Review payloads
// export interface ReviewPayload {
//     bookingId: string;
//     rating: number;
//     comment?: string;
//     [key: string]: unknown;
// }

// Insurance payloads
export interface InsuranceClaimPayload {
    policyNumber: string;
    providerId: string;
    amount: number;
    description?: string;
    [key: string]: unknown;
}

// Chat payloads
export interface ChatMessagePayload {
    receiverId?: string | number;
    message?: string;
    type?: string;
    [key: string]: unknown;
}

export interface CreateConversationPayload {
    participantIds: string[];
    [key: string]: unknown;
}

// Course payloads
// export interface LessonPayload {
//     id?: string;
//     title: string;
//     duration?: string;
// }

export interface CoursePayload {
    title: string;
    description?: string;
    category?: string;
    level?: string;
    duration?: string;
    status?: 'draft' | 'published' | 'archived';
    lessons?: LessonPayload[];
}

// Quiz payloads
// export interface QuestionPayload {
//     id?: string;
//     type: 'multiple_choice' | 'true_false' | 'short_answer';
//     question: string;
//     options?: string[];
//     correct_answer: string;
//     points?: number;
//     explanation?: string;
// }

export interface QuizPayload {
    course_id: string;
    title: string;
    description?: string;
    passing_score?: number;
    time_limit?: number;
    status?: 'draft' | 'published';
    questions?: QuestionPayload[];
}

// Trainer analytics
export interface CoursePerformance {
    course: string;
    students: number;
    completion: number;
    avg_grade: string;
}

export interface MonthlyEnrollment {
    month: string;
    enrollments: number;
}

export interface TrainerAnalytics {
    total_students: number;
    active_courses: number;
    completion_rate: number;
    certificates_issued: number;
    course_performance: CoursePerformance[];
    monthly_enrollments: MonthlyEnrollment[];
}

export interface CarePlanPayload {
    name: string;
    description?: string;
    status?: 'active' | 'pending' | 'completed' | 'cancelled';
    hours_per_week?: number;
    start_date?: string;
    end_date?: string;
    care_recipient_id?: string;
    [key: string]: unknown;
}

export interface CarePlanItemPayload {
    title: string;
    description?: string;
    category?: string;
    frequency?: string;
    status?: 'active' | 'pending' | 'completed' | 'cancelled';
    sort_order?: number;
    [key: string]: unknown;
}

export interface CareBudgetPayload {
    monthly_budget?: number;
    current_spend?: number;
    projected_spend?: number;
    currency?: string;
    insurance_coverage?: number;
    out_of_pocket?: number;
    period_start?: string;
    period_end?: string;
    [key: string]: unknown;
}

export interface CareTimelineEventPayload {
    title: string;
    description?: string;
    category?: string;
    event_type?: 'upcoming' | 'past';
    status?: string;
    event_date?: string;
    provider_name?: string;
    duration?: string;
    [key: string]: unknown;
}
