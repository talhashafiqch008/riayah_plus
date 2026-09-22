import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/lib/api/auth';
import { isApiError } from '@/lib/errors';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (error: unknown) {
      if (isApiError(error)) {
        toast.error(error.message || t('webForgot.sendFailed'));
      } else {
        toast.error(t('webForgot.sendFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
            <div className="mx-auto mb-4 size-16 rounded-full bg-teal-100 flex items-center justify-center">
              <Mail className="size-8 text-teal-600" />
            </div>
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">{t('webForgot.sentTitle')}</h2>
            <p className="text-stone-600 mb-6">{t('webForgot.sentBody', { email })}</p>
            <Link
              to="/careseeker/login"
              className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium"
            >
              <ArrowLeft className="mr-2 size-4" />
              {t('webForgot.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-stone-900 mb-2">{t('webForgot.title')}</h1>
          <p className="text-stone-600">{t('webForgot.subtitle')}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                {t('webForgot.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-4 py-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                placeholder={t('webForgot.emailPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {loading ? t('webForgot.submitting') : t('webForgot.submit')}
            </button>

            <div className="text-center">
              <Link
                to="/careseeker/login"
                className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <ArrowLeft className="mr-2 size-4" />
                {t('webForgot.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
