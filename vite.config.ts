import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/submissions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/events': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/officers': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/statistics': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/game-api': {
        target: 'https://wos-giftcode-api.centurygame.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/game-api/, '/api'),
      },
    },
    // 支持 SPA 路由 - 將不存在的路由導向 index.html
    middlewareMode: false,
  },
});