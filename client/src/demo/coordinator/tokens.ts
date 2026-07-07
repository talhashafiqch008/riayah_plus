/**
 * Design tokens for the Coordinator Demo.
 * Use these instead of hard-coded Tailwind classes to ensure consistency
 * and make dark-mode support easier.
 */

export const tokens = {
  colors: {
    background: {
      page: "bg-gradient-to-br from-slate-50 to-slate-100",
      card: "bg-white",
      header: "bg-white",
      input: "bg-white",
      muted: "bg-slate-50",
      hover: "hover:bg-slate-50",
    },
    text: {
      primary: "text-slate-900",
      secondary: "text-slate-600",
      muted: "text-slate-500",
      inverse: "text-white",
    },
    border: {
      default: "border-slate-200",
      subtle: "border-slate-100",
      dashed: "border-dashed border-slate-300",
    },
    accent: {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
        hoverBg: "hover:bg-blue-50",
      },
      green: {
        bg: "bg-green-50",
        text: "text-green-600",
        border: "border-green-200",
      },
      amber: {
        bg: "bg-amber-50",
        text: "text-amber-600",
        border: "border-amber-200",
      },
      red: {
        bg: "bg-red-50",
        text: "text-red-600",
        border: "border-red-200",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-200",
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-200",
      },
      teal: {
        bg: "bg-teal-50",
        text: "text-teal-600",
        border: "border-teal-200",
      },
      pink: {
        bg: "bg-pink-50",
        text: "text-pink-600",
        border: "border-pink-200",
      },
    },
  },
  shadows: {
    card: "shadow-sm",
    cardHover: "shadow-lg",
    button: "shadow-sm",
    header: "shadow-sm",
  },
  typography: {
    display: "text-[clamp(2rem,4vw,2.5rem)] font-bold tracking-tight",
    h1: "text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight",
    h2: "text-[clamp(1.125rem,2vw,1.25rem)] font-semibold tracking-tight",
    h3: "text-[clamp(1rem,1.5vw,1.125rem)] font-semibold",
    body: "text-[clamp(0.875rem,1.2vw,1rem)] leading-relaxed",
    small: "text-[clamp(0.75rem,1vw,0.875rem)] font-medium",
    caption: "text-[clamp(0.625rem,0.8vw,0.75rem)] font-medium",
  },
  spacing: {
    section: "space-y-6",
    card: "p-5",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  },
  transitions: {
    card: "motion-safe:transition-all duration-300",
    button: "motion-safe:transition-all duration-200",
    nav: "motion-safe:transition-all duration-200",
    progress: "motion-safe:transition-all duration-500",
    svg: "motion-safe:transition-all duration-1000",
  },
  focus: {
    ring: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  },
} as const;

export type Tokens = typeof tokens;
