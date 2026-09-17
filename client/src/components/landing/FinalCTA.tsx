import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { LandingButton } from './LandingButton';
import { SectionReveal } from './motion';

export function FinalCTA() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  return (
    <section className="py-20 sm:py-24" style={{ background: L.paper }}>
      <div className={landingContainerClass}>
        <SectionReveal>
          <div
            className="flex flex-col items-start justify-between gap-8 rounded-[1.75rem] bg-white px-6 py-10 sm:px-10 lg:flex-row lg:items-center"
            style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadow }}
          >
            <div className="max-w-xl text-start">
              <h2
                className="mb-3"
                style={{
                  fontFamily: isRTL ? fontArabic : fontHeading,
                  fontWeight: 800,
                  fontSize: 'clamp(1.75rem, 3.4vw, 2.35rem)',
                  letterSpacing: isRTL ? 'normal' : '-0.03em',
                  color: L.ink,
                  lineHeight: isRTL ? 1.4 : 1.15,
                }}
              >
                {t('finalCta.titleShort', 'Ready to start coordinated care?')}
              </h2>
              <p
                style={{
                  color: L.fog,
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.75 : 1.6,
                }}
              >
                {t(
                  'finalCta.subtitleShort',
                  'Book a free consultation. A Care Coordinator will take it from there.',
                )}
              </p>
            </div>
            <LandingButton
              to="/register"
              variant="solid"
              fill="none"
              className="min-h-12 px-8 text-[15px]"
              style={{ background: L.ink, borderColor: L.ink }}
            >
              {t('finalCta.button', 'Get started')}
              <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden />
            </LandingButton>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
