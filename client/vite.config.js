import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],

  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },

  server: command === 'serve' ? {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/sse': 'http://localhost:5000',
    },
  } : {},

  build: {
    outDir:    'dist',
    sourcemap: false,
    minify:    'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          maplibre: ['maplibre-gl'],
          axios:    ['axios'],
        },
      },
    },
  },
}));