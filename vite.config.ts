import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'node:path';

// 통합 앱: admin(React/TS) + WebGL 뷰어(R3F). /api 는 hana-digitaltwin 백엔드로 프록시.
export default defineConfig(({ mode }) => {
  // .env / .env.[mode] 에서 VITE_BASE 를 읽어 배포 base 경로를 결정한다.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), svgr()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5174,
      strictPort: true,
      host: true,
      proxy: {
        '/api': { target: 'http://192.168.10.218:8084', changeOrigin: true },
      },
    },
  };
});
