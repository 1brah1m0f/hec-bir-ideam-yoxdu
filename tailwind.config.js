/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stall: {
          950: '#120c08',
          900: '#1b130d',
          800: '#241a12',
          700: '#332419',
          600: '#493527',
        },
        brass: {
          400: '#d8b26a',
          500: '#c79a4b',
          600: '#a97d38',
          700: '#8a642c',
        },
        copper: {
          400: '#c47a4f',
          500: '#b3663c',
          600: '#95522f',
        },
        cream: '#efe4d2',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', '"Noto Serif"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Noto Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .5s ease-out',
      },
    },
  },
  plugins: [],
}
