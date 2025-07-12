import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'uniss-black': '#1A1A1A',
        'uniss-blue': '#1D4ED8',
        'uniss-gold': '#D4AF37',
        'uniss-green': '#2E7D32',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
        roboto: ['var(--font-roboto)'],
        poppins: ['var(--font-poppins)'],
      },
      keyframes: {
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        blink: {
          '50%': { borderColor: 'transparent' },
        },
        dotTyping: {
          '0%, 80%, 100%': { 
            transform: 'translateY(0)',
            opacity: '0.5'
          },
          '40%': {
            transform: 'translateY(-6px)',
            opacity: '1'
          }
        }
      },
      animation: {
        typing: 'typing 3s steps(40) forwards',
        blink: 'blink 0.75s step-end infinite',
        dotTyping: 'dotTyping 1.4s infinite ease-in-out'
      },
    },
  },
  plugins: [],
} satisfies Config;