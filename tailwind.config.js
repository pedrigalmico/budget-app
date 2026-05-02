/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#dde9ff',
          200: '#b8d1ff',
          300: '#86afff',
          400: '#5587ff',
          500: '#3565ff',
          600: '#1f47f5',
          700: '#1936d6',
          800: '#1a30aa',
          900: '#1c2f86',
        },
        surface: {
          0:   '#0a0b10',
          50:  '#0e1017',
          100: '#13151f',
          200: '#191c28',
          300: '#22263a',
          400: '#2c3148',
          500: '#3a4063',
        },
        ink: {
          0: '#ffffff',
          50: '#f5f7fb',
          100: '#e6e9f2',
          200: '#c7cce0',
          300: '#9aa1bf',
          400: '#6b7396',
          500: '#4b5274',
        },
        accent: {
          green: '#22c55e',
          mint:  '#10b981',
          red:   '#ef4444',
          amber: '#f59e0b',
          violet:'#8b5cf6',
          indigo:'#6366f1',
          cyan:  '#06b6d4',
        },
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        'card-hover': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 14px 40px -12px rgba(0,0,0,0.7)',
        'glow-primary': '0 0 0 1px rgba(53,101,255,0.4), 0 8px 30px -8px rgba(53,101,255,0.5)',
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #3565ff 0%, #1f47f5 100%)',
        'grad-card': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
        'grad-aurora': 'radial-gradient(1200px 600px at 0% -10%, rgba(53,101,255,0.18), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(139,92,246,0.12), transparent 60%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}
