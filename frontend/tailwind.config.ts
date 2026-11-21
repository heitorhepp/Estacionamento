/**
 * tailwind.config.ts
 * Identidade visual do sistema: paleta própria (brand + neutros "ink"),
 * cores semânticas do pátio, fonte Inter, sombras suaves e animações curtas.
 */
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cor primária: azul-cobalto (botões, links, destaques).
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bcd3ff',
          300: '#8eb6ff',
          400: '#598dff',
          500: '#3366ff',
          600: '#1f47f5',
          700: '#1835e1',
          800: '#1a2db6',
          900: '#1c2c8f',
          950: '#151c57',
        },
        // Neutros levemente azulados (textos, bordas, fundos, sidebar).
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b0b9c9',
          400: '#8593ab',
          500: '#667591',
          600: '#515e78',
          700: '#434d62',
          800: '#3a4253',
          900: '#262b36',
          950: '#151821',
        },
        // Cores semânticas do pátio.
        free: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        occupied: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
        overdue: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(21, 24, 33, 0.04), 0 4px 16px rgba(21, 24, 33, 0.06)',
        lift: '0 4px 12px rgba(21, 24, 33, 0.08), 0 16px 40px rgba(21, 24, 33, 0.10)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
