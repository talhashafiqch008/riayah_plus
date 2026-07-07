import { describe, it, expect } from 'vitest';
import { mapApiErrorToDomain } from '../mapper';
import { BookingError, PaymentError, AuthError, DocumentError, CareNeedError, GeneralError } from '../domain';
import { ApiError } from '../../errors';

function createApiError(message: string, errorCode: string | undefined, statusCode: number): ApiError {
  const error = new ApiError(message, undefined, statusCode);
  (error as any).errorCode = errorCode;
  return error;
}

describe('mapApiErrorToDomain', () => {
  it('maps BOOKING_CONFLICT to BookingError with retryable=true', () => {
    const error = createApiError('Slot unavailable', 'BOOKING_CONFLICT', 409);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(BookingError);
    expect(result.domain).toBe('booking');
    expect(result.code).toBe('BOOKING_CONFLICT');
    expect(result.message).toBe('Slot unavailable');
    expect(result.statusCode).toBe(409);
    expect(result.isRetryable).toBe(true);
  });

  it('maps BOOKING_PAYMENT_REQUIRED to BookingError with retryable=false', () => {
    const error = createApiError('Payment required', 'BOOKING_PAYMENT_REQUIRED', 402);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(BookingError);
    expect(result.domain).toBe('booking');
    expect(result.code).toBe('BOOKING_PAYMENT_REQUIRED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps PAYMENT_DECLINED to PaymentError preserving original code', () => {
    const error = createApiError('Card declined', 'PAYMENT_DECLINED', 402);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(PaymentError);
    expect(result.domain).toBe('payment');
    expect(result.code).toBe('PAYMENT_DECLINED');
    expect(result.isRetryable).toBe(true);
  });

  it('maps PAYMENT_TIMEOUT to PaymentError preserving original code', () => {
    const error = createApiError('Payment timeout', 'PAYMENT_TIMEOUT', 504);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(PaymentError);
    expect(result.domain).toBe('payment');
    expect(result.code).toBe('PAYMENT_TIMEOUT');
    expect(result.isRetryable).toBe(true);
  });

  it('maps AUTH_TOKEN_EXPIRED to AuthError with redirect', () => {
    const error = createApiError('Token expired', 'AUTH_TOKEN_EXPIRED', 401);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(AuthError);
    expect(result.domain).toBe('auth');
    expect(result.code).toBe('AUTH_TOKEN_EXPIRED');
    expect(result.shouldRedirect).toBe('/login');
    expect(result.isRetryable).toBe(false);
  });

  it('maps AUTH_2FA_REQUIRED to AuthError', () => {
    const error = createApiError('2FA required', 'AUTH_2FA_REQUIRED', 401);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(AuthError);
    expect(result.domain).toBe('auth');
    expect(result.code).toBe('AUTH_2FA_REQUIRED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps AUTH_ACCOUNT_LOCKED to AuthError', () => {
    const error = createApiError('Account locked', 'AUTH_ACCOUNT_LOCKED', 403);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(AuthError);
    expect(result.domain).toBe('auth');
    expect(result.code).toBe('AUTH_ACCOUNT_LOCKED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps DOCUMENT_REJECTED to DocumentError preserving original code', () => {
    const error = createApiError('Document rejected', 'DOCUMENT_REJECTED', 422);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(DocumentError);
    expect(result.domain).toBe('document');
    expect(result.code).toBe('DOCUMENT_REJECTED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps DOCUMENT_EXPIRED to DocumentError preserving original code', () => {
    const error = createApiError('Document expired', 'DOCUMENT_EXPIRED', 422);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(DocumentError);
    expect(result.domain).toBe('document');
    expect(result.code).toBe('DOCUMENT_EXPIRED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps CARE_NEED_CLOSED to CareNeedError', () => {
    const error = createApiError('Care need is closed', 'CARE_NEED_CLOSED', 422);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(CareNeedError);
    expect(result.domain).toBe('care_need');
    expect(result.code).toBe('CARE_NEED_CLOSED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps BID_ALREADY_ACCEPTED to CareNeedError', () => {
    const error = createApiError('Bid already accepted', 'BID_ALREADY_ACCEPTED', 422);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(CareNeedError);
    expect(result.domain).toBe('care_need');
    expect(result.code).toBe('BID_ALREADY_ACCEPTED');
    expect(result.isRetryable).toBe(false);
  });

  it('maps unknown errorCode to GeneralError preserving original code', () => {
    const error = createApiError('Unknown error', 'SOMETHING_WEIRD', 500);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(GeneralError);
    expect(result.domain).toBe('general');
    expect(result.code).toBe('SOMETHING_WEIRD');
    expect(result.isRetryable).toBe(false);
  });

  it('maps undefined errorCode to GeneralError with UNKNOWN', () => {
    const error = createApiError('No code', undefined, 500);
    const result = mapApiErrorToDomain(error);

    expect(result).toBeInstanceOf(GeneralError);
    expect(result.domain).toBe('general');
    expect(result.code).toBe('UNKNOWN');
    expect(result.statusCode).toBe(500);
  });
});
