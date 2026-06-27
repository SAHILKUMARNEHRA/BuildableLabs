import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        glass: {
          // Translucent surfaces used by the "liquid glass" components.
          light: 'rgba(255, 255, 255, 0.55)',
          DEFAULT: 'rgba(255, 255, 255, 0.35)',
          dark: 'rgba(255, 255, 255, 0.18)',
          border: 'rgba(255, 255, 255, 0.6)',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(31, 38, 135, 0.18), inset 0 1px 1px rgba(255,255,255,0.6)',
        'glass-lg': '0 20px 60px rgba(31, 38, 135, 0.25), inset 0 1px 1px rgba(255,255,255,0.7)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        float: 'float 9s ease-in-out infinite',
        'toast-in': 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
