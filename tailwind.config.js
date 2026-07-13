/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: '#071D3A',
        redbrand: '#D71920',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
