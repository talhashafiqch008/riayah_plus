import { ApiError } from './base';

export abstract class DomainError extends ApiError {
  public readonly domain: string;
  public readonly code: string;
  public readonly isRetryable: boolean;
  public readonly shouldRedirect?: string;

  constructor(
    message: string,
    domain: string,
    code: string,
    statusCode: number,
    isRetryable: boolean,
    options?: { shouldRedirect?: string; fieldErrors?: Record<string, string[]> }
  ) {
    super(message, options?.fieldErrors, statusCode);
    this.domain = domain;
    this.code = code;
    this.isRetryable = isRetryable;
    this.shouldRedirect = options?.shouldRedirect;
  }
}

export class BookingError extends DomainError {
  constructor(message: string, code: string, statusCode: number, isRetryable = false) {
    super(message, 'booking', code, statusCode, isRetryable);
  }
}

export class PaymentError extends DomainError {
  constructor(message: string, code: string, statusCode: number, isRetryable = true) {
    super(message, 'payment', code, statusCode, isRetryable);
  }
}

export class AuthError extends DomainError {
  constructor(message: string, code: string, statusCode: number, isRetryable = false) {
    super(message, 'auth', code, statusCode, isRetryable, {
      shouldRedirect: code === 'AUTH_TOKEN_EXPIRED' ? '/login' : undefined,
    });
  }
}

export class DocumentError extends DomainError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, 'document', code, statusCode, false);
  }
}

export class CareNeedError extends DomainError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, 'care_need', code, statusCode, false);
  }
}

export class GeneralError extends DomainError {
  constructor(message: string, code: string, statusCode: number) {
    super(message, 'general', code, statusCode, false);
  }
}
