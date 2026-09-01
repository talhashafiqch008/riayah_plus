import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic } from './tokens';
import { LandingButton } from './LandingButton';
import { SectionReveal } from './motion';

export function FinalCTA() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  return (
    <section className="relative overflow-hidden py-20 sm:py-24" style={{ background: L.sea }}>
      <div
        className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full opacity-20"
        style={{ background: '#fff' }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <SectionReveal>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl text-start">
              <h2
                className="mb-3"
                style={{
                  fontFamily: isRTL ? fontArabic : fontHeading,
                  fontWeight: 800,
                  fontSize: 'clamp(1.75rem, 3.4vw, 2.45rem)',
                  letterSpacing: isRTL ? 'normal' : '-0.03em',
                  color: '#fff',
                  lineHeight: isRTL ? 1.45 : 1.2,
                }}
              >
                {t('finalCta.title', 'Take the first step to better care')}
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.75 : 1.6,
                  letterSpacing: isRTL ? 'normal' : undefined,
                }}
              >
                {t(
                  'finalCta.subtitle',
                  'It only takes a few minutes to open an intake. A coordinator picks it up from there.'
                )}
              </p>
            </div>
            <LandingButton
              to="/register"
              variant="on-dark"
              fill="left"
              className="min-h-12 px-8 text-[15px]"
            >
              {t('finalCta.button', 'Book an Appointment')}
              <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
            </LandingButton>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
