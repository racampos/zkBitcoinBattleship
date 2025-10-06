import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), mkcert(), wasm()],
  server: {
    port: 3000,
  },
  define: {
    // Polyfill for Node.js globals required by some packages (e.g., Atomiq SDK)
    global: 'globalThis',
  },
});

