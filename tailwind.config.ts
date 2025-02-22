import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'uniss-black': '#1A1A1A',
        'uniss-blue': '#1D4ED8',    // Ejemplo azul institucional
        'uniss-gold': '#D4AF37',    // Ejemplo dorado institucional
        'uniss-green': '#2E7D32',   // Ejemplo verde para estado
      },
      fontFamily: {
        // Fuentes personalizadas
        title: ['Poppins', 'sans-serif'], // Ejemplo de fuente para títulos
        body: ['Roboto', 'sans-serif'] // Ejemplo de fuente para cuerpo
      },
      keyframes: {
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        blink: {
          '50%': { borderColor: 'transparent' },
        },
      },
      animation: {
        typing: 'typing 3s steps(40) forwards',
        blink: 'blink 0.75s step-end infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
