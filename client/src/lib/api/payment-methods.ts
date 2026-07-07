import { client } from './client';
import { extractApiError } from '@/lib/errors';

export async function getPaymentMethods() {
    try {
        const response = await client.get('/payment-methods');
        return response.data;
    } catch (error) {
        console.error('Failed to get payment methods', error);
        throw extractApiError(error);
    }
}

export async function addPaymentMethod(paymentMethodId: string) {
    try {
        const response = await client.post('/payment-methods', { payment_method_id: paymentMethodId });
        return response.data;
    } catch (error) {
        console.error('Failed to add payment method', error);
        throw extractApiError(error);
    }
}

export async function removePaymentMethod(paymentMethodId: string) {
    try {
        const response = await client.delete(`/payment-methods/${paymentMethodId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to remove payment method', error);
        throw extractApiError(error);
    }
}

export async function setDefaultPaymentMethod(paymentMethodId: string) {
    try {
        const response = await client.post(`/payment-methods/${paymentMethodId}/default`);
        return response.data;
    } catch (error) {
        console.error('Failed to set default payment method', error);
        throw extractApiError(error);
    }
}

export async function createSetupIntent() {
    try {
        const response = await client.post('/payment-methods/setup-intent');
        return response.data;
    } catch (error) {
        console.error('Failed to create setup intent', error);
        throw extractApiError(error);
    }
}
