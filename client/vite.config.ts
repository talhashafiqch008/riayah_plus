import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    {
      name: 'paytabs-spa-post-to-get',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '/';
          if (
            req.method === 'POST' &&
            !url.startsWith('/api') &&
            !url.startsWith('/socket.io')
          ) {
            res.statusCode = 303;
            res.setHeader('Location', url);
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    https: {},
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'framer-motion'],
          charts: ['recharts'],
          stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          livekit: ['livekit-client', '@livekit/components-react'],
        },
      },
    },
  },
});
