import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), mkcert(), wasm()],
  server: {
    port: 3000, // Changed back to 3000 for React game
    // Proxy Torii GraphQL requests to avoid CORS issues
    proxy: {
      '/torii-graphql': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/torii-graphql/, '/graphql'),
      },
      '/torii-grpc': {
        target: 'http://localhost:50051',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/torii-grpc/, ''),
        ws: true, // Enable WebSocket proxy for gRPC-Web
      },
    },
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

