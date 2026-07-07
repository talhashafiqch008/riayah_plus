import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export interface MarketplaceOffer {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  service_type: string;
  care_categories?: string[];
  base_price: number;
  price_unit: 'per_hour' | 'per_day' | 'per_session' | 'fixed';
  duration_minutes: number;
  location_type: 'client_home' | 'provider_facility' | 'online' | 'any';
  location_city?: string;
  is_active: boolean;
  available_schedule?: Record<string, string[]>;
  requires_booking: boolean;
  status: 'active' | 'paused' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  provider?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
}

export async function getMarketplaceOffers(filters?: {
  service_type?: string;
  location_city?: string;
  min_price?: number;
  max_price?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.service_type) params.append('service_type', filters.service_type);
    if (filters?.location_city) params.append('location_city', filters.location_city);
    if (filters?.min_price) params.append('min_price', String(filters.min_price));
    if (filters?.max_price) params.append('max_price', String(filters.max_price));

    const response = await client.get(`/marketplace/offers?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to get marketplace offers', error);
    throw extractApiError(error);
  }
}

export async function getMarketplaceOffer(id: string) {
  try {
    const response = await client.get(`/marketplace/offers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to get marketplace offer', error);
    throw extractApiError(error);
  }
}

export async function bookMarketplaceOffer(id: string, data: {
  scheduled_at: string;
  notes?: string;
}) {
  try {
    const response = await client.post(`/marketplace/offers/${id}/book`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to book marketplace offer', error);
    throw extractApiError(error);
  }
}

export async function getProviderMarketplaceOffers() {
  try {
    const response = await client.get('/provider/marketplace-offers');
    return response.data;
  } catch (error) {
    console.error('Failed to get provider marketplace offers', error);
    throw extractApiError(error);
  }
}

export async function createMarketplaceOffer(data: {
  title: string;
  description: string;
  service_type: string;
  care_categories?: string[];
  base_price: number;
  price_unit: 'per_hour' | 'per_day' | 'per_session' | 'fixed';
  duration_minutes: number;
  location_type: 'client_home' | 'provider_facility' | 'online' | 'any';
  location_city?: string;
  available_schedule?: Record<string, string[]>;
  requires_booking?: boolean;
  expires_at?: string;
}) {
  try {
    const response = await client.post('/provider/marketplace-offers', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create marketplace offer', error);
    throw extractApiError(error);
  }
}

export async function updateMarketplaceOffer(id: string, data: Partial<MarketplaceOffer>) {
  try {
    const response = await client.put(`/provider/marketplace-offers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update marketplace offer', error);
    throw extractApiError(error);
  }
}

export async function deleteMarketplaceOffer(id: string) {
  try {
    const response = await client.delete(`/provider/marketplace-offers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete marketplace offer', error);
    throw extractApiError(error);
  }
}
