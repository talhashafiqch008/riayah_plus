import {
  type ReactNode,
  type CSSProperties,
  type ElementType,
} from 'react';
import { fontBody } from './tokens';
import './landing-card.css';

export type LandingCardFill = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'none';
export type LandingCardTone = 'light' | 'dark' | 'mist';

type LandingCardProps = {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  /** Base surface */
  tone?: LandingCardTone;
  /** Hover fill direction */
  fill?: LandingCardFill;
  /** Hover fill color */
  fillColor?: string;
  as?: ElementType;
  href?: string;
  onClick?: () => void;
};

const toneClass: Record<LandingCardTone, string> = {
  light: 'landing-card--light',
  dark: 'landing-card--dark',
  mist: 'landing-card--mist',
};

/**
 * Shared boxy landing card with edge/center fill hover.
 * Prefer this over ad-hoc rounded cards on the marketing page.
 */
export function LandingCard({
  children,
  className = '',
  bodyClassName = '',
  style,
  tone = 'light',
  fill = 'left',
  fillColor,
  as: Comp = 'article',
  href,
  onClick,
}: LandingCardProps) {
  const props = {
    className: `landing-card ${toneClass[tone]} ${className}`.trim(),
    style: {
      fontFamily: fontBody,
      ...(fillColor ? ({ ['--landing-fill' as string]: fillColor } as CSSProperties) : null),
      ...style,
    },
    'data-fill': fill,
    onClick,
    ...(href ? { href } : {}),
  };

  return (
    <Comp {...props}>
      <span className="landing-card__fill" aria-hidden />
      <div className={`landing-card__body ${bodyClassName}`.trim()}>{children}</div>
    </Comp>
  );
}
