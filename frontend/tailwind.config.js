/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
          primary: {
            50: 'var(--color-primary-50)',
            100: 'var(--color-primary-100)',
            500: 'var(--color-primary-500)',
            600: 'var(--color-primary-600)',
            700: 'var(--color-primary-700)',
          },
          success: {
            50: 'var(--color-success-50)',
            600: 'var(--color-success-600)',
            700: 'var(--color-success-700)',
          },
          warning: {
            50: 'var(--color-warning-50)',
            600: 'var(--color-warning-600)',
            700: 'var(--color-warning-700)',
          },
          danger: {
            50: 'var(--color-danger-50)',
            600: 'var(--color-danger-600)',
            700: 'var(--color-danger-700)',
          },
          info: {
            50: 'var(--color-info-50)',
            600: 'var(--color-info-600)',
            700: 'var(--color-info-700)',
          },
        },
      },
    },
  plugins: [],
}