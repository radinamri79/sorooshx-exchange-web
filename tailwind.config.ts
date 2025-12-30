import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ac',
          300: '#f6b978',
          400: '#f19342',
          500: '#ed7620',  // Primary brand color
          600: '#de5b15',
          700: '#b84314',
          800: '#933618',
          900: '#772f16',
          950: '#40150a',
        },
        // Trading colors
        trading: {
          long: '#26a69a',      // Green for buy/long
          'long-bg': 'rgba(38, 166, 154, 0.1)',
          short: '#ef5350',     // Red for sell/short
          'short-bg': 'rgba(239, 83, 80, 0.1)',
          neutral: '#848e9c',
        },
        // Background colors (pure black theme)
        background: {
          primary: '#000000',
          secondary: '#000000',
          tertiary: '#1a1a1a',
          elevated: '#0a0a0a',
        },
        // Border colors
        border: {
          DEFAULT: '#1e2329',
          light: '#2b3139',
        },
        // Text colors
        text: {
          primary: '#eaecef',
          secondary: '#848e9c',
          muted: '#5e6673',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
        vazir: ['Vazirmatn', 'Tahoma', 'sans-serif'],  // Persian font
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-green': 'flashGreen 0.3s ease-out',
        'flash-red': 'flashRed 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flashGreen: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(38, 166, 154, 0.2)' },
        },
        flashRed: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(239, 83, 80, 0.2)' },
        },
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '12px',
      },
      boxShadow: {
        'glow-green': '0 0 10px rgba(38, 166, 154, 0.3)',
        'glow-red': '0 0 10px rgba(239, 83, 80, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
