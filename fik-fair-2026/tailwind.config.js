/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { forest: '#123e32', lime: '#d5f4ab', paper: '#f7f8f2' },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
};
