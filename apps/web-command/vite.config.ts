import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
const cesiumBaseUrl = '/cesiumStatic';

export default defineConfig({
  envDir: resolve(__dirname, '../..'),
  plugins: [react()],
  define: {
    CESIUM_BASE_URL: JSON.stringify(cesiumBaseUrl),
  },
  server: {
    host: true,
    port: 8081,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
});
