import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Nairobi Sculpt Brand Colors - Refined from Design Mockups
        brand: {
          teal: {
            DEFAULT: '#073436', // Deep Teal - Sidebar & Headers
            dark: '#052627',
            light: '#0A4A4D',
          },
          gold: {
            DEFAULT: '#B58E3E', // Refined Gold - Accents & Active States
            dark: '#937332',
            light: '#D4B373',
          },
          beige: {
            DEFAULT: '#F9F6F0', // Creamy Background
            dark: '#E8E2D2',
          }
        },
        primary: {
          DEFAULT: '#073436',
          dark: '#052627',
          light: '#0A4A4D',
        },
        accent: {
          DEFAULT: '#B58E3E',
          dark: '#937332',
          light: '#D4B373',
        },
        // Legacy/Compatibility scale (mapped to new brand)
        isabelline: '#F9F6F0',
        almond: '#E8E2D2',
        lion: '#B58E3E',
        spaceCadet: '#073436',

        // Neutral scale
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        serif: ['Roboto Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;




