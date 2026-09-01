import { motion, useReducedMotion } from 'framer-motion';
import {
  Globe,
  Heart,
  ShieldCheck,
  Users,
  Sparkles,
  Cpu,
  ArrowRight,
  Lock,
  Compass,
  Award,
  CheckCircle2,
  FileHeart,
  Stethoscope,
  Activity,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { Navbar } from '@/components/landing/Navbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingButton } from '@/components/landing/LandingButton';
import { LandingCard } from '@/components/landing/LandingCard';
import { PartnersStrip } from '@/components/landing/PartnersStrip';
import { SectionReveal, Stagger, StaggerItem } from '@/components/landing/motion';
import { L, fontHeading, fontBody, fontArabic, easeOut } from '@/components/landing/tokens';

export default function AboutPage() {
  const { t } = useTranslation('about');
  const { isRTL } = useI18n();
  const reduceMotion = useReducedMotion();

  const corePillars = [
    {
      icon: Users,
      title: t('coreValues.items.0.title', 'Family Involvement'),
      desc: t(
        'coreValues.items.0.desc',
        'Keeping the family informed, respected, and in active partnership throughout every care decision.'
      ),
      color: '#0D9488',
      bg: '#F0FDFA',
      fill: 'left' as const,
    },
    {
      icon: Award,
      title: t('coreValues.items.1.title', 'Respect & Dignity'),
      desc: t(
        'coreValues.items.1.desc',
        'Upholding the personal autonomy, comfort, and honour of every person receiving care.'
      ),
      color: '#2563EB',
      bg: '#EFF6FF',
      fill: 'top' as const,
    },
    {
      icon: Lock,
      title: t('coreValues.items.2.title', 'Privacy & Discretion'),
      desc: t(
        'coreValues.items.2.desc',
        'Ensuring the utmost confidentiality and modesty within the home and across all digital health records.'
      ),
      color: '#059669',
      bg: '#ECFDF5',
      fill: 'right' as const,
    },
    {
      icon: Compass,
      title: t('coreValues.items.3.title', 'Cultural Understanding'),
      desc: t(
        'coreValues.items.3.desc',
        'Care designed to harmonize with local traditions, societal norms, and community life.'
      ),
      color: '#7C3AED',
      bg: '#F5F3FF',
      fill: 'left' as const,
    },
    {
      icon: Activity,
      title: t('coreValues.items.4.title', 'Continuity of Care'),
      desc: t(
        'coreValues.items.4.desc',
        'Seamless handovers, enduring clinician relationships, and persistent progress tracking.'
      ),
      color: '#EA580C',
      bg: '#FFF7ED',
      fill: 'center' as const,
    },
    {
      icon: Cpu,
      title: t('coreValues.items.5.title', 'Technology with Purpose'),
      desc: t(
        'coreValues.items.5.desc',
        'Smart systems that eliminate administrative friction so human care remains genuine and attentive.'
      ),
      color: '#0D9488',
      bg: '#F0FDFA',
      fill: 'right' as const,
    },
  ];

  const visionPillars = [
    {
      icon: Award,
      title: t('vision.pillars.0.title', 'Trained Care Teams'),
      desc: t(
        'vision.pillars.0.desc',
        'Investing in rigorous professional training and modern specialized geriatric & disability care standards.'
      ),
      fill: 'left' as const,
    },
    {
      icon: Layers,
      title: t('vision.pillars.1.title', 'Career Pathways'),
      desc: t(
        'vision.pillars.1.desc',
        'Fostering rewarding, respected long-term career pathways for nurses, therapists, and care workers.'
      ),
      fill: 'top' as const,
    },
    {
      icon: HeartHandshake,
      title: t('vision.pillars.2.title', 'Empowered Families'),
      desc: t(
        'vision.pillars.2.desc',
        'Educating and supporting families with complete transparency and actionable health guidance.'
      ),
      fill: 'center' as const,
    },
    {
      icon: ShieldCheck,
      title: t('vision.pillars.3.title', 'Structured Accountability'),
      desc: t(
        'vision.pillars.3.desc',
        'Delivering care with consistent oversight, measurable outcomes, and rigorous clinical governance.'
      ),
      fill: 'right' as const,
    },
  ];

  const multidisciplinaryRoles = [
    { label: isRTL ? 'طبيب عام واستشاري' : 'Doctors', color: '#2563EB' },
    { label: isRTL ? 'كادر تمريض منزلي' : 'Nurses', color: '#0D9488' },
    { label: isRTL ? 'علاج طبيعي' : 'Physiotherapists', color: '#059669' },
    { label: isRTL ? 'علاج وظيفي' : 'Occupational Therapists', color: '#7C3AED' },
    { label: isRTL ? 'أخصائي نفسي' : 'Psychologists', color: '#D97706' },
    { label: isRTL ? 'دعم يومي ومجتمعي' : 'Support Workers', color: '#0284C7' },
    { label: isRTL ? 'منسق رعاية مخصص' : 'Care Coordinator', color: '#E11D48' },
  ];

  return (
    <main
      id="main-content"
      className="min-h-screen overflow-x-clip bg-white"
      style={{ fontFamily: isRTL ? fontArabic : fontBody }}
      tabIndex={-1}
    >
      <Navbar />

      {/* ── 1. HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pb-20 pt-32 sm:pb-28 sm:pt-40">
        {/* Soft background ambient gradient */}
        <div
          className="pointer-events-none absolute -end-[10%] top-12 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #CCFBF1 0%, #E0F2FE 60%, transparent 80%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -start-[5%] top-40 h-[24rem] w-[24rem] rounded-full opacity-30 blur-2xl"
          style={{ background: 'radial-gradient(circle, #F3E8FF 0%, transparent 70%)' }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-6">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase"
            style={{
              background: L.sky,
              color: L.sea,
              fontFamily: isRTL ? fontArabic : fontBody,
              letterSpacing: isRTL ? 'normal' : '0.14em',
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#0D9488]" />
            {t('hero.badge', 'About Riayah Plus')}
          </motion.div>

          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: easeOut }}
            className="mb-6"
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              fontWeight: 800,
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              lineHeight: isRTL ? 1.35 : 1.1,
              letterSpacing: isRTL ? 'normal' : '-0.035em',
            }}
          >
            <span className="block" style={{ color: L.ink }}>
              {t('hero.titleLine1', 'Care Built Around People,')}
            </span>
            <span className="block" style={{ color: L.sea }}>
              {t('hero.titleLine2', 'Families and Real Life')}
            </span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: easeOut }}
            className="mx-auto max-w-2xl text-[1.12rem]"
            style={{
              color: L.fog,
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.8 : 1.65,
            }}
          >
            {t(
              'hero.subtitle',
              'Riayah Plus was created with a simple belief: care should be organised around the person, not around disconnected services.'
            )}
          </motion.p>
        </div>
      </section>

      {/* ── 2. AUSTRALIAN ORIGINS & REGIONAL DESIGN ────────────────────────────── */}
      <section className="py-20 sm:py-28" style={{ background: L.paper }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Left Story Column */}
            <div className="lg:col-span-6">
              <SectionReveal>
                <p
                  className={`mb-3 text-xs font-bold uppercase ${
                    isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
                  }`}
                  style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t('origins.eyebrow', 'Our Origins & Experience')}
                </p>
                <h2
                  className="mb-6 text-2xl font-bold sm:text-3xl"
                  style={{
                    fontFamily: isRTL ? fontArabic : fontHeading,
                    color: L.ink,
                    lineHeight: isRTL ? 1.45 : 1.2,
                  }}
                >
                  {t('origins.title', 'From Australian experience to care designed for our region')}
                </h2>
                <div
                  className="space-y-4 text-[15px] sm:text-base leading-relaxed"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.8 : 1.65,
                  }}
                >
                  <p>
                    {t(
                      'origins.p1',
                      'Our journey started in Australia, where we gained first-hand experience working within a mature disability and aged-care environment. Through our experience with MyNDIC, we saw the value of person-centred care, structured support, trained care teams, family involvement, and continuous monitoring of outcomes.'
                    )}
                  </p>
                  <p>
                    {t(
                      'origins.p2',
                      'We also saw something equally important: good care is not simply about providing a nurse, therapist or support worker. It is about understanding the person, knowing their goals, coordinating the people involved in their care, and making sure the plan is actually being followed.'
                    )}
                  </p>
                </div>

                <div
                  className="mt-6 rounded-2xl p-5"
                  style={{
                    background: '#F0FDFA',
                    border: '1px solid rgba(13,148,136,0.2)',
                  }}
                >
                  <p
                    className="text-sm font-semibold text-[#0B3B3E]"
                    style={{ fontFamily: isRTL ? fontArabic : fontBody }}
                  >
                    {t(
                      'origins.highlight',
                      'That foundational experience inspired the vision and structure behind Riayah Plus.'
                    )}
                  </p>
                </div>
              </SectionReveal>
            </div>

            {/* Right: Australian Origins Photo */}
            <div className="lg:col-span-6">
              <SectionReveal delay={0.08}>
                <div
                  className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-[#E2E8F0]"
                  style={{
                    boxShadow: '0 20px 50px -15px rgba(15,23,42,0.14)',
                  }}
                >
                  <img
                    src="/landing/australia-care-origins.jpg"
                    alt="Australian healthcare and disability care foundation"
                    className="aspect-[4/3] w-full object-cover object-center"
                  />
                  <div
                    className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur-md border border-white/60"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: L.sky, color: L.sea }}
                      >
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: L.ink, fontFamily: isRTL ? fontArabic : fontHeading }}
                        >
                          {isRTL ? 'معايير رعاية عالمية' : 'Global Care Standards'}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: L.fog, fontFamily: isRTL ? fontArabic : fontBody }}
                        >
                          {isRTL ? 'خبرة مستفادة من البيئة الأسترالية ومصممة لمجتمعنا' : 'Rooted in Australian care models, adapted for the GCC'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2.5 AUSTRALIAN PARTNERS STRIP (STANDALONE SECTION) ─────────────────── */}
      <PartnersStrip className="bg-slate-50/70 border-y border-slate-200/70" />

      {/* ── 3. CORE VALUES & PILLARS ────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionReveal className="mb-14 text-center">
            <p
              className={`mb-3 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
              }`}
              style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('coreValues.eyebrow', 'Our Core Pillars')}
            </p>
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)',
                lineHeight: isRTL ? 1.45 : 1.2,
                color: L.ink,
              }}
            >
              {t('coreValues.title', 'Combining global standards with regional values')}
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
                'coreValues.subtitle',
                'Our goal is to combine clinical excellence with the cultural foundations that matter most to families in Qatar and the GCC.'
              )}
            </p>
          </SectionReveal>

          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {corePillars.map(({ icon: Icon, title, desc, color, bg, fill }) => (
              <StaggerItem key={title} className="h-full">
                <LandingCard
                  tone="light"
                  fill={fill}
                  fillColor={L.sea}
                  className="flex h-full flex-col justify-between p-6 shadow-sm"
                >
                  <div>
                    <div
                      className="lc-icon-wrap mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: bg, color }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3
                      className="lc-title mb-2 text-base font-bold"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontHeading,
                        lineHeight: isRTL ? 1.4 : 1.25,
                      }}
                    >
                      {title}
                    </h3>
                    <p
                      className="lc-muted text-xs sm:text-[13.5px]"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontBody,
                        lineHeight: isRTL ? 1.7 : 1.55,
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                </LandingCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── 4. COMPLETE CARE JOURNEY VS FRAGMENTATION ──────────────────────────── */}
      <section className="py-20 sm:py-28" style={{ background: L.mist }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionReveal className="mb-14 text-center">
            <p
              className={`mb-3 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
              }`}
              style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('journey.eyebrow', 'The Care Ecosystem')}
            </p>
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)',
                lineHeight: isRTL ? 1.45 : 1.2,
                color: L.ink,
              }}
            >
              {t('journey.title', 'More than a service. A complete care journey.')}
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
                'journey.subtitle',
                'A person receiving care interacts with several professionals over time: doctors, nurses, physiotherapists, occupational therapists, psychologists, support workers, and coordinators.'
              )}
            </p>
          </SectionReveal>

          {/* Multidisciplinary Pill Badges */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2.5">
            {multidisciplinaryRoles.map(({ label, color }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm"
                style={{
                  border: '1px solid #E2E8F0',
                  color: L.ink,
                  fontFamily: isRTL ? fontArabic : fontBody,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>

          {/* Side by Side: Fragmentation vs The Riayah Solution */}
          <div className="grid gap-6 md:grid-cols-2">
            <div
              className="rounded-3xl bg-white p-7 sm:p-8"
              style={{
                border: '1px solid #FEE2E2',
                boxShadow: '0 10px 30px -15px rgba(239,68,68,0.1)',
              }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                {t('journey.problemTitle', 'The Fragmentation Problem')}
              </div>
              <p
                className="text-sm sm:text-[14.5px]"
                style={{
                  color: L.fog,
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.8 : 1.65,
                }}
              >
                {t(
                  'journey.problemDesc',
                  'When services operate in silos, reports are scattered in different clinics, appointments are managed separately, families have to repeatedly re-explain their story, and clinicians lack the complete clinical picture.'
                )}
              </p>
            </div>

            <div
              className="rounded-3xl bg-white p-7 sm:p-8"
              style={{
                border: '1px solid #CCFBF1',
                boxShadow: '0 10px 30px -15px rgba(13,148,136,0.15)',
              }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#059669]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('journey.solutionTitle', 'How Riayah Brings It Together')}
              </div>
              <p
                className="text-sm sm:text-[14.5px]"
                style={{
                  color: L.ink,
                  fontFamily: isRTL ? fontArabic : fontBody,
                  lineHeight: isRTL ? 1.8 : 1.65,
                }}
              >
                {t(
                  'journey.solutionDesc',
                  'Riayah Plus connects the entire care journey: assessments, medical reports, goals, care plans, multi-disciplinary services, appointments, progress tracking, and scheduled reviews into one unified ecosystem with the family at the center.'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. THE FAMILY & CARE COORDINATOR ───────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl shadow-xl">
                <img
                  src="/landing/family-care-experience.jpg"
                  alt="Arab family receiving coordinated care"
                  className="aspect-[3/4] w-full object-cover object-center"
                />
              </div>
            </div>

            <div className="lg:col-span-7">
              <SectionReveal>
                <p
                  className={`mb-3 text-xs font-bold uppercase ${
                    isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
                  }`}
                  style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t('coordinatorSpotlight.eyebrow', 'The Family at the Centre')}
                </p>
                <h2
                  className="mb-4 text-2xl font-bold sm:text-3xl"
                  style={{
                    fontFamily: isRTL ? fontArabic : fontHeading,
                    color: L.ink,
                    lineHeight: isRTL ? 1.4 : 1.2,
                  }}
                >
                  {t('coordinatorSpotlight.title', "Families shouldn't have to become care managers")}
                </h2>
                <p
                  className="mb-6 text-[15px] sm:text-base"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.75 : 1.6,
                  }}
                >
                  {t(
                    'coordinatorSpotlight.subtitle',
                    'We believe families should not have to carry the stress of managing schedules, records, and clinician handoffs just to get the right support.'
                  )}
                </p>

                <div className="space-y-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <p
                        className="text-xs sm:text-sm"
                        style={{
                          color: L.ink,
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.65 : 1.5,
                        }}
                      >
                        {t(`coordinatorSpotlight.bullets.${idx}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. PURPOSEFUL TECHNOLOGY (HUMAN-FIRST AI) ──────────────────────────── */}
      <section className="py-20 sm:py-28" style={{ background: L.paper }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-sm border border-[#E2E8F0]">
            <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <p
                  className={`mb-3 text-xs font-bold uppercase ${
                    isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
                  }`}
                  style={{ color: L.lagoon, fontFamily: isRTL ? fontArabic : fontBody }}
                >
                  {t('technology.eyebrow', 'Purposeful Technology')}
                </p>
                <h2
                  className="mb-4 text-2xl font-bold sm:text-3xl"
                  style={{
                    fontFamily: isRTL ? fontArabic : fontHeading,
                    color: L.ink,
                    lineHeight: isRTL ? 1.4 : 1.2,
                  }}
                >
                  {t('technology.title', 'Technology that supports people, not replaces them')}
                </h2>
                <p
                  className="mb-4 text-sm sm:text-[15px]"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.75 : 1.6,
                  }}
                >
                  {t('technology.p1')}
                </p>
                <p
                  className="mb-6 text-sm sm:text-[15px]"
                  style={{
                    color: L.fog,
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.75 : 1.6,
                  }}
                >
                  {t('technology.p2')}
                </p>
              </div>

              <div className="lg:col-span-5">
                <div
                  className="relative overflow-hidden rounded-2xl bg-white shadow-md border border-[#E2E8F0]"
                >
                  <img
                    src="/landing/care-plan-milestone.jpg"
                    alt="Digital Care Plan Milestone and Progress Tracking"
                    className="aspect-[4/3] w-full object-cover object-center"
                  />
                  <div className="p-4 bg-white border-t border-[#E2E8F0]">
                    <div className="flex items-center gap-2 text-[#0D9488] mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ fontFamily: isRTL ? fontArabic : fontBody }}
                      >
                        {isRTL ? 'تتبع مراحل ومؤشرات الخطة' : 'Care Plan Milestones & Outcomes'}
                      </span>
                    </div>
                    <p
                      className="text-xs"
                      style={{
                        color: L.fog,
                        fontFamily: isRTL ? fontArabic : fontBody,
                        lineHeight: isRTL ? 1.6 : 1.45,
                      }}
                    >
                      {isRTL
                        ? 'متابعة فورية ومستمرة لمؤشرات التحسن والأهداف العلاجية'
                        : 'Real-time tracking of therapy milestones, goals, and clinical updates.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. BUILDING A NEW REGIONAL STANDARD & GCC VISION ───────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <SectionReveal className="mb-14 text-center">
            <p
              className={`mb-3 text-xs font-bold uppercase ${
                isRTL ? 'tracking-normal' : 'tracking-[0.2em]'
              }`}
              style={{ color: L.sea, fontFamily: isRTL ? fontArabic : fontBody }}
            >
              {t('vision.eyebrow', 'Our Broader Vision')}
            </p>
            <h2
              className="mb-3"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)',
                lineHeight: isRTL ? 1.45 : 1.2,
                color: L.ink,
              }}
            >
              {t('vision.title', 'Building a new standard for disability and aged care')}
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
                'vision.subtitle',
                'Our ambition goes beyond creating another healthcare app. We are building a lasting culture of care across Qatar and the region.'
              )}
            </p>
          </SectionReveal>

          {/* 4 Vision Pillars */}
          <Stagger className="mb-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visionPillars.map(({ icon: Icon, title, desc, fill }) => (
              <StaggerItem key={title} className="h-full">
                <LandingCard
                  tone="light"
                  fill={fill}
                  fillColor={L.sea}
                  className="flex h-full flex-col justify-between p-5 shadow-sm"
                >
                  <div>
                    <div className="lc-icon-wrap mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0D9488]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3
                      className="lc-title mb-2 text-base font-bold"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontHeading,
                        lineHeight: isRTL ? 1.4 : 1.25,
                      }}
                    >
                      {title}
                    </h3>
                    <p
                      className="lc-muted flex-1 text-xs"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontBody,
                        lineHeight: isRTL ? 1.65 : 1.5,
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                </LandingCard>
              </StaggerItem>
            ))}
          </Stagger>

          {/* GCC Expansion & Manifesto Box */}
          <div
            className="rounded-3xl p-8 sm:p-12 text-center"
            style={{
              background: 'linear-gradient(135deg, #042F2E 0%, #0F172A 100%)',
              color: '#FFFFFF',
            }}
          >
            <h3
              className="mb-4 text-2xl font-bold sm:text-3xl"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                lineHeight: isRTL ? 1.4 : 1.2,
              }}
            >
              {t('vision.gccTitle', 'Global Expertise. Local Vision.')}
            </h3>
            <p
              className="mx-auto mb-8 max-w-2xl text-sm sm:text-base text-teal-100/80"
              style={{
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.8 : 1.65,
              }}
            >
              {t(
                'vision.gccDesc',
                'Drawing on our experience within advanced care systems in Australia, we understand how care can be more structured, person-centered, and goal-oriented. Today, we bring these learnings and reshape them to fit the needs, values, and culture of our families and communities across Qatar and the wider region.'
              )}
            </p>

            {/* Manifesto Lines */}
            <div
              className="mx-auto max-w-lg rounded-2xl bg-white/10 p-6 backdrop-blur-md border border-white/10"
            >
              <p
                className="text-base sm:text-lg font-bold text-white mb-1"
                style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
              >
                {t('vision.manifesto.line1', 'Care that understands the person.')}
              </p>
              <p
                className="text-base sm:text-lg font-bold text-teal-300 mb-1"
                style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
              >
                {t('vision.manifesto.line2', 'Technology that connects the journey.')}
              </p>
              <p
                className="text-base sm:text-lg font-bold text-white"
                style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
              >
                {t('vision.manifesto.line3', 'A system built around the family.')}
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <LandingButton
                to="/register"
                variant="solid"
                fill="left"
                className="min-h-12 px-8 text-sm w-full sm:w-auto"
              >
                {t('cta.bookButton', 'Book a Consultation')}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </LandingButton>
              <LandingButton
                to="/"
                variant="soft"
                fill="left"
                className="min-h-12 px-8 text-sm w-full sm:w-auto"
              >
                {t('cta.homeButton', 'Explore Our Services')}
              </LandingButton>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
