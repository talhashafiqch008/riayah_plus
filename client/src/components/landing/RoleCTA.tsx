import { Link } from 'react-router-dom';
import { Heart, HeartHandshake, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontHeading, fontBody, fontArabic, landingContainerClass } from './tokens';
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
        'Safe, supported living at home with clinical visits, rehabilitation, and companion care.',
      ),
      href: '/register',
      image: '/landing/who-elders.jpg',
    },
    {
      icon: HeartHandshake,
      badge: t('whoWeCareFor.disability.badge', 'Disability Support'),
      title: t('whoWeCareFor.disability.title', 'People Living With Disability'),
      description: t(
        'whoWeCareFor.disability.desc',
        'Allied health, nursing, and daily support that builds independence and personal goals.',
      ),
      href: '/register',
      image: '/landing/who-clinician.jpg',
    },
    {
      icon: Heart,
      badge: t('whoWeCareFor.families.badge', 'Family First'),
      title: t('whoWeCareFor.families.title', 'Families & Caregivers'),
      description: t(
        'whoWeCareFor.families.desc',
        'One coordinator, one schedule, and clear updates so families stay informed without the chase.',
      ),
      href: '/register',
      image: '/landing/who-family.jpg',
    },
  ];

  return (
    <section
      id="who-we-care-for"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ background: L.paper }}
    >
      <div className={landingContainerClass}>
        <SectionReveal className="mb-12 max-w-2xl text-start sm:mb-14">
          <h2
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(1.85rem, 3.5vw, 2.6rem)',
              letterSpacing: isRTL ? 'normal' : '-0.03em',
              lineHeight: isRTL ? 1.4 : 1.15,
              color: L.ink,
            }}
          >
            {t('whoWeCareFor.title', 'Care built for every stage and ability')}
          </h2>
          <p
            className="mt-3 text-[1.02rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.75 : 1.65,
            }}
          >
            {t(
              'whoWeCareFor.subtitle',
              'Simple pathways for older adults, people living with disability, and the families who support them.',
            )}
          </p>
        </SectionReveal>

        <Stagger className="grid gap-5 md:grid-cols-3 md:gap-6">
          {cohorts.map(({ icon: Icon, badge, title, description, href, image }) => (
            <StaggerItem key={title}>
              <Link
                to={href}
                className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white/90 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
                style={{
                  boxShadow: L.shadowSoft,
                  border: `1px solid ${L.lineSoft}`,
                }}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={image}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span
                    className="absolute start-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold backdrop-blur-sm"
                    style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {badge}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: L.sky, color: L.sea }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3
                    className="mb-2 text-lg font-bold"
                    style={{
                      color: L.ink,
                      fontFamily: isRTL ? fontArabic : fontHeading,
                      letterSpacing: isRTL ? 'normal' : '-0.02em',
                      lineHeight: isRTL ? 1.4 : 1.25,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    className="mb-5 flex-1 text-sm"
                    style={{
                      color: L.fog,
                      fontFamily: isRTL ? fontArabic : fontBody,
                      lineHeight: isRTL ? 1.7 : 1.55,
                    }}
                  >
                    {description}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {isRTL ? 'اعرف المزيد' : 'Learn more'}
                    <ArrowRight className="h-3.5 w-3.5 rtl-flip transition-transform group-hover:translate-x-0.5" aria-hidden />
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

export const RoleCTA = WhoWeCareFor;
