import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy Todoist API to avoid CORS issues in dev
    proxy: {
      '/api/todoist': {
        target: 'https://api.todoist.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/todoist/, ''),
        secure: true,
      },
      '/api/miraie': {
        target: 'https://app.miraie.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/miraie/, ''),
        secure: true,
      },
    },
  },
});
