/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#0A84FF',
          deep: '#0060DF',
          sky: '#5AC8FA',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          purple: '#AF52DE',
        },
        ink: {
          base: '#1C1C1E',
          soft: '#3A3A3C',
          mute: '#8E8E93',
          faint: '#C7C7CC',
        },
        canvas: {
          base: '#F5F7FA',
          card: '#FFFFFF',
          tint: '#EBF3FF',
          line: 'rgba(60,60,67,0.10)',
        },
      },
      fontFamily: {
        title: ['Manrope', '"Noto Sans SC"', 'sans-serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22,1,0.36,1) forwards',
        shimmer: 'shimmer 3.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(26px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        soft: '0 2px 12px rgba(20,40,80,0.04)',
        lift: '0 12px 40px rgba(20,40,80,0.08)',
        phone: '0 40px 90px rgba(16,42,90,0.18)',
        glow: '0 16px 44px rgba(10,132,255,0.26)',
      },
    },
  },
  plugins: [],
};
