/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Fresh modern teal — replaces the old amber/coffee-brown primary.
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        cafe: {
          dark: '#0b1f1c',   // deep teal-charcoal, used for sidebar/dark chrome
          brown: '#4338ca',  // indigo accent for gradients (contrast against teal)
          cream: '#f0fdfa',  // very light mint, replaces old tan cream
          warm: '#a7f3d0'    // soft light-teal accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
