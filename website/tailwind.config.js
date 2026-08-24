/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './pages/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        display: ['"Lilita One"', 'cursive'],
      },
      colors: {
        brand: {
          orange: '#fba91a', // Brand Yellow/Orange
          dark: '#14264e', // Brand Navy
          blue: '#14264e', // Alias for clarity
          gray: '#334155',
          light: '#F8FAFC',
        },
      },
      backgroundImage: {
        'pattern-grid':
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fba91a' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
        'wave-pattern':
          "url(\"data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 25 20 50 10 T 100 10' stroke='%23fba91a' fill='none' stroke-width='4'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        sticker: '4px 4px 0px rgba(0,0,0,0.1)',
        'sticker-hover': '6px 6px 0px rgba(0,0,0,0.15)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
    },
  },
  plugins: [],
};
