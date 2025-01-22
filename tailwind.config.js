/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        base: '1.125rem', // ~18px for iPad-friendlier text
      },
    },
  },
  plugins: [],
};
