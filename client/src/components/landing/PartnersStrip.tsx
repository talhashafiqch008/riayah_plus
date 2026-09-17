import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

interface PartnersStripProps {
  className?: string;
  variant?: 'card' | 'flat';
}

export function PartnersStrip({ className = '' }: PartnersStripProps) {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const partners = [
    {
      id: 'carestride',
      name: t('partners.carestride.name', 'CareStride Australia'),
      desc: t('partners.carestride.desc', 'Disability & Aged Care'),
      logo: '/landing/partners/carestride.png',
      alt: 'CareStride Australia',
      logoHeight: 'h-9 sm:h-11',
    },
    {
      id: 'uniqueSupport',
      name: t('partners.uniqueSupport.name', 'Unique Individual Support'),
      desc: t('partners.uniqueSupport.desc', 'Specialized In-Home Care'),
      logo: '/landing/partners/unique-support.png',
      alt: 'Unique Individual Support',
      logoHeight: 'h-10 sm:h-12',
    },
    {
      id: 'myndic',
      name: t('partners.myndic.name', 'MyNDIC Australia'),
      desc: t('partners.myndic.desc', 'NDIS & Person-Centered Systems'),
      logo: '/landing/partners/myndic.png',
      alt: 'MyNDIC Australia',
      logoHeight: 'h-9 sm:h-11',
    },
  ];

  return (
    <section
      className={`relative overflow-hidden py-16 sm:py-20 ${className}`}
      style={{
        background: `linear-gradient(180deg, ${L.paper} 0%, ${L.paper} 40%, ${L.ice} 100%)`,
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%]"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 60% 70% at 50% 100%, ${L.aqua}40 0%, transparent 70%)`,
        }}
      />

      <div className={`${landingContainerClass} z-10`}>
        <SectionReveal className="mb-10 max-w-xl text-center mx-auto">
          <h2
            className="mb-2"
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.35rem, 2.5vw, 1.75rem)',
              letterSpacing: isRTL ? 'normal' : '-0.02em',
              lineHeight: isRTL ? 1.4 : 1.25,
              color: L.ink,
            }}
          >
            {t('partners.titleShort', 'Built with Australian care partners')}
          </h2>
          <p
            className="text-sm sm:text-[0.95rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.7 : 1.55,
            }}
          >
            {t(
              'partners.subtitleShort',
              'Proven models adapted for families across our region.',
            )}
          </p>
        </SectionReveal>

        <Stagger className="grid gap-4 sm:grid-cols-3">
          {partners.map((partner) => (
            <StaggerItem key={partner.id}>
              <div
                className="flex h-full flex-col items-center justify-center rounded-2xl bg-white px-5 py-6 text-center"
                style={{ border: `1px solid ${L.lineSoft}`, boxShadow: L.shadowSoft }}
              >
                <img
                  src={partner.logo}
                  alt={partner.alt}
                  className={`max-w-full ${partner.logoHeight} object-contain`}
                />
                <p
                  className="mt-4 text-sm font-bold"
                  style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontHeading }}
                >
                  {partner.name}
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {partner.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
