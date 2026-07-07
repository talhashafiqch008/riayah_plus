import { client } from "./client";
import { extractApiError } from '../errors';

interface FindProvidersRequest {
    careseeker_id?: string;
    care_intent_id?: string;
    latitude: number;
    longitude: number;
    max_distance_km: number;
    care_type?: string;
    budget_max?: number;
    budget_min?: number;
    gender_preference?: "MALE" | "FEMALE" | "NO_PREFERENCE";
    language_preferences?: string[];
    urgency?: string;
    page?: number;
    limit?: number;
}

interface ProviderMatchItem {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    rating: number;
    hourlyRate: number;
    currency: string;
    verified: boolean;
    bio?: string;
    specialties: string[];
    languages: string[];
    experience?: number | null;
    distance_km?: number | null;
    match_score: number;
    match_reasons: string[];
    average_rating: number;
    rating_count: number;
}

interface FindProvidersResponse {
    success: boolean;
    matches: ProviderMatchItem[];
    total_count: number;
    page: number;
    limit: number;
    has_more: boolean;
}

interface SaveMatchRequest {
    provider_id: string;
    match_score: number;
    match_criteria: Record<string, unknown>;
    status?: "pending" | "accepted" | "rejected" | "expired";
}

interface SavedMatch {
    id: number;
    careseeker_id: number;
    provider_id: number;
    match_score: number;
    match_criteria: Record<string, unknown>;
    status: string;
    created_at: string;
    updated_at: string;
}

interface SaveMatchResponse {
    success: boolean;
    message: string;
    match: SavedMatch;
}

interface MatchHistoryItem {
    id: number;
    careseeker_id: number;
    provider_id: number;
    provider_name: string;
    provider_avatar?: string;
    match_score: number;
    match_criteria: Record<string, unknown>;
    status: string;
    created_at: string;
    updated_at: string;
}

interface MatchHistoryResponse {
    success: boolean;
    history: MatchHistoryItem[];
}

async function findProviders(
    request: FindProvidersRequest
): Promise<FindProvidersResponse> {
    try {
        const response = await client.post<FindProvidersResponse>(
            "/matching/find-providers",
            request
        );
        return response.data;
    } catch (error) {
        console.error("Failed to find providers", error);
        throw extractApiError(error);
    }
}

async function saveMatch(
    request: SaveMatchRequest
): Promise<SaveMatchResponse> {
    try {
        const response = await client.post<SaveMatchResponse>(
            "/matching/save",
            request
        );
        return response.data;
    } catch (error) {
        console.error("Failed to save match", error);
        throw extractApiError(error);
    }
}

async function getMatchHistory(
    careseekerId: string
): Promise<MatchHistoryItem[]> {
    try {
        const response = await client.get<MatchHistoryResponse>(
            `/matching/history/${careseekerId}`
        );
        return response.data.history;
    } catch (error) {
        console.error("Failed to get match history", error);
        throw extractApiError(error);
    }
}

export const matchingAPI = { findProviders, saveMatch, getMatchHistory };
export type { FindProvidersRequest, ProviderMatchItem, FindProvidersResponse, SaveMatchRequest };
