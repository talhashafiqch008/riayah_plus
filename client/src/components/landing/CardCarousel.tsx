import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
  type CSSProperties,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { L, fontBody } from './tokens';

type CardCarouselProps = {
  children: ReactNode;
  label: string;
  /** Approximate card width used for arrow scrolling */
  step?: number;
  className?: string;
  /** Light page (default) or dark band */
  tone?: 'light' | 'dark';
};

/**
 * Apple-style horizontal card rail: snap scrolling, peek of next card,
 * keyboard arrows, pause-friendly for reduced motion.
 */
export function CardCarousel({
  children,
  label,
  step = 340,
  className = '',
  tone = 'light',
}: CardCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const reduceMotion = useReducedMotion();
  const dark = tone === 'dark';

  const btnStyle = {
    border: dark ? '1px solid rgba(240,247,246,0.2)' : `1px solid ${L.line}`,
    background: dark ? 'rgba(240,247,246,0.08)' : L.paper,
    color: dark ? '#F0F7F6' : L.ink,
    transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
  } as const;

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 8);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      ro.disconnect();
    };
  }, [updateEdges]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * step,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByDir(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByDir(1);
    }
  };

  return (
    <div className={className}>
      <div className="mb-5 flex items-center justify-end gap-2 px-5 sm:px-6 max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          disabled={!canPrev}
          aria-label={`Previous ${label}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-[opacity,transform] duration-150 disabled:opacity-30 enabled:active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
          style={btnStyle}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          disabled={!canNext}
          aria-label={`Next ${label}`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-[opacity,transform] duration-150 disabled:opacity-30 enabled:active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14B8A6]"
          style={btnStyle}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex gap-4 overflow-x-auto overscroll-x-contain px-5 sm:px-6 pb-2 snap-x snap-mandatory scroll-px-5 sm:scroll-px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:ring-offset-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
        {/* Trailing spacer so last card can sit inset like Apple rails */}
        <div className="w-1 shrink-0 sm:w-8" aria-hidden />
      </div>
    </div>
  );
}

export function CarouselCard({
  children,
  className = '',
  widthClass = 'w-[min(85vw,320px)] sm:w-[300px] lg:w-[320px]',
  style,
}: {
  children: ReactNode;
  className?: string;
  widthClass?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className={`snap-start shrink-0 rounded-[1.75rem] ${widthClass} ${className}`}
      style={{
        fontFamily: fontBody,
        ...style,
      }}
    >
      {children}
    </article>
  );
}
