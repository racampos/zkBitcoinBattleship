import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), mkcert(), wasm()],
  server: {
    port: 4000,
    // Aggressive cache busting for development
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true, // Force file watching with polling
    },
  },
  define: {
    // Polyfill for Node.js globals required by some packages (e.g., Atomiq SDK)
    global: 'globalThis',
  },
  // Disable caching during development
  cacheDir: 'node_modules/.vite',
  optimizeDeps: {
    force: true, // Force re-optimization on every start
  },
});

