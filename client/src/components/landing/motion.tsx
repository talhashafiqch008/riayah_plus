import { useRef, useEffect, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { easeOut } from './tokens';

const revealEase = easeOut;

/** Soft fade-up for section headers and large blocks */
export function SectionReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(22px)' }}
      animate={inView ? { opacity: 1, transform: 'translateY(0px)' } : undefined}
      transition={{ duration: 0.55, delay: reduceMotion ? 0 : delay, ease: revealEase }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered children when a grid/list enters view.
 * Wrap cards/items in StaggerItem.
 */
export function Stagger({
  children,
  className = '',
  stagger = 0.09,
  delayChildren = 0.06,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px' });
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, transform: 'translateY(18px)' },
        visible: {
          opacity: 1,
          transform: 'translateY(0px)',
          transition: { duration: 0.5, ease: revealEase },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Count-up when in view — explanation of scale, Dispnsary-style stats. */
export function CountUp({
  to,
  suffix = '',
  duration = 1.2,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setValue(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduceMotion]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}
