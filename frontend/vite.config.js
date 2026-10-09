import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In production nginx serves the build and proxies /api to Flask.
// `npm run dev` mimics that by proxying /api to a locally running backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist' },
});
