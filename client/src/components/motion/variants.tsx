
import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

export const containerVariants: Variants = {
 hidden: { opacity: 0 },
 visible: {
  opacity: 1,
  transition: {
   staggerChildren: 0.05,
   delayChildren: 0.05
  }
 }
};

export const itemVariants: Variants = {
 hidden: { opacity: 0, y: 15 },
 visible: {
  opacity: 1,
  y: 0,
  transition: {
   type: 'spring' as const,
   stiffness: 150,
   damping: 20
  }
 }
};

export const cardVariants: Variants = {
 hidden: { opacity: 0, y: 20, scale: 0.98 },
 visible: {
  opacity: 1,
  y: 0,
  scale: 1,
  transition: {
   type: 'spring' as const,
   stiffness: 100,
   damping: 15
  }
 }
};

export const listItemVariants: Variants = {
 hidden: { opacity: 0, x: -20 },
 visible: {
  opacity: 1,
  x: 0,
  transition: {
   type: 'spring' as const,
   stiffness: 100,
   damping: 15
  }
 }
};

export const fadeInVariants: Variants = {
 hidden: { opacity: 0 },
 visible: {
  opacity: 1,
  transition: { duration: 0.3 }
 }
};

export const scaleInVariants: Variants = {
 hidden: { opacity: 0, scale: 0.9 },
 visible: {
  opacity: 1,
  scale: 1,
  transition: {
   type: 'spring' as const,
   stiffness: 200,
   damping: 20
  }
 }
};

export const heroVariants: Variants = {
 hidden: { opacity: 0, y: 40 },
 visible: {
  opacity: 1,
  y: 0,
  transition: {
   type: 'spring' as const,
   stiffness: 80,
   damping: 20
  }
 }
};

export const staggerContainer = (stagger?: number, delay?: number): Variants => ({
 hidden: { opacity: 0 },
 visible: {
  opacity: 1,
  transition: {
   staggerChildren: stagger || 0.08,
   delayChildren: delay || 0.1
  }
 }
});

export const springItem = (delay?: number): Variants => ({
 hidden: { opacity: 0, y: 20 },
 visible: {
  opacity: 1,
  y: 0,
  transition: {
   type: 'spring' as const,
   stiffness: 100,
   damping: 15,
   delay: delay || 0
  }
 }
});

export const whileHover = {
 y: -4,
 scale: 1.01,
 transition: { type: 'spring' as const, stiffness: 400, damping: 25 }
};

export const whileTap = {
 scale: 0.98,
 transition: { type: 'spring' as const, stiffness: 400, damping: 25 }
};

export const buttonHover = {
 scale: 1.02,
 transition: { type: 'spring' as const, stiffness: 400, damping: 25 }
};

export const buttonTap = {
 scale: 0.98,
 transition: { type: 'spring' as const, stiffness: 400, damping: 25 }
};

interface MotionContainerProps {
 children: ReactNode;
 className?: string;
 variants?: Variants;
 stagger?: number;
 delay?: number;
}

export function MotionContainer({ children, className, variants, stagger, delay }: MotionContainerProps) {
 return (
  <motion.div
   initial="hidden"
   animate="visible"
   variants={variants || staggerContainer(stagger, delay)}
   className={className}
  >
   {children}
  </motion.div>
 );
}

interface MotionItemProps {
 children: ReactNode;
 className?: string;
 variants?: Variants;
 delay?: number;
}

export function MotionItem({ children, className, variants, delay }: MotionItemProps) {
 return (
  <motion.div
   variants={variants || springItem(delay)}
   className={className}
  >
   {children}
  </motion.div>
 );
}

interface MotionCardProps {
 children: ReactNode;
 className?: string;
}

export function MotionCard({ children, className }: MotionCardProps) {
 return (
  <motion.div
   variants={cardVariants}
   whileHover={whileHover}
   whileTap={whileTap}
   className={className}
  >
   {children}
  </motion.div>
 );
}

interface MotionListProps {
 children: ReactNode;
 className?: string;
}

export function MotionList({ children, className }: MotionListProps) {
 return (
  <motion.div
   initial="hidden"
   whileInView="visible"
   viewport={{ once: true, margin: '-50px' }}
   variants={containerVariants}
   className={className}
  >
   {children}
  </motion.div>
 );
}
