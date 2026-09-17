import { useI18n } from '@/components/I18nProvider';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { PartnersStrip } from '@/components/landing/PartnersStrip';
// import { WhoWeCareFor } from '@/components/landing/RoleCTA';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CarePlan } from '@/components/landing/CarePlan';
import { Features } from '@/components/landing/Features';
import { ProductOverview } from '@/components/landing/ProductOverview';
import { EnterpriseSaaS } from '@/components/landing/EnterpriseSaaS';
import { CareCoordinator } from '@/components/landing/CareCoordinator';
import { FamilyExperience } from '@/components/landing/WhyChooseUs';
import { Testimonials } from '@/components/landing/Testimonials';
import { FAQ } from '@/components/landing/FAQ';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { fontBody, fontArabic, L } from '@/components/landing/tokens';

export default function HomePage() {
  const { isRTL } = useI18n();

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-clip"
      style={{ fontFamily: isRTL ? fontArabic : fontBody, background: L.paper }}
      tabIndex={-1}
    >
      <a
        href="#how-it-works"
        className="absolute start-3 top-3 z-[60] -translate-y-[200%] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] outline outline-2 outline-[#14B8A6] focus:translate-y-0"
      >
        {isRTL ? 'الانتقال إلى المحتوى' : 'Skip to content'}
      </a>
      <Navbar />
      <Hero />
      {/* <WhoWeCareFor /> */}
      <HowItWorks />
      <CarePlan />
      <Features />
      <ProductOverview />
      <EnterpriseSaaS />
      <CareCoordinator />
      <FamilyExperience />
      <Testimonials />
      <FAQ />
      <PartnersStrip className="py-16 sm:py-20" />
      <FinalCTA />
      <LandingFooter />
    </main>
  );
}
