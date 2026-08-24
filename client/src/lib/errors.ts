import axios from 'axios';
import { mapApiErrorToDomain } from './errors/mapper';
import { DomainError } from './errors/domain';
import { ApiError, isApiError } from './errors/base';

export { ApiError, isApiError };
export type { DomainError };

export class TwoFactorRequiredError extends Error {
  public twoFaToken: string;

  constructor(twoFaToken: string) {
    super('2FA_REQUIRED');
    this.name = 'TwoFactorRequiredError';
    this.twoFaToken = twoFaToken;
  }
}

export function isTwoFactorRequiredError(error: unknown): error is TwoFactorRequiredError {
  return error instanceof TwoFactorRequiredError;
}

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response) {
    const serverMessage = error.response.data?.message || 'Request failed';
    const fieldErrors = error.response.data?.errors;
    const statusCode = error.response.status;
    return new ApiError(serverMessage, fieldErrors, statusCode, error.response.data?.details);
  }
  if (error instanceof Error) {
    return new ApiError(error.message);
  }
  return new ApiError('An unexpected error occurred');
}

export function extractDomainError(error: unknown): DomainError {
  const apiError = extractApiError(error);
  return mapApiErrorToDomain(apiError);
}
