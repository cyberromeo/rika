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
      '/api/opencode': {
        target: 'https://opencode.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opencode/, ''),
        secure: true,
        headers: {
          'Cookie': 'ext_name=98B976E3G5; auth=Fe26.2**5c4e58cbb87e1a05432606c6475c01df150b6529c2c899685d144470b3472fb5*UiO8lkkP_TsACQVY2JEh0g*6A6vZGC-H3VZXyKewl6n9qY0e43bkEg3ts8HRrWpaOQfrCIyCYq4emxTfO7haUxNE_heiQy5mCuTcx2V4UhgeLgyLisGtuXK5vnzatMVC7O26ce_II1GCdFkt7wqmlE9XOPp8IhAF55fXSeyfjl4L2kBmUlzc6NncNpTsSz_cf1YOyG_Xpn_FJTxRLCM-XNKMYrl5qYL8WwAYVkK3hzBWXRCw4SrkKPKhh7gVA04DV0MzV8UieKT_Zt59bHrHTsDDTakC_BsmTxKPnElxZmRelpYnLbWEWpiFulj4YaFfkiAHHEau5HQZcnkoAbtM2zjB6HSSQLh0-Oa4NMEZ0qnbQ*1815995064814*27a8f7f129c64a04949d1a4245c182ed4b514c288cc87a5b67609e3c9f6d2c55*pjeXaqM9_bQI3daohjmi60ukKlIhCwzqKE-nCK77mVY; desktop_promo_dismissed=1; oc_locale=en',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://accounts.google.com/'
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
          "authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IldjNzdXREtWTkN2N1ZYSGxqZUhzZjZZUjFhM3I3MmxYMnhJdG9zaVF4NHciLCJ0eXAiOiJKV1QifQ.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfRU1vYW1FRVo3M2YwQ2tYYVhwN2hyYW5uIiwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfYWNjb3VudF9pZCI6ImRmMDZhNDBkLTc4ODAtNDIwMC1iZDE3LWZiOTY5YTc1ZWZlMiIsImNoYXRncHRfYWNjb3VudF91c2VyX2lkIjoidXNlci1EdWVjak5Tb3pCRWNzSWtGYlRLNVF2Yk1fX2RmMDZhNDBkLTc4ODAtNDIwMC1iZDE3LWZiOTY5YTc1ZWZlMiIsImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9wbGFuX3R5cGUiOiJnbyIsImNoYXRncHRfdXNlcl9pZCI6InVzZXItRHVlY2pOU296QkVjc0lrRmJUSzVRdmJNIiwidXNlcl9pZCI6InVzZXItRHVlY2pOU296QkVjc0lrRmJUSzVRdmJNIn0sImh0dHBzOi8vYXBpLm9wZW5haS5jb20vcHJvZmlsZSI6eyJlbWFpbCI6InBzcmloYXJpMjM4QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaXNzIjoiaHR0cHM6Ly9hdXRoLm9wZW5haS5jb20iLCJwd2RfYXV0aF90aW1lIjoxNzcwMjE4NTM5MDMwLCJzY3AiOlsib3BlbmlkIiwicHJvZmlsZSIsImVtYWlsIiwib2ZmbGluZV9hY2Nlc3MiXSwic2Vzc2lvbl9pZCI6ImF1dGhzZXNzX3d2UHRPb0lFNXBySTZVcExYdHNaYXJ2UiIsInNsIjp0cnVlLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwNzA0MDkyNzY4MjA3NTU0NDY4OSIsImlhdCI6MTc4Mzg2NjIyOCwiZXhwIjoxNzg0NzMwMjI4LCJqdGkiOiJjOTBhNmViYTEwOGI0MTA2OTAwZmQ5ZDIxZmYwOTAxYiIsIm5iZiI6MTc4Mzg2NjIyOH0.aXE5oWrLDxewQzdAt3k7w5Mse7sWy4Wg5G9YhYDoagVu3-wk8zAFo9nWSiX-vOf9zl13h6Fcql-Yn5zfSr9uT54h-iyza3IHndkOV1Buk748TxAyJ7YQ20L0GiMjgeij3uG-OZSlVIP4ge_u2gjivbFUft5fegBvyGdvuyWyLRfh6yLgcu-5wEVE39Ky_vTToE2cy4UtPxhq39PeXPxRov2O2rzQmCP1u5BBJuST1fpY0aWZGtPyztEgJHjfZ6X1adQy88sEXx53TnxhutkGXPdgVPvl2DusR4zREtkA1ok-0zVOv6A1JMhevm-SXAitg0LqhSS6PJHQ8lmTRctqNQ",
          "chatgpt-account-id": "df06a40d-7880-4200-bd17-fb969a75efe2",
          "oai-language": "en-US",
          "originator": "Codex Desktop",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
          "Cookie": "__cflb=0H28vzvP5FJafnkHxihKb44bdy6fTJD3TaqWTyNP4Xd; __cf_bm=8r7fGgGP2VSBXPwWy147Ih6oERWQnSmsA7B75d1wHJ4-1784518058.5259674-1.0.1.1-d_XbfCnbTorUjiA4q0ejHfws_f6H3yRsvqeEf1F3UI2m5mHX2zV34sE4gjFJC_klC_y4wAjLG2qW_My3hFFXu4WCSBSSUT2DbMXTtXubzS6TKV2WkdCY4CuzCYXE1ogt; _cfuvid=W9UmfL7ROcpwzQXdAmRa7FZroGXGPYuTRY6_Gi64GhM-1784518060.054144-1.0.1.1-sinLQAQUERWl5P9L5Fgk3TlAxV8Uug7JhKMIcjCwRjs",
        }
      },
    },
  },
});
