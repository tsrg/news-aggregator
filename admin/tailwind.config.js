/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: '#FFFFFF',
        canvas: '#F3F4F6',
        primary: '#2563EB',
        ink: '#1F2937',
        borderline: '#D1D5DB'
      }
    },
  },
  plugins: [],
}