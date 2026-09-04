import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { L, fontBody, fontHeading, fontArabic } from './tokens';
import { SectionReveal } from './motion';
import { LanguageSwitcher } from './LanguageSwitcher';

export function LandingFooter() {
  const { t } = useTranslation('landing');
  const { isRTL } = useI18n();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const formatHref = (href: string) => {
    if (href.startsWith('#')) {
      return isHomePage ? href : `/${href}`;
    }
    return href;
  };

  const linkGroups = [
    {
      title: t('footer.groups.care', 'Care Services'),
      items: [
        { label: t('footer.links.disabilityCare', 'Disability Care'), href: formatHref('#who-we-care-for') },
        { label: t('footer.links.agedCare', 'Aged Care'), href: formatHref('#who-we-care-for') },
        { label: t('footer.links.careCoordination', 'Care Coordination'), href: formatHref('#coordinator') },
        { label: t('footer.links.alliedHealth', 'Allied Health'), href: formatHref('#services') },
      ],
    },
    {
      title: t('footer.groups.company', 'About Riayah'),
      items: [
        { label: t('footer.links.aboutUs', 'About Us'), href: '/about' },
        { label: t('footer.links.knowledgeHub', 'Knowledge Hub'), href: '/blog' },
        { label: t('footer.links.howItWorks', 'How It Works'), href: formatHref('#how-it-works') },
        { label: t('footer.links.carePlan', 'The Care Plan'), href: formatHref('#care-plan') },
        { label: t('footer.links.careers', 'Careers'), href: '/register' },
      ],
    },
    {
      title: t('footer.groups.legal', 'Legal & Support'),
      items: [
        { label: t('footer.links.contact', 'Contact Us'), href: formatHref('#faq') },
        { label: t('footer.links.faq', 'FAQ'), href: formatHref('#faq') },
        { label: t('footer.links.privacy', 'Privacy Policy'), href: '/privacy' },
        { label: t('footer.links.terms', 'Terms of Service'), href: '/terms' },
        { label: t('footer.links.complaints', 'Complaints & Feedback'), href: '/privacy' },
      ],
    },
  ];

  return (
    <footer style={{ background: L.deep, color: '#F0F7F6' }}>
      <SectionReveal className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="mb-12 grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="mb-4 inline-flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
              />
              <span className="flex flex-col leading-none">
                <span
                  className="text-[15px] font-bold tracking-tight"
                  style={{ color: '#F0F7F6', fontFamily: fontHeading }}
                >
                  Riayah Plus
                </span>
                <span
                  className="mt-0.5 text-[10px] font-medium"
                  style={{ color: 'rgba(240,247,246,0.45)', fontFamily: fontArabic }}
                  lang="ar"
                >
                  رعاية بلس
                </span>
              </span>
            </Link>
            <p
              className="mt-4 max-w-[16rem] text-sm leading-relaxed"
              style={{
                color: 'rgba(240,247,246,0.6)',
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.7 : 1.6,
              }}
            >
              {t(
                'footer.description',
                'Specialized disability and aged care built around your family: individualized care plans, dedicated coordination, and compassionate support.'
              )}
            </p>
            <div className="mt-5">
              <LanguageSwitcher variant="footer" />
            </div>
          </div>

          {linkGroups.map(({ title, items }) => (
            <div key={title}>
              <h4
                className={`mb-4 text-[10px] font-bold uppercase ${
                  isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
                }`}
                style={{
                  color: 'rgba(240,247,246,0.5)',
                  fontFamily: isRTL ? fontArabic : fontBody,
                }}
              >
                {title}
              </h4>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith('#') ? (
                      <a
                        href={href}
                        className="text-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
                        style={{
                          color: 'rgba(240,247,246,0.72)',
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.5 : 1.3,
                          borderRadius: 4,
                        }}
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        to={href}
                        className="text-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
                        style={{
                          color: 'rgba(240,247,246,0.72)',
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.5 : 1.3,
                          borderRadius: 4,
                        }}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col items-start justify-between gap-3 pt-8 sm:flex-row sm:items-center"
          style={{ borderTop: '1px solid rgba(240,247,246,0.1)' }}
        >
          <p
            className="text-xs"
            style={{ color: 'rgba(240,247,246,0.48)', fontFamily: isRTL ? fontArabic : fontBody }}
          >
            &copy; {new Date().getFullYear()} Riayah Plus. {t('footer.rights', 'All rights reserved.')}
          </p>
          <p
            className="text-xs"
            style={{ color: 'rgba(240,247,246,0.42)', fontFamily: isRTL ? fontArabic : fontBody }}
          >
            {t('footer.tagline', 'Specialized Care. Built Around Your Family.')}
          </p>
        </div>
      </SectionReveal>
    </footer>
  );
}
