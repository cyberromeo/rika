import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
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
        '/api/opencode': {
          target: 'https://opencode.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/opencode/, ''),
          secure: true,
          headers: {
            'Cookie': env.OPENCODE_COOKIE || '',
            'User-Agent': env.OPENCODE_USER_AGENT || '',
            'Referer': env.OPENCODE_REFERER || ''
          }
        },
      },
    },
  };
});
