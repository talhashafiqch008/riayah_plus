/** Landing visual system — cool Riayah teal gradients (primary brand) */
export const L = {
  ink: '#0F172A',
  deep: '#0B3B3E',
  sea: '#0D9488',
  lagoon: '#14B8A6',
  sky: '#E0F7F5',
  mist: '#F4FAF9',
  paper: '#FFFFFF',
  fog: '#64748B',
  line: 'rgba(15, 23, 42, 0.08)',
  lineSoft: 'rgba(15, 23, 42, 0.06)',
  onDarkMuted: 'rgba(240, 247, 246, 0.62)',
  onDarkSoft: 'rgba(240, 247, 246, 0.42)',
  iconBlue: '#DBEAFE',
  iconGreen: '#D1FAE5',
  iconPurple: '#EDE9FE',
  iconTeal: '#CCFBF1',
  /** Cool atmosphere — all derived from Riayah teal / aqua */
  aqua: '#B8EFE8',
  mint: '#D5F5F0',
  ice: '#E8F9F7',
  foam: '#C5F0EA',
  tide: '#5EEAD4',
  /** Legacy aliases remapped to cool teal (no warm Carely peach/coral) */
  blush: '#D5F5F0',
  peach: '#B8EFE8',
  lavender: '#CCFBF1',
  lilac: '#99F6E4',
  coral: '#0D9488',
  surface: 'rgba(255,255,255,0.72)',
  shadow: '0 24px 60px -28px rgba(13, 148, 136, 0.16)',
  shadowSoft: '0 16px 40px -24px rgba(11, 59, 62, 0.12)',
} as const;

export const fontHeading =
  '"Figtree", "IBM Plex Sans Arabic", "Noto Sans Arabic", "Cairo", system-ui, sans-serif';
export const fontBody =
  '"Noto Sans", "IBM Plex Sans Arabic", "Noto Sans Arabic", "Cairo", system-ui, sans-serif';
export const fontArabic =
  '"IBM Plex Sans Arabic", "Noto Sans Arabic", "Cairo", "Noto Sans", system-ui, sans-serif';

/** Strong ease-out */
export const easeOut = [0.23, 1, 0.32, 1] as const;

/** Shared page width — match hero across all landing sections */
export const landingContainerClass =
  'relative mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12';

export const softCardStyle = {
  background: L.paper,
  border: `1px solid ${L.lineSoft}`,
  boxShadow: L.shadowSoft,
  borderRadius: '1.5rem',
} as const;
