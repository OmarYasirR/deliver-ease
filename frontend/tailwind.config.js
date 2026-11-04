/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ─── Primary (teal) ──────────────────────────────
        primary: {
          DEFAULT: '#0D9488',
          50:  '#F0FAF8',
          100: '#D6F2EE',
          200: '#ADE4DD',
          300: '#7DD0C6',
          400: '#3DB3A6',
          500: '#0D9488',
          600: '#0B7A70',
          700: '#115E59',
          800: '#0E4B47',
          900: '#0A3835',
        },
        'primary-dark': '#115E59',
        'on-primary':   '#FFFFFF',

        // ─── Accent (rose) — full scale so btn-accent compiles ───
        accent: {
          DEFAULT: '#FB7185',
          50:  '#FFF1F3',
          100: '#FFE4E8',
          200: '#FECDD5',
          300: '#FDA4B4',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },
        'on-accent': '#3B0713',

        // ─── Semantic aliases ────────────────────────────
        canvas:  '#F1FAF9',
        surface: '#FFFFFF',
        ink:     '#0F2B29',
        muted:   '#5E7C79',
        line:    'rgba(15,43,41,.09)',

        // ─── Danger — deep shade of the accent rose ──────
        danger: {
          DEFAULT: '#BE123C',
          50:  '#FFF1F3',
          100: '#FFE4E8',
          600: '#BE123C',
          700: '#9F1239',
        },

        // ─── Legacy alias (brand-* === primary-*) ────────
        brand: {
          50:  '#F0FAF8',
          100: '#D6F2EE',
          200: '#ADE4DD',
          300: '#7DD0C6',
          400: '#3DB3A6',
          500: '#0D9488',
          600: '#0D9488',
          700: '#115E59',
          800: '#0E4B47',
          900: '#0A3835',
        },

        // ─── Neutral scale (gray-100 fixed — was translucent) ───
        gray: {
          50:  '#F1FAF9',
          100: '#E4EFED', // ← solid tint (was rgba(15,43,41,.09))
          200: '#D3E4E2',
          300: '#B4CBC8',
          400: '#8FA9A6',
          500: '#5E7C79',
          600: '#476663',
          700: '#2E4E4B',
          800: '#0F2B29',
          900: '#0A1F1E',
        },
      },
      borderColor: { DEFAULT: 'rgba(15,43,41,.09)' },
      ringColor:   { DEFAULT: '#0D9488' },
      boxShadow: {
        card:         '0 1px 2px rgba(15,43,41,.04), 0 8px 24px -16px rgba(15,43,41,.18)',
        'card-hover': '0 1px 2px rgba(15,43,41,.06), 0 12px 28px -16px rgba(15,43,41,.28)',
        focus:        '0 0 0 3px rgba(13,148,136,.22)',
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};