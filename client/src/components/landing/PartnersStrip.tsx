import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { fontHeading, fontBody, fontArabic } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

interface PartnersStripProps {
  className?: string;
  variant?: 'card' | 'flat';
}

export function PartnersStrip({ className = '', variant = 'card' }: PartnersStripProps) {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const partners = [
    {
      id: 'carestride',
      name: t('partners.carestride.name', 'CareStride Australia'),
      desc: t('partners.carestride.desc', 'Disability & Aged Care'),
      logo: '/landing/partners/carestride.png',
      alt: 'CareStride Australia',
      logoHeight: 'h-10 sm:h-12',
    },
    {
      id: 'uniqueSupport',
      name: t('partners.uniqueSupport.name', 'Unique Individual Support'),
      desc: t('partners.uniqueSupport.desc', 'Specialized In-Home Care'),
      logo: '/landing/partners/unique-support.png',
      alt: 'Unique Individual Support',
      logoHeight: 'h-11 sm:h-14',
    },
    {
      id: 'myndic',
      name: t('partners.myndic.name', 'MyNDIC Australia'),
      desc: t('partners.myndic.desc', 'NDIS & Person-Centered Systems'),
      logo: '/landing/partners/myndic.png',
      alt: 'MyNDIC Australia',
      logoHeight: 'h-10 sm:h-12',
    },
  ];

  return (
    <section className={`py-14 sm:py-18 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div
            className={`overflow-hidden rounded-3xl ${
              variant === 'card'
                ? 'border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/70 p-7 sm:p-10 shadow-sm'
                : 'border-y border-slate-200/70 bg-transparent py-8'
            }`}
          >
            {/* Header / Eyebrow */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <span
                className="inline-block text-xs font-bold uppercase tracking-widest text-teal-700 mb-2"
                style={{
                  fontFamily: isRTL ? fontArabic : fontHeading,
                  letterSpacing: isRTL ? 'normal' : '0.12em',
                }}
              >
                {t('partners.eyebrow', 'Our Australian Experience & Partners')}
              </span>
              <h3
                className="text-xl sm:text-2xl font-bold text-slate-900"
                style={{
                  fontFamily: isRTL ? fontArabic : fontHeading,
                  lineHeight: isRTL ? 1.4 : 1.25,
                }}
              >
                {t(
                  'partners.title',
                  'Built on proven Australian care models, adapted for our region'
                )}
              </h3>
            </div>

            {/* 3 Clean Partner Cards */}
            <Stagger className="grid gap-6 sm:grid-cols-3">
              {partners.map((partner) => (
                <StaggerItem key={partner.id} className="h-full">
                  <div className="group flex h-full flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-md">
                    {/* Logo Container */}
                    <div className="flex h-20 w-full items-center justify-center p-2">
                      <img
                        src={partner.logo}
                        alt={partner.alt}
                        className={`max-w-full ${partner.logoHeight} object-contain transition-transform duration-300 group-hover:scale-105`}
                      />
                    </div>

                    {/* Text Details */}
                    <div className="mt-4 w-full border-t border-slate-100 pt-3">
                      <p
                        className="text-sm font-bold text-slate-900"
                        style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
                      >
                        {partner.name}
                      </p>
                      <p
                        className="mt-0.5 text-xs text-slate-500"
                        style={{ fontFamily: isRTL ? fontArabic : fontBody }}
                      >
                        {partner.desc}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
