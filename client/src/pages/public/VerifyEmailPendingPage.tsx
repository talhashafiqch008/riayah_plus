import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { resendVerificationEmail } from '@/lib/api/auth';
import { isApiError } from '@/lib/errors';

export default function VerifyEmailPendingPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error(t('verifyPending.noEmail'));
      return;
    }

    setResending(true);
    try {
      await resendVerificationEmail(email);
      setResent(true);
      toast.success(t('verifyPending.emailSentToast'));
    } catch (error: unknown) {
      if (isApiError(error)) {
        toast.error(error.message || t('verifyPending.emailResendFailed'));
      } else {
        toast.error(t('verifyPending.emailResendFailed'));
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 size-16 rounded-full bg-teal-100 flex items-center justify-center">
            <Mail className="size-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-stone-900 mb-2">{t('verifyPending.checkEmail')}</h2>
          <p className="text-stone-600 mb-2">{t('verifyPending.sentEmailLead')}</p>
          {email ? (
            <p className="font-medium text-stone-900 mb-6">{email}</p>
          ) : (
            <p className="text-stone-500 mb-6">{t('verifyPending.sentEmailFallback')}</p>
          )}
          <p className="text-sm text-stone-500 mb-6">{t('verifyPending.sentEmailHint')}</p>

          {email && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mb-6 inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${resending ? 'animate-spin' : ''}`} />
              {resent ? t('verifyPending.sendAgain') : t('verifyPending.resendEmail')}
            </button>
          )}

          <Link
            to="/careseeker/login"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium"
          >
            <ArrowLeft className="mr-2 size-4" />
            {t('verifyPending.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
