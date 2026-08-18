import { apiErrorMessage } from './format';

export type AppToast = {
  show: (message: string, options?: { type?: string; duration?: number }) => void;
};

/** Danger toast with the parsed API / network error — never a generic Axios status line. */
export function toastError(toast: AppToast, error: unknown, fallback?: string) {
  toast.show(apiErrorMessage(error, fallback), { type: 'danger' });
}
