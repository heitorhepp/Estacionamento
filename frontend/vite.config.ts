/**
 * vite.config.ts
 * Configuração do Vite (servidor de desenvolvimento e build) com o plugin do React.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
