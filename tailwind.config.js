/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Brand accent — LittleNest purple */
        brand: {
          50: '#F5F1FB',
          100: '#EEE8FB',
          200: '#DFD5F7',
          300: '#C4B2F1',
          400: '#8A6FF0',
          500: '#6C5CE7',
          600: '#5B3CC9',
          700: '#5436C4',
          800: '#42299B',
          900: '#2E1C6B',
        },
        ink: { DEFAULT: '#241B33', soft: '#3A3147', sub: '#7E7591', faint: '#A79FB8' },
        cream: { DEFAULT: '#F5F1FB', card: '#FFFFFF', raised: '#FBF9FE' },
        line: { DEFAULT: '#EBE4F4', soft: '#F1ECF8' },
        gold: { DEFAULT: '#C99A3C', bg: '#FBF3DF', deep: '#BE8A2E' },
        moss: { DEFAULT: '#1A8551', bg: '#E7F6EE', deep: '#147544' },
        rose: { DEFAULT: '#C0455B', bg: '#FCF1F3' },
        sky: { DEFAULT: '#4E80C2', bg: '#E9F0F6' },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(36,27,51,.06), 0 1px 2px rgba(36,27,51,.04)',
        md: '0 4px 16px rgba(36,27,51,.08), 0 1px 4px rgba(36,27,51,.04)',
        lg: '0 12px 34px rgba(84,54,196,.18)',
        fab: '0 8px 24px rgba(108,92,231,.34)',
        sheet: '0 -10px 40px rgba(36,27,51,.2)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        slideup: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        fadein: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { to: { backgroundPosition: '-200% 0' } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        rise: 'rise .4s cubic-bezier(.22,1,.36,1) both',
        slideup: 'slideup .32s cubic-bezier(.22,1,.36,1)',
        fadein: 'fadein .2s ease',
        shimmer: 'shimmer 1.4s infinite',
      },
      maxWidth: { app: '480px', site: '1120px' },
    },
  },
  plugins: [],
};
