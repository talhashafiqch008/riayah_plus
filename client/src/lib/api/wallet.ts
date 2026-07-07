import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export interface WalletBalance {
    available_credits: number;
    escrow_credits: number;
    total_earnings_credits: number;
    currency: string;
}

// export interface CreditTransaction {
//     id: number;
//     type: string;
//     amount_credits: number;
//     balance_after_credits: number;
//     description: string;
//     reference: string;
//     created_at: string;
// }

export async function getWalletBalance(): Promise<WalletBalance> {
    try {
        const response = await client.get('/wallet/balance');
        return response.data.balance;
    } catch (error) {
        console.error('Failed to get wallet balance', error);
        throw extractApiError(error);
    }
}

export async function getWalletTransactions(page = 1, perPage = 25) {
    try {
        const response = await client.get('/wallet/transactions', {
            params: { page, per_page: perPage },
        });
        return response.data;
    } catch (error) {
        console.error('Failed to get wallet transactions', error);
        throw extractApiError(error);
    }
}

export async function createTopup(amountCents: number, idempotencyKey?: string) {
    try {
        const response = await client.post('/credits/topup', {
            amount_cents: amountCents,
            idempotency_key: idempotencyKey || crypto.randomUUID(),
        });
        return response.data;
    } catch (error) {
        console.error('Failed to create topup', error);
        throw extractApiError(error);
    }
}

export async function confirmTopup(paymentIntentId: string) {
    try {
        const response = await client.post('/credits/topup/confirm', {
            payment_intent_id: paymentIntentId,
        });
        return response.data;
    } catch (error) {
        console.error('Failed to confirm topup', error);
        throw extractApiError(error);
    }
}

// export async function getTopupHistory(page = 1, perPage = 25) {
//     try {
//         const response = await client.get('/credits/topups', {
//             params: { page, per_page: perPage },
//         });
//         return response.data;
//     } catch (error) {
//         console.error('Failed to get topup history', error);
//         throw extractApiError(error);
//     }
// }

// export async function payBookingWithCredits(bookingId: number, idempotencyKey?: string) {
//     try {
//         const response = await client.post(`/bookings/${bookingId}/pay-with-credits`, {
//             idempotency_key: idempotencyKey || crypto.randomUUID(),
//         });
//         return response.data;
//     } catch (error) {
//         console.error('Failed to pay booking with credits', error);
//         throw extractApiError(error);
//     }
// }
