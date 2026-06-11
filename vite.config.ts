import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 통합 앱: admin(React/TS) + WebGL 뷰어(R3F). /api 는 hana-digitaltwin 백엔드로 프록시.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: 'http://192.168.10.218:8084', changeOrigin: true },
    },
  },
});
