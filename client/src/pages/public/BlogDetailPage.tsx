import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  Calendar,
  ExternalLink,
  Share2,
  CheckCircle2,
  Sparkles,
  Quote,
  BookOpen,
  ChevronRight,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/components/I18nProvider';
import { Navbar } from '@/components/landing/Navbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingButton } from '@/components/landing/LandingButton';
import { LandingCard } from '@/components/landing/LandingCard';
import { SectionReveal } from '@/components/landing/motion';
import { L, fontHeading, fontBody, fontArabic, easeOut } from '@/components/landing/tokens';
import {
  getArticleBySlug,
  getRelatedArticles,
  type BlogArticle,
} from '@/data/blogArticles';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation('blog');
  const { isRTL } = useI18n();
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const currentLang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en';

  if (!slug) {
    return <Navigate to="/blog" replace />;
  }

  const article: BlogArticle | undefined = getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col justify-between" style={{ backgroundColor: L.mist }}>
        <Navbar />
        <div className="mx-auto max-w-xl py-32 text-center px-4">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900" style={{ fontFamily: fontHeading }}>
            {t('hub.noResultsTitle', 'Article Not Found')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('hub.noResultsDesc', 'The article you are looking for does not exist or has been moved.')}
          </p>
          <Link
            to="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <ArrowLeft className="h-4 w-4 rtl-flip" />
            <span>{t('article.backToHub', 'Back to Knowledge Hub')}</span>
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const relatedArticles = getRelatedArticles(article.slug);

  const title = article.title[currentLang] || article.title.en;
  const summary = article.summary[currentLang] || article.summary.en;
  const categoryLabel = article.categoryLabel[currentLang] || article.categoryLabel.en;
  const countryLabel = article.countryLabel[currentLang] || article.countryLabel.en;
  const authorName = article.author.nameAr && currentLang === 'ar' ? article.author.nameAr : article.author.name;
  const authorRole = article.author.roleAr && currentLang === 'ar' ? article.author.roleAr : article.author.role;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: L.mist,
        color: L.ink,
        fontFamily: isRTL ? fontArabic : fontBody,
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-2 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium leading-none">
            <Link
              to="/"
              className="!min-h-0 !min-w-0 inline-flex items-center text-slate-500 hover:text-teal-700 transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              {isRTL ? 'الرئيسية' : 'Home'}
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400 rtl-rotate-180 shrink-0" />
            <Link
              to="/blog"
              className="!min-h-0 !min-w-0 inline-flex items-center text-slate-500 hover:text-teal-700 transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              {t('hub.eyebrow', 'Blogs')}
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400 rtl-rotate-180 shrink-0" />
            <span className="text-teal-800 font-semibold truncate max-w-xs sm:max-w-md">
              {title}
            </span>
          </nav>
        </div>

        {/* Article Header */}
        <header className="mx-auto max-w-5xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200/60">
                {categoryLabel}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {countryLabel}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {t('hub.readTime', { min: article.readTimeMin })}
              </span>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-teal-700 focus:outline-none"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copied ? t('article.linkCopied', 'Link Copied!') : t('article.shareArticle', 'Share')}</span>
            </button>
          </div>

          {/* Article Title */}
          <h1
            className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-slate-900"
            style={{
              fontFamily: isRTL ? fontArabic : fontHeading,
              lineHeight: isRTL ? 1.35 : 1.15,
            }}
          >
            {title}
          </h1>

          {/* Summary Lead */}
          <p
            className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed border-s-4 border-teal-500 ps-4"
            style={{
              fontFamily: isRTL ? fontArabic : fontBody,
              lineHeight: isRTL ? 1.75 : 1.6,
            }}
          >
            {summary}
          </p>

          {/* Author Card & Meta */}
          <div className="mt-6 flex items-center justify-between border-y border-slate-200/80 py-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-teal-200 bg-teal-100 flex items-center justify-center shrink-0">
                {article.author.avatar ? (
                  <img src={article.author.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-teal-700" />
                )}
              </div>
              <div>
                <div className="font-bold text-slate-900">{authorName}</div>
                <div className="text-xs text-slate-500">{authorRole}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{article.publishedAt}</span>
            </div>
          </div>
        </header>

        {/* Content & Citations Grid */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Main Article Body (8 cols) */}
            <article className="lg:col-span-8 space-y-8">
              {/* Key Takeaways Box */}
              <div className="rounded-3xl border border-teal-200/80 bg-teal-50/70 p-6 sm:p-7 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-teal-700 shrink-0" />
                  <h2
                    className="text-base sm:text-lg font-bold text-teal-950"
                    style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
                  >
                    {t('article.keyTakeawaysTitle', 'Key Takeaways for Families')}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {(article.keyTakeaways[currentLang] || article.keyTakeaways.en).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-teal-900 leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Body Sections */}
              {article.sections.map((sec, idx) => {
                const heading = sec.headingAr && currentLang === 'ar' ? sec.headingAr : sec.heading;
                const paragraphs = sec.contentAr && currentLang === 'ar' ? sec.contentAr : sec.content;

                return (
                  <section key={idx} className="space-y-4">
                    <h2
                      className="text-xl sm:text-2xl font-bold text-slate-900 pt-2"
                      style={{
                        fontFamily: isRTL ? fontArabic : fontHeading,
                        lineHeight: isRTL ? 1.4 : 1.25,
                      }}
                    >
                      {heading}
                    </h2>

                    {paragraphs.map((para, pIdx) => (
                      <p
                        key={pIdx}
                        className="text-sm sm:text-base text-slate-700 leading-relaxed"
                        style={{
                          fontFamily: isRTL ? fontArabic : fontBody,
                          lineHeight: isRTL ? 1.85 : 1.7,
                        }}
                      >
                        {para}
                      </p>
                    ))}

                    {/* Optional Section Callout Quote */}
                    {sec.calloutQuote && (
                      <div className="my-6 rounded-2xl border-s-4 border-teal-600 bg-slate-50 p-5 shadow-sm">
                        <Quote className="h-5 w-5 text-teal-600 mb-2 rtl-flip" />
                        <blockquote
                          className="text-sm sm:text-base font-semibold text-slate-800 italic"
                          style={{
                            fontFamily: isRTL ? fontArabic : fontHeading,
                            lineHeight: isRTL ? 1.6 : 1.5,
                          }}
                        >
                          "{sec.calloutQuote.textAr && currentLang === 'ar' ? sec.calloutQuote.textAr : sec.calloutQuote.text}"
                        </blockquote>
                        {sec.calloutQuote.attribution && (
                          <div className="mt-2 text-xs font-medium text-slate-500">
                            {sec.calloutQuote.attributionAr && currentLang === 'ar' ? sec.calloutQuote.attributionAr : sec.calloutQuote.attribution}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Distinct Riayah Plus Perspective Box (Rule 4: Keep Fact & Riayah Perspective visually distinct) */}
              <div
                className="my-10 overflow-hidden rounded-3xl border-2 border-teal-500 bg-gradient-to-br from-teal-950 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/20 px-3 py-1 text-xs font-bold text-teal-200 border border-teal-400/30">
                    <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                    {t('article.riayahPerspectiveBadge', 'منظور رعاية بلس الإكلينيكي')}
                  </span>
                  <span className="text-[11px] text-teal-200/70">
                    {t('hub.brandLine', 'خبرة عالمية. برؤية محلية.')}
                  </span>
                </div>

                <h3
                  className="mt-4 text-lg sm:text-xl font-bold text-teal-300"
                  style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
                >
                  {article.riayahPerspective.title[currentLang] || article.riayahPerspective.title.en}
                </h3>

                <p
                  className="mt-3 text-xs sm:text-sm text-teal-50/90 leading-relaxed"
                  style={{
                    fontFamily: isRTL ? fontArabic : fontBody,
                    lineHeight: isRTL ? 1.85 : 1.7,
                  }}
                >
                  {article.riayahPerspective.content[currentLang] || article.riayahPerspective.content.en}
                </p>

                <div className="mt-5 pt-4 border-t border-white/10 text-[11px] text-teal-300/80 italic">
                  {t(
                    'article.riayahPerspectiveNotice',
                    'Visual Distinction: This section reflects Riayah Plus clinical philosophy and system design, grounded in verified data.'
                  )}
                </div>
              </div>
            </article>

            {/* Sidebar: Verified Sources & Citations (4 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Sticky Citations Box */}
              <div className="sticky top-28 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-teal-600" />
                  <h3
                    className="text-base font-bold"
                    style={{ fontFamily: fontHeading }}
                  >
                    {t('article.verifiedSourcesTitle', 'Verified Sources & Citations')}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  {t(
                    'article.verifiedSourcesSubtitle',
                    'Every statistic on this page links directly to its official government or international publication.'
                  )}
                </p>

                <div className="space-y-4">
                  {article.sources.map((src) => {
                    const claim = src.claimAr && currentLang === 'ar' ? src.claimAr : src.claim;
                    const stat = src.statAr && currentLang === 'ar' ? src.statAr : src.stat;
                    const sourceName = src.sourceNameAr && currentLang === 'ar' ? src.sourceNameAr : src.sourceName;

                    return (
                      <div
                        key={src.id}
                        className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 transition-all hover:bg-teal-50/80"
                      >
                        {stat && (
                          <div className="mb-1.5 inline-block rounded-md bg-teal-600 px-2 py-0.5 text-[11px] font-bold text-white">
                            {stat}
                          </div>
                        )}

                        <p className="text-xs text-slate-700 leading-relaxed mb-2 font-medium">
                          {claim}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-teal-100/60">
                          <span className="truncate max-w-[140px]">{src.publisher} ({src.year})</span>
                          <a
                            href={src.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 underline"
                          >
                            <span>{t('verifiedDirectory.visitSource', 'Source')}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Back Link */}
                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
                    <span>{t('article.backToHub', 'Back to Knowledge Hub')}</span>
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 lg:px-8">
            <h2
              className="text-xl sm:text-2xl font-bold text-slate-900 mb-6"
              style={{ fontFamily: fontHeading }}
            >
              {t('article.relatedTitle', 'Related Analyses & Research')}
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              {relatedArticles.map((rel, idx) => {
                const relTitle = rel.title[currentLang] || rel.title.en;
                const relCat = rel.categoryLabel[currentLang] || rel.categoryLabel.en;
                const fillDir = (['left', 'center', 'right'][idx % 3]) as 'left' | 'center' | 'right';
                return (
                  <Link
                    key={rel.id}
                    to={`/blog/${rel.slug}`}
                    className="group block !min-h-0 !min-w-0"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    <LandingCard
                      tone="light"
                      fill={fillDir}
                      fillColor={L.sea}
                      className="flex h-full flex-col justify-between p-5 shadow-sm"
                    >
                      <div>
                        <span className="lc-badge rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-200/50">
                          {relCat}
                        </span>
                        <h3
                          className="lc-title mt-2.5 text-sm font-bold line-clamp-2"
                          style={{ fontFamily: isRTL ? fontArabic : fontHeading }}
                        >
                          {relTitle}
                        </h3>
                      </div>

                      <div className="lc-rule mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                        <span className="lc-btn-link font-semibold text-teal-700">{t('hub.readArticle', 'Read')}</span>
                        <ArrowRight className="h-3 w-3 rtl-flip transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </LandingCard>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom Consultation CTA */}
        <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 lg:px-8">
          <SectionReveal className="rounded-3xl border border-teal-100 bg-gradient-to-r from-teal-50 via-teal-100/50 to-white p-8 sm:p-10 text-center shadow-sm">
            <span
              className="text-xs font-bold uppercase tracking-widest text-teal-700"
              style={{ fontFamily: fontHeading }}
            >
              {t('cta.eyebrow', 'From Insight to Action')}
            </span>
            <h2
              className="mx-auto mt-2 max-w-xl text-xl sm:text-2xl font-extrabold text-slate-900"
              style={{
                fontFamily: isRTL ? fontArabic : fontHeading,
                lineHeight: isRTL ? 1.35 : 1.2,
              }}
            >
              {t(
                'cta.title',
                'Turn clinical evidence into a structured care plan for your loved one'
              )}
            </h2>
            <p
              className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-slate-600"
              style={{
                fontFamily: isRTL ? fontArabic : fontBody,
                lineHeight: isRTL ? 1.7 : 1.6,
              }}
            >
              {t(
                'cta.subtitle',
                "Speak directly with a dedicated Care Coordinator who understands your family's daily routines, goals, and regional healthcare resources."
              )}
            </p>
            <div className="mt-5 flex justify-center">
              <LandingButton
                to="/register"
                variant="solid"
                fill="left"
                className="px-6 py-2.5 text-sm font-bold shadow-md"
              >
                <span>{t('cta.button', 'Book a Free Consultation')}</span>
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </LandingButton>
            </div>
          </SectionReveal>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
