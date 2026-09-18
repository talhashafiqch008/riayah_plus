import { m } from "framer-motion";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Shield, Loader2, ArrowLeft, Sparkles, CheckSquare, Square } from "lucide-react";

interface StepConsentProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
  isLoggedIn?: boolean;
  variant?: 'careseeker' | 'family';
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const CONSENT_META = [
  {
    id: 'independentProviderAcknowledged',
    i18nKey: 'independent' as const,
    required: true,
    icon: '🤝',
  },
  {
    id: 'termsAccepted',
    i18nKey: 'terms' as const,
    required: true,
    icon: '📋',
  },
  {
    id: 'marketingConsentGranted',
    i18nKey: 'marketing' as const,
    required: false,
    icon: '💌',
  },
];

const DATA_BADGES = [
  { i18nKey: 'encrypted' as const, icon: '🔐' },
  { i18nKey: 'withdraw' as const, icon: '✓' },
  { i18nKey: 'controlAccess' as const, icon: '👁️' },
  { i18nKey: 'pdpl' as const, icon: '🛡️' },
];

export default function StepConsent({ data, onUpdate, onSubmit, onBack, isSubmitting, isLoggedIn, variant = 'careseeker' }: StepConsentProps) {
  const { t } = useTranslation('family');
  const isValid = data.independentProviderAcknowledged && data.termsAccepted;
  const isFamily = variant === 'family';

  const categoryLabelsEn: Record<string, string> = {
    aged_care: 'Home Care',
    disability_support: 'Disability',
    child_family: 'Babysitting',
    allied_health: 'Therapy',
    home_support: 'Home Visit',
  };

  const categories = Array.isArray(data.careCategories)
    ? (data.careCategories as string[]).map((c) =>
        isFamily
          ? t(`onboarding.categories.${c}.label`, { defaultValue: categoryLabelsEn[c] ?? c })
          : categoryLabelsEn[c] ?? c,
      )
    : [];

  const roleLabelEn =
    data.careRecipientType === 'family_member'
      ? 'Family Guardian'
      : data.careRecipientType === 'myself'
        ? 'Individual'
        : data.careRecipientType === 'support_coordinator'
          ? 'Support Coordinator'
          : null;

  const roleLabel =
    isFamily && data.careRecipientType === 'family_member'
      ? t('onboarding.accounts.family_member.title')
      : isFamily && data.careRecipientType === 'myself'
        ? t('onboarding.accounts.myself.title')
        : roleLabelEn;

  const scheduleLabel =
    typeof data.scheduleType === 'string' && data.scheduleType
      ? isFamily
        ? t(`enums.schedule.${data.scheduleType}`, {
            defaultValue: String(data.scheduleType).replace(/_/g, ' '),
          })
        : String(data.scheduleType).replace(/_/g, ' ')
      : null;

  const countryDisplay =
    typeof data.country === 'string' && data.country
      ? isFamily
        ? t(`onboarding.countries.${data.country}`, { defaultValue: String(data.country) })
        : String(data.country)
      : null;

  const consents = CONSENT_META.map((meta) => ({
    ...meta,
    title: isFamily
      ? t(`onboarding.consent.${meta.i18nKey}.title`)
      : meta.i18nKey === 'independent'
        ? 'Independent Providers'
        : meta.i18nKey === 'terms'
          ? 'Terms & Privacy'
          : 'Updates & Tips',
    description: isFamily
      ? t(`onboarding.consent.${meta.i18nKey}.description`)
      : meta.i18nKey === 'independent'
        ? 'I understand providers on Raiyah Plus operate independently. Raiyah Plus connects you with providers but does not employ them.'
        : meta.i18nKey === 'terms'
          ? 'I agree to the Terms of Service and Privacy Policy.'
          : 'Send me helpful care tips and provider updates. (Optional)',
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <m.div {...fadeIn}>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-12 bg-teal-100 rounded-2xl flex items-center justify-center rotate-3">
            <Sparkles className="size-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-stone-900 leading-none">
              {isFamily ? t('onboarding.stepTitles.review') : 'Review & Confirm'}
            </h2>
            <p className="text-stone-500 mt-1">
              {isFamily
                ? t('onboarding.reviewHint')
                : 'Please review and accept the terms to finish.'}
            </p>
          </div>
        </div>
      </m.div>

      {isFamily && (
        <m.div {...fadeIn} transition={{ delay: 0.05 }} className="p-5 rounded-[24px] bg-teal-50/80 border border-teal-100">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
            {t('onboarding.requestSummary')}
          </p>
          <ul className="text-sm text-stone-700 space-y-1">
            {roleLabel && (
              <li>
                {t('onboarding.accountLabel')}: <span className="font-semibold">{roleLabel}</span>
              </li>
            )}
            {countryDisplay && (
              <li>
                {t('onboarding.locationLabel')}:{' '}
                <span className="font-semibold">{countryDisplay}</span>
              </li>
            )}
            {categories.length > 0 && (
              <li>
                {t('onboarding.supportLabel')}:{' '}
                <span className="font-semibold">{categories.join(', ')}</span>
              </li>
            )}
            {scheduleLabel && (
              <li>
                {t('onboarding.scheduleLabel')}:{' '}
                <span className="font-semibold">{scheduleLabel}</span>
              </li>
            )}
          </ul>
          <p className="text-xs text-teal-800 mt-3">{t('onboarding.afterSubmit')}</p>
        </m.div>
      )}

      {/* Consents */}
      <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-4">
        {consents.map((consent, index) => (
          <m.div
            key={consent.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            onClick={() => onUpdate({ [consent.id]: !data[consent.id] })}
            className={`group p-5 rounded-[24px] border-2 cursor-pointer transition-transform duration-300 flex items-start gap-4 ${data[consent.id] ? 'border-stone-900 bg-stone-50 shadow-[0_4px_20px_rgba(0,0,0,0.04)]' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 hover:shadow-lg'}`}
          >
            <div className={`mt-0.5 transition-colors ${data[consent.id] ? 'text-stone-900' : 'text-stone-300 group-hover:text-stone-400'}`}>
              {data[consent.id] ? (
                <CheckSquare className="size-6" strokeWidth={2.5} />
              ) : (
                <Square className="size-6" strokeWidth={2.5} />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{consent.icon}</span>
                <h3 className={`font-semibold text-base ${data[consent.id] ? 'text-stone-900' : 'text-stone-700'}`}>
                  {consent.title}
                </h3>
                {consent.required && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wide">
                    {isFamily ? t('onboarding.consent.required') : 'Required'}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">{consent.description}</p>
            </div>
          </m.div>
        ))}
      </m.div>

      {/* Data Rights */}
      <m.div {...fadeIn} transition={{ delay: 0.2 }}>
        <div className="p-5 bg-stone-50 rounded-[24px] ring-1 ring-stone-200/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-5 text-teal-600" />
            <h3 className="font-semibold text-stone-900">
              {isFamily ? t('onboarding.consent.dataProtection') : 'Your Data Protection'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 font-medium">
            {DATA_BADGES.map((item) => {
              const textEn =
                item.i18nKey === 'encrypted'
                  ? 'Encrypted & secure'
                  : item.i18nKey === 'withdraw'
                    ? 'Withdraw anytime'
                    : item.i18nKey === 'controlAccess'
                      ? 'You control access'
                      : 'PDPL compliant';
              const text = isFamily ? t(`onboarding.consent.${item.i18nKey}`) : textEn;
              return (
                <div key={item.i18nKey} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-stone-200">
                  <span>{item.icon}</span>
                  <span dir={!isFamily ? 'auto' : undefined}>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </m.div>

      {/* Terms Links */}
      <div className="flex justify-center gap-6 text-xs font-medium text-stone-400">
        <Link to="/terms" target="_blank" className="hover:text-stone-900 hover:underline transition-colors flex items-center gap-1">
          {isFamily ? t('onboarding.consent.termsOfService') : 'Terms of Service'}
        </Link>
        <Link to="/privacy" target="_blank" className="hover:text-stone-900 hover:underline transition-colors flex items-center gap-1">
          {isFamily ? t('onboarding.consent.privacyPolicy') : 'Privacy Policy'}
        </Link>
      </div>

      {/* Navigation */}
      <m.div
        {...fadeIn}
        transition={{ delay: 0.3 }}
        className="flex justify-between items-center pt-8 border-t ring-1 ring-stone-100/50"
      >
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="group flex items-center gap-2 text-stone-500 font-bold hover:text-stone-800 transition-colors px-4 py-2 rounded-xl hover:bg-stone-100 disabled:opacity-50"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          {isFamily ? t('onboarding.back') : 'Back'}
        </button>
        <m.button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          whileHover={isValid && !isSubmitting ? { scale: 1.02 } : {}}
          whileTap={isValid && !isSubmitting ? { scale: 0.98 } : {}}
          className="px-8 py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-transform duration-300 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CheckCircle className="size-5" />
              {isFamily ? t('onboarding.finishSubmit') : 'Finish & Submit'}
            </>
          )}
        </m.button>
      </m.div>
    </div>
  );
}
