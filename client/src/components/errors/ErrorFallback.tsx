
import { DomainError } from '@/lib/errors/domain';

interface ErrorFallbackProps {
 error: DomainError;
 onRetry?: () => void;
 onDismiss?: () => void;
}

export function ErrorFallback({ error, onRetry, onDismiss }: ErrorFallbackProps) {
 const isRetryable = error.isRetryable;
 const shouldRedirect = error.shouldRedirect;

 if (shouldRedirect && typeof window !== 'undefined') {
 window.location.href = shouldRedirect;
 return null;
 }

 return (
 <div className="rounded-lg border border-red-200 bg-red-50 p-4">
 <h3 className="text-sm font-semibold text-red-800">
 {error.domain === 'booking' && 'Booking Error'}
 {error.domain === 'payment' && 'Payment Error'}
 {error.domain === 'auth' && 'Authentication Error'}
 {error.domain === 'document' && 'Document Error'}
 {error.domain === 'general' && 'Error'}
 </h3>
 <p className="mt-1 text-sm text-red-700">{error.message}</p>
 {isRetryable && onRetry && (
 <button
 onClick={onRetry}
 className="mt-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
 >
 Try Again
 </button>
 )}
 {onDismiss && (
 <button onClick={onDismiss} className="ml-2 mt-3 text-sm text-red-600 hover:underline">
 Dismiss
 </button>
 )}
 </div>
 );
}
