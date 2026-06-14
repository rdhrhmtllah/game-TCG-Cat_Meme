/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rarity colors — used consistently across all UI
        common: {
          DEFAULT: '#9CA3AF', // Gray-400
          light: '#D1D5DB',   // Gray-300
          dark: '#6B7280',    // Gray-500
        },
        rare: {
          DEFAULT: '#60A5FA', // Blue-400
          light: '#93C5FD',   // Blue-300
          dark: '#3B82F6',    // Blue-500
        },
        epic: {
          DEFAULT: '#A78BFA', // Violet-400
          light: '#C4B5FD',   // Violet-300
          dark: '#8B5CF6',    // Violet-500
        },
        legendary: {
          DEFAULT: '#FBBF24', // Amber-400
          light: '#FCD34D',   // Amber-300
          dark: '#F59E0B',    // Amber-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
