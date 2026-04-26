/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#14b8a6',
          DEFAULT: '#0d9488',
          dark: '#0f766e',
        },
        secondary: '#6366f1',
        accent: {
          pink: '#ec4899',
          DEFAULT: '#f59e0b',
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        cr: {
          light: '#8b5cf6',
          DEFAULT: '#7c3aed',
          bg: '#ede9fe',
        },
        dark: '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
