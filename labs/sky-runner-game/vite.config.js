import { defineConfig } from 'vite';

// Semua request /api di-proxy ke backend Node (port 8080).
// Frontend TIDAK boleh memanggil localhost langsung: browser user ada di sandbox lain.
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8080';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Preview Arena memakai host {port}-{sandboxId}.e2b.app -> izinkan semua host.
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
});
