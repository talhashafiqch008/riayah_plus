import {
  type ReactNode,
  type CSSProperties,
  type ElementType,
  type MouseEventHandler,
} from 'react';
import { Link } from 'react-router-dom';
import { fontBody } from './tokens';
import type { LandingCardFill } from './LandingCard';
import './landing-btn.css';

export type LandingButtonVariant = 'solid' | 'outline' | 'soft' | 'on-dark';

type LandingButtonProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: LandingButtonVariant;
  fill?: LandingCardFill;
  fillColor?: string;
  /** Pill (default) or 12px boxy radius to match cards */
  shape?: 'pill' | 'boxy';
  to?: string;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLElement>;
  'aria-label'?: string;
};

const variantClass: Record<LandingButtonVariant, string> = {
  solid: 'landing-btn--solid',
  outline: 'landing-btn--outline',
  soft: 'landing-btn--soft',
  'on-dark': 'landing-btn--on-dark',
};

/**
 * Landing CTA with the same directional fill hover as LandingCard.
 */
export function LandingButton({
  children,
  className = '',
  style,
  variant = 'solid',
  fill = 'left',
  fillColor,
  shape = 'pill',
  to,
  href,
  type = 'button',
  onClick,
  'aria-label': ariaLabel,
}: LandingButtonProps) {
  const classes = [
    'landing-btn',
    variantClass[variant],
    shape === 'boxy' ? 'landing-btn--boxy' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const props = {
    className: classes,
    style: {
      fontFamily: fontBody,
      ...(fillColor ? ({ ['--landing-btn-fill' as string]: fillColor } as CSSProperties) : null),
      ...style,
    },
    'data-fill': fill,
    onClick,
    'aria-label': ariaLabel,
  };

  const inner = (
    <>
      <span className="landing-btn__fill" aria-hidden />
      <span className="landing-btn__label">{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} {...props}>
        {inner}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} {...props}>
        {inner}
      </a>
    );
  }

  const Comp: ElementType = 'button';
  return (
    <Comp type={type} {...props}>
      {inner}
    </Comp>
  );
}
