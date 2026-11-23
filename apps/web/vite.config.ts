import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lo define el workflow de GitHub Pages (p. ej. /getaway-adventures-502/)
// envDir: el .env vive en la raíz del monorepo
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
});
