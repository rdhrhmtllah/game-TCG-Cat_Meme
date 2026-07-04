/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ========== Rarity Colors — Pokémon TCG Premium ==========
        common: {
          DEFAULT: '#94A3B8',
          light: '#CBD5E1',
          dark: '#64748B',
          glow: 'rgba(148, 163, 184, 0.3)',
        },
        rare: {
          DEFAULT: '#38BDF8',
          light: '#7DD3FC',
          dark: '#0284C7',
          glow: 'rgba(56, 189, 248, 0.4)',
        },
        epic: {
          DEFAULT: '#A855F7',
          light: '#C084FC',
          dark: '#7C3AED',
          glow: 'rgba(168, 85, 247, 0.5)',
        },
        legendary: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dark: '#D97706',
          glow: 'rgba(245, 158, 11, 0.6)',
        },

        // ========== Surface Colors — Deep Navy System ==========
        'surface': '#070B1A',
        'surface-card': '#0C1428',
        'surface-elevated': '#121E3D',
        'surface-overlay': 'rgba(7, 11, 26, 0.92)',
        'surface-highlight': '#1A2747',

        // ========== Accent ==========
        'accent': '#7C3AED',
        'accent-soft': '#A78BFA',
        'accent-glow': '#8B5CF6',

        // ========== Text ==========
        'primary': '#F1F5F9',
        'secondary': '#94A3B8',
        'muted': '#475569',
      },

      fontFamily: {
        display: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        'glow-sm': '0 0 10px var(--glow-color, rgba(124, 58, 237, 0.3))',
        'glow-md': '0 0 20px var(--glow-color, rgba(124, 58, 237, 0.4)), 0 0 40px var(--glow-color, rgba(124, 58, 237, 0.15))',
        'glow-lg': '0 0 30px var(--glow-color, rgba(124, 58, 237, 0.5)), 0 0 60px var(--glow-color, rgba(124, 58, 237, 0.2)), 0 0 100px var(--glow-color, rgba(124, 58, 237, 0.1))',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 20px rgba(124, 58, 237, 0.05)',
        'card-common': '0 4px 20px rgba(148, 163, 184, 0.08)',
        'card-rare': '0 4px 25px rgba(56, 189, 248, 0.15), 0 0 40px rgba(56, 189, 248, 0.05)',
        'card-epic': '0 8px 30px rgba(168, 85, 247, 0.2), 0 0 50px rgba(168, 85, 247, 0.1)',
        'card-legendary': '0 8px 40px rgba(245, 158, 11, 0.3), 0 0 60px rgba(245, 158, 11, 0.15), 0 0 100px rgba(245, 158, 11, 0.05)',
      },

      backdropBlur: {
        'xl': '20px',
        '2xl': '40px',
      },

      animation: {
        // Core micro-interactions
        'shimmer': 'shimmer 2s linear infinite',
        'foil-sweep': 'foil-sweep 3s ease-in-out infinite',
        'card-flip': 'card-flip 0.6s ease-in-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',

        // TCG Premium
        'pack-shake': 'pack-shake 0.5s ease-in-out',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'confetti-fall': 'confetti-fall 3s ease-in forwards',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',

        // New — Premium effects
        'holo-sweep': 'holo-sweep 3s linear infinite',
        'energy-pulse': 'energy-pulse 2s ease-in-out infinite',
        'reveal-burst': 'reveal-burst 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'particle-float': 'particle-float 4s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 2.5s ease-in-out infinite',
        'dramatic-zoom': 'dramatic-zoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'tear-flash': 'tear-flash 0.4s ease-out forwards',
        'card-materialize': 'card-materialize 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'gradient-rotate': 'gradient-rotate 4s linear infinite',
        'slide-up-spring': 'slide-up-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'ripple': 'ripple 0.6s ease-out forwards',
        'border-glow-cycle': 'border-glow-cycle 3s linear infinite',
      },

      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'foil-sweep': {
          '0%, 100%': { transform: 'translateX(-100%) skewX(-15deg)', opacity: '0' },
          '50%': { transform: 'translateX(200%) skewX(-15deg)', opacity: '1' },
        },
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pack-shake': {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '10%': { transform: 'rotate(-2deg) scale(1.01)' },
          '20%': { transform: 'rotate(2deg) scale(1.02)' },
          '30%': { transform: 'rotate(-3deg) scale(1.01)' },
          '40%': { transform: 'rotate(3deg) scale(1.02)' },
          '50%': { transform: 'rotate(-2deg) scale(1.01)' },
          '60%': { transform: 'rotate(2deg) scale(1)' },
          '70%': { transform: 'rotate(-1deg) scale(1)' },
          '80%': { transform: 'rotate(1deg) scale(1)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px var(--glow-color, currentColor)' },
          '50%': { boxShadow: '0 0 25px var(--glow-color, currentColor), 0 0 50px var(--glow-color, currentColor)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        // New premium keyframes
        'holo-sweep': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 200%' },
        },
        'energy-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'reveal-burst': {
          '0%': { transform: 'scale(0) rotate(-15deg)', opacity: '0' },
          '60%': { transform: 'scale(1.1) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'particle-float': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)', opacity: '0.6' },
          '25%': { transform: 'translateY(-15px) translateX(5px)', opacity: '1' },
          '50%': { transform: 'translateY(-5px) translateX(-5px)', opacity: '0.8' },
          '75%': { transform: 'translateY(-20px) translateX(3px)', opacity: '0.4' },
        },
        'glow-breathe': {
          '0%, 100%': {
            boxShadow: '0 0 8px var(--glow-color, rgba(245, 158, 11, 0.3)), 0 0 20px var(--glow-color, rgba(245, 158, 11, 0.1))',
          },
          '50%': {
            boxShadow: '0 0 20px var(--glow-color, rgba(245, 158, 11, 0.5)), 0 0 50px var(--glow-color, rgba(245, 158, 11, 0.2)), 0 0 80px var(--glow-color, rgba(245, 158, 11, 0.1))',
          },
        },
        'dramatic-zoom': {
          '0%': { transform: 'scale(0.3)', opacity: '0', filter: 'blur(10px)' },
          '70%': { transform: 'scale(1.05)', opacity: '1', filter: 'blur(0)' },
          '100%': { transform: 'scale(1)', opacity: '1', filter: 'blur(0)' },
        },
        'tear-flash': {
          '0%': { opacity: '0.8', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(2)' },
        },
        'card-materialize': {
          '0%': { transform: 'scale(0.5) rotateY(90deg)', opacity: '0', filter: 'blur(8px) brightness(2)' },
          '40%': { transform: 'scale(1.1) rotateY(-10deg)', opacity: '1', filter: 'blur(0) brightness(1.5)' },
          '70%': { transform: 'scale(0.98) rotateY(5deg)', filter: 'blur(0) brightness(1.1)' },
          '100%': { transform: 'scale(1) rotateY(0deg)', opacity: '1', filter: 'blur(0) brightness(1)' },
        },
        'gradient-rotate': {
          '0%': { '--angle': '0deg' },
          '100%': { '--angle': '360deg' },
        },
        'slide-up-spring': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '60%': { transform: 'translateY(-5%)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        'border-glow-cycle': {
          '0%, 100%': { borderColor: 'rgba(245, 158, 11, 0.6)' },
          '33%': { borderColor: 'rgba(245, 158, 11, 0.9)' },
          '66%': { borderColor: 'rgba(252, 211, 77, 0.7)' },
        },
      },
    },
  },
  plugins: [],
};
