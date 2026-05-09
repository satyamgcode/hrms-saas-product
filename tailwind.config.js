/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-purple': '#8A3EEA',
        'brand-orange': '#F3901B',
      }
    },
  },
  plugins: [],
}
