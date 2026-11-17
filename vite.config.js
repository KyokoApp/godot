import { defineConfig } from 'vite';

const TARGET = process.env.API_TARGET || 'http://127.0.0.1:8080';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': { target: TARGET, changeOrigin: true },
      '/ws': { target: TARGET, ws: true, changeOrigin: true },
    },
  },
  build: { outDir: 'dist', target: 'es2020', sourcemap: false },
});
