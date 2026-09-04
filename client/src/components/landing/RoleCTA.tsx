import { Link } from 'react-router-dom';
import { Heart, HeartHandshake, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic } from './tokens';
import { SectionReveal, Stagger, StaggerItem } from './motion';

export function WhoWeCareFor() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();

  const cohorts = [
    {
      icon: ShieldCheck,
      badge: t('whoWeCareFor.olderAdults.badge', 'Aged Care'),
      title: t('whoWeCareFor.olderAdults.title', 'Older Adults'),
      description: t(
        'whoWeCareFor.olderAdults.desc',
        'Empowering seniors to remain safe, active, and well-supported at home with clinical visits, rehabilitation, and companion care.'
      ),
      href: '/register',
      image: '/landing/who-elders.jpg',
      bg: L.iconGreen,
      color: '#059669',
    },
    {
      icon: HeartHandshake,
      badge: t('whoWeCareFor.disability.badge', 'Disability Support'),
      title: t('whoWeCareFor.disability.title', 'People Living With Disability'),
      description: t(
        'whoWeCareFor.disability.desc',
        'Goal-oriented allied health, nursing, and daily support designed to unlock independence and nurture personal growth.'
      ),
      href: '/register',
      image: '/landing/who-clinician.jpg',
      bg: L.iconTeal,
      color: L.sea,
    },
    {
      icon: Heart,
      badge: t('whoWeCareFor.families.badge', 'Family First'),
      title: t('whoWeCareFor.families.title', 'Families & Caregivers'),
      description: t(
        'whoWeCareFor.families.desc',
        'Relief and total clarity for family members with a single coordinator, unified schedule, and transparent care updates.'
      ),
      href: '/register',
      image: '/landing/who-family.jpg',
      bg: L.iconPurple,
      color: '#7C3AED',
    },
  ];

  return (
    <section id="who-we-care-for" className="py-20 sm:py-28" style={{ background: L.mist }}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionReveal className="mb-12 text-center">
          <p
            className={`mb-3 text-xs font-bold uppercase ${
              isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
            }`}
            style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {t('whoWeCareFor.eyebrow', 'Who We Care For')}
          </p>
          <h2
            className="mb-3"
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              lineHeight: isRTL ? 1.45 : 1.2,
              color: L.ink,
            }}
          >
            {t('whoWeCareFor.title', 'Tailored care for every stage and ability')}
          </h2>
          <p
            className="mx-auto max-w-2xl text-[1.02rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.75 : 1.6,
            }}
          >
            {t(
              'whoWeCareFor.subtitle',
              'We partner closely with families to deliver dependable, high-touch support that promotes dignity, comfort, and independence.'
            )}
          </p>
        </SectionReveal>

        <Stagger className="grid gap-6 md:grid-cols-3">
          {cohorts.map(({ icon: Icon, badge, title, description, href, image, bg, color }) => (
            <StaggerItem key={title}>
              <Link
                to={href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
                style={{
                  boxShadow: '0 14px 36px -20px rgba(15,23,42,0.22)',
                  border: `1px solid ${L.lineSoft}`,
                  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <div className="relative">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={image}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                    />
                  </div>
                  <span
                    className="absolute start-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-sm"
                    style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {badge}
                  </span>
                  {/* Icon sits on the image/body seam */}
                  <div
                    className="absolute bottom-0 start-5 z-10 flex h-11 w-11 translate-y-1/2 items-center justify-center rounded-xl shadow-md"
                    style={{ background: bg, color }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-5 pb-6 pt-9">
                  <h3
                    className="mb-2 text-[1.1rem] font-bold"
                    style={{
                      color: L.ink,
                      fontFamily: isRTL ? fontArabic : fontHeading,
                      letterSpacing: isRTL ? 'normal' : '-0.015em',
                      lineHeight: isRTL ? 1.4 : 1.25,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    className="mb-5 flex-1 text-xs sm:text-[13.5px]"
                    style={{
                      color: L.fog,
                      fontFamily: isRTL ? fontArabic : fontBody,
                      lineHeight: isRTL ? 1.7 : 1.55,
                    }}
                  >
                    {description}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors group-hover:text-[#0D9488]"
                    style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {isRTL ? 'اعرف المزيد والبدء' : 'Explore care options'}
                    <ArrowRight className="h-3.5 w-3.5 rtl-flip transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// Backwards compatibility export
export const RoleCTA = WhoWeCareFor;
