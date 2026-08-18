/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F0FDFA',
          600: '#0D9488',
          700: '#0F766E',
        },
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          400: '#A8A29E',
          600: '#57534E',
          700: '#44403C',
          900: '#1C1917',
        },
        amber: {
          50: '#FFFBEB',
          400: '#FBBF24',
          500: '#F59E0B',
        },
        red: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
        green: {
          50: '#F0FDF4',
          500: '#22C55E',
          600: '#16A34A',
        },
      },
    },
  },
  plugins: [],
};
