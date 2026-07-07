import { client } from "./client";
import { extractDomainError } from '@/lib/errors';
import type { PaymentIntentPayload } from "@/types/api";

export async function getPayments() {
    try {
        const response = await client.get('/admin/payments');
        return response.data.data || response.data;
    } catch (error) {
        console.error('Failed to fetch payments', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getPaymentDetails(id: string) {
    try {
        const response = await client.get(`/admin/payments/${id}`);
        return response.data.data || response.data;
    } catch (error) {
        console.error(`Failed to fetch payment details for ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function markPaymentAsPaid(id: string) {
    try {
        const response = await client.post(`/admin/payments/${id}/mark-paid`);
        return response.data;
    } catch (error) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getPaymentStats() {
    try {
        const response = await client.get('/admin/payments/stats');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch payment stats', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getPayouts() {
    try {
        const response = await client.get('/admin/payouts');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch payouts', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getPayoutDetails(id: string) {
    try {
        const response = await client.get(`/admin/payouts/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch payout details', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function processPayout(id: string, action: 'approve' | 'reject', reason?: string) {
    try {
        const response = await client.post(`/admin/payouts/${id}/${action}`, { reason });
        return response.data;
    } catch (error) {
        console.error(`Failed to ${action} payout ${id}:`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

// export async function createPaymentIntent(data: PaymentIntentPayload) {
//     try {
//         // Generate idempotency key if not provided to prevent duplicate charges
//         const payload = {
//             ...data,
//             idempotencyKey: data.idempotencyKey || crypto.randomUUID(),
//         };
//         const response = await client.post('/payments/create-intent', payload);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to create payment intent', error);
//         throw extractDomainError(error); // MIGRATED: domain error handling
//     }
// }

export async function getPaymentStatus(paymentId: string) {
    try {
        const response = await client.get(`/payments/${paymentId}/status`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch payment status for ${paymentId}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getWalletBalance() {
    try {
        const response = await client.get('/provider/payouts/balance');
        return response.data;
    } catch (error) {
        console.error('Failed to getWalletBalance', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getPayoutBalance() {
    try {
        const response = await client.get('/provider/payouts/balance');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch payout balance', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getProviderPayouts() {
    try {
        const response = await client.get('/provider/payouts');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch payouts', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function createPayoutRequest(data: {
    amount: number;
    bank_account_name: string;
    bank_account_number: string;
    bank_name: string;
    iban?: string;
    notes?: string;
}) {
    try {
        const response = await client.post('/provider/payouts', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create payout request', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function cancelPayoutRequest(id: number) {
    try {
        const response = await client.delete(`/provider/payouts/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to cancel payout request', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getAdminRevenueBreakdown() {
    try {
        const response = await client.get('/admin/dashboard/revenue-breakdown');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch revenue breakdown:', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}
