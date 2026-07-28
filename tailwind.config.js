/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        canvas: '#F5F5F7',
        surface: '#FFFFFF',
        surfaceMuted: '#FBFBFD',
        ink: '#1D1D1F',
        inkSoft: '#6E6E73',
        hairline: '#E5E5EA',
        accent: '#0A84FF',
        accentSoft: '#E8F2FF',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08)',
        floating: '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px -12px rgba(0,0,0,0.15)',
        block: '0 1px 2px rgba(0,0,0,0.06), 0 2px 6px -1px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.22s ease-out',
        popIn: 'popIn 0.16s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
