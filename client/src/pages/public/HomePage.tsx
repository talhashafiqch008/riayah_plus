import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { PartnersStrip } from '@/components/landing/PartnersStrip';
import { WhoWeCareFor } from '@/components/landing/RoleCTA';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CarePlan } from '@/components/landing/CarePlan';
import { Features } from '@/components/landing/Features';
import { CareCoordinator } from '@/components/landing/CareCoordinator';
import { FamilyExperience } from '@/components/landing/WhyChooseUs';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { fontBody, fontArabic } from '@/components/landing/tokens';

export default function HomePage() {
  const { t } = useTranslation('common');
  const { isRTL } = useI18n();

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-clip"
      style={{ fontFamily: isRTL ? fontArabic : fontBody, background: '#FFFFFF' }}
      tabIndex={-1}
    >
      <a
        href="#how-it-works"
        className="absolute start-3 top-3 z-[60] -translate-y-[200%] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] outline outline-2 outline-[#14B8A6] focus:translate-y-0"
      >
        {isRTL ? 'الانتقال إلى المحتوى' : 'Skip to content'}
      </a>
      {/* 1. Navigation */}
      <Navbar />
      {/* 2. Hero & 3. Trust Strip */}
      <Hero />
      {/* 4. Who We Care For */}
      <WhoWeCareFor />
      {/* 5. How Riayah Works (4 steps) */}
      <HowItWorks />
      {/* 6. The Riayah Care Plan */}
      <CarePlan />
      {/* 7. Our Services (7 Specialized Services) */}
      <Features />
      {/* 8. The Care Coordinator */}
      <CareCoordinator />
      {/* 9. Family Experience */}
      <FamilyExperience />
      {/* 10. Real Family Stories */}
      <Testimonials />
      {/* 11. FAQ */}
      <FAQ />
      {/* 11.5 Australian Experience & Partners */}
      <PartnersStrip className="py-16 sm:py-20" />
      {/* 12. Final CTA */}
      <FinalCTA />
      {/* 13. Footer */}
      <LandingFooter />
    </main>
  );
}
