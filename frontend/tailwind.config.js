/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f0',
          100: '#faefd9',
          200: '#f5dab0',
          300: '#efc079',
          400: '#e8a04a',
          500: '#d4862a',
          600: '#b86e20',
          700: '#96551c',
          800: '#7a4620',
          900: '#643b1e',
        },
        cafe: {
          dark: '#2c1810',
          brown: '#6b3d2e',
          cream: '#f5e6d3',
          warm: '#e8c99a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
