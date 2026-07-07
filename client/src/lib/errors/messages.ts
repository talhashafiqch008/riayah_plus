/**
 * User-friendly error messages for backend error codes
 */

export const errorMessages: Record<string, string> = {
  // Payment errors
  'card_declined': 'Your card was declined. Please try a different payment method.',
  'insufficient_funds': 'Insufficient funds. Please check your account balance.',
  'incorrect_cvc': 'Your card security code is incorrect. Please check and try again.',
  'expired_card': 'Your card has expired. Please use a different card.',
  'processing_error': 'An error occurred while processing your card. Please try again.',
  'incorrect_number': 'Your card number is incorrect. Please check and try again.',
  'network_error': 'Connection issue. Please check your internet and try again.',
  'validation_error': 'Please check your input and try again.',
  
  // Auth errors
  'invalid_credentials': 'Invalid email or password. Please try again.',
  'account_locked': 'Your account has been locked. Please contact support.',
  'session_expired': 'Your session has expired. Please log in again.',
  'unauthorized': 'You are not authorized to perform this action.',
  
  // Booking errors
  'booking_not_found': 'Booking not found. Please check the booking ID.',
  'booking_cancelled': 'This booking has already been cancelled.',
  'provider_unavailable': 'The provider is no longer available for this time slot.',
  
  // Payout errors
  'payout_pending': 'You already have a pending payout request.',
  'minimum_payout': 'Minimum payout amount is QAR 100.',
  'invalid_bank_details': 'Please check your bank account details.',
  
  // Refund/Dispute errors
  'refund_period_expired': 'The refund period for this booking has expired.',
  'already_refunded': 'This booking has already been refunded.',
  'dispute_exists': 'A dispute already exists for this booking.',
  
  'payment_processing': 'Payment is being processed. You will be notified when complete.',
  'refund_processing': 'Refund is being processed. You will be notified when complete.',
  'topup_processing': 'Credit topup is being processed. You will be notified when complete.',
  'email_processing': 'Email verification is being sent. Please check your inbox.',
  'processing_failed': 'Processing failed. Please try again or contact support.',
  'queue_full': 'System is busy. Please try again in a moment.',
  
  // Network/General
  'timeout': 'Request timed out. Please try again.',
  'server_error': 'Something went wrong. Please try again later.',
  'maintenance': 'System is under maintenance. Please try again later.',
};

export function getErrorMessage(code: string | undefined, fallback?: string): string {
  if (!code) return fallback || 'Something went wrong. Please try again.';
  return errorMessages[code] || fallback || 'Something went wrong. Please try again.';
}

export function getPaymentErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }
  if (error.message) return error.message;
  return 'Payment failed. Please try again or contact support.';
}
