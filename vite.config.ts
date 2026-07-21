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
        '/api/chatgpt': {
          target: 'https://chatgpt.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/chatgpt/, ''),
          secure: true,
          headers: {
            "sentry-trace": "00000000000000000000000000000000-0000000000000000",
            "baggage": "sentry-environment=prod,sentry-release=codex%4026.715.31925,sentry-public_key=6719eaa18601933a26ac21499dcaba2f,sentry-trace_id=00000000000000000000000000000000,sentry-org_id=33249,sentry-sampled=false",
            "authorization": env.CHATGPT_AUTHORIZATION || '',
            "chatgpt-account-id": env.CHATGPT_ACCOUNT_ID || '',
            "oai-language": env.CHATGPT_OAI_LANGUAGE || '',
            "originator": env.CHATGPT_ORIGINATOR || '',
            "User-Agent": env.CHATGPT_USER_AGENT || '',
            "Cookie": env.CHATGPT_COOKIE || '',
            "Origin": "https://chatgpt.com",
            "Referer": "https://chatgpt.com/"
          }
        },
      },
    },
  };
});
