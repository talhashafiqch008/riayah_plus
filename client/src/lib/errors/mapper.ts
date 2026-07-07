import { ApiError } from '../errors';
import { DomainError, BookingError, PaymentError, AuthError, DocumentError, CareNeedError, GeneralError } from './domain';

export function mapApiErrorToDomain(error: ApiError): DomainError {
  const code = (error as any).errorCode as string | undefined;
  const message = error.message;
  const status = error.statusCode ?? 500;

  switch (code) {
    case 'BOOKING_CONFLICT':
      return new BookingError(message, code, status, true);
    case 'BOOKING_PAYMENT_REQUIRED':
      return new BookingError(message, code, status, false);
    case 'PAYMENT_DECLINED':
    case 'PAYMENT_TIMEOUT':
      return new PaymentError(message, code, status, true);
    case 'AUTH_TOKEN_EXPIRED':
    case 'AUTH_2FA_REQUIRED':
    case 'AUTH_ACCOUNT_LOCKED':
      return new AuthError(message, code, status);
    case 'DOCUMENT_REJECTED':
    case 'DOCUMENT_EXPIRED':
      return new DocumentError(message, code, status);
    case 'CARE_NEED_CLOSED':
    case 'BID_ALREADY_ACCEPTED':
      return new CareNeedError(message, code, status);
    default:
      return new GeneralError(message, code ?? 'UNKNOWN', status);
  }
}
