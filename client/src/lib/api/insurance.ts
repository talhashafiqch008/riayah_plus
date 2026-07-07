import { client } from "./client";
import { extractApiError } from '@/lib/errors';
import type { InsuranceClaimPayload } from "@/types/api";

async function getInsuranceQuotes() {
    try {
        const response = await client.get('/insurance/quotes');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch insurance quotes', error);
        throw extractApiError(error);
    }
}

async function createInsuranceQuote(data: InsuranceClaimPayload) {
    try {
        const response = await client.post('/insurance/quotes', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create insurance quote', error);
        throw extractApiError(error);
    }
}
