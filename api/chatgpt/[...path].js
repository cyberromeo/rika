export default async function handler(req, res) {
  try {
    const urlPath = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
    const targetUrl = `https://chatgpt.com/${urlPath}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "sentry-trace": "00000000000000000000000000000000-0000000000000000",
        "baggage": "sentry-environment=prod,sentry-release=codex%4026.715.31925,sentry-public_key=6719eaa18601933a26ac21499dcaba2f,sentry-trace_id=00000000000000000000000000000000,sentry-org_id=33249,sentry-sampled=false",
        "authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IldjNzdXREtWTkN2N1ZYSGxqZUhzZjZZUjFhM3I3MmxYMnhJdG9zaVF4NHciLCJ0eXAiOiJKV1QifQ.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfRU1vYW1FRVo3M2YwQ2tYYVhwN2hyYW5uIiwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfYWNjb3VudF9pZCI6ImRmMDZhNDBkLTc4ODAtNDIwMC1iZDE3LWZiOTY5YTc1ZWZlMiIsImNoYXRncHRfYWNjb3VudF91c2VyX2lkIjoidXNlci1EdWVjak5Tb3pCRWNzSWtGYlRLNVF2Yk1fX2RmMDZhNDBkLTc4ODAtNDIwMC1iZDE3LWZiOTY5YTc1ZWZlMiIsImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9wbGFuX3R5cGUiOiJnbyIsImNoYXRncHRfdXNlcl9pZCI6InVzZXItRHVlY2pOU296QkVjc0lrRmJUSzVRdmJNIiwidXNlcl9pZCI6InVzZXItRHVlY2pOU296QkVjc0lrRmJUSzVRdmJNIn0sImh0dHBzOi8vYXBpLm9wZW5haS5jb20vcHJvZmlsZSI6eyJlbWFpbCI6InBzcmloYXJpMjM4QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaXNzIjoiaHR0cHM6Ly9hdXRoLm9wZW5haS5jb20iLCJwd2RfYXV0aF90aW1lIjoxNzcwMjE4NTM5MDMwLCJzY3AiOlsib3BlbmlkIiwicHJvZmlsZSIsImVtYWlsIiwib2ZmbGluZV9hY2Nlc3MiXSwic2Vzc2lvbl9pZCI6ImF1dGhzZXNzX3d2UHRPb0lFNXBySTZVcExYdHNaYXJ2UiIsInNsIjp0cnVlLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwNzA0MDkyNzY4MjA3NTU0NDY4OSIsImlhdCI6MTc4Mzg2NjIyOCwiZXhwIjoxNzg0NzMwMjI4LCJqdGkiOiJjOTBhNmViYTEwOGI0MTA2OTAwZmQ5ZDIxZmYwOTAxYiIsIm5iZiI6MTc4Mzg2NjIyOH0.aXE5oWrLDxewQzdAt3k7w5Mse7sWy4Wg5G9YhYDoagVu3-wk8zAFo9nWSiX-vOf9zl13h6Fcql-Yn5zfSr9uT54h-iyza3IHndkOV1Buk748TxAyJ7YQ20L0GiMjgeij3uG-OZSlVIP4ge_u2gjivbFUft5fegBvyGdvuyWyLRfh6yLgcu-5wEVE39Ky_vTToE2cy4UtPxhq39PeXPxRov2O2rzQmCP1u5BBJuST1fpY0aWZGtPyztEgJHjfZ6X1adQy88sEXx53TnxhutkGXPdgVPvl2DusR4zREtkA1ok-0zVOv6A1JMhevm-SXAitg0LqhSS6PJHQ8lmTRctqNQ",
        "chatgpt-account-id": "df06a40d-7880-4200-bd17-fb969a75efe2",
        "oai-language": "en-US",
        "originator": "Codex Desktop",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "Cookie": "__cflb=0H28vzvP5FJafnkHxihKb44bdy6fTJD3TaqWTyNP4Xd; __cf_bm=8r7fGgGP2VSBXPwWy147Ih6oERWQnSmsA7B75d1wHJ4-1784518058.5259674-1.0.1.1-d_XbfCnbTorUjiA4q0ejHfws_f6H3yRsvqeEf1F3UI2m5mHX2zV34sE4gjFJC_klC_y4wAjLG2qW_My3hFFXu4WCSBSSUT2DbMXTtXubzS6TKV2WkdCY4CuzCYXE1ogt; _cfuvid=W9UmfL7ROcpwzQXdAmRa7FZroGXGPYuTRY6_Gi64GhM-1784518060.054144-1.0.1.1-sinLQAQUERWl5P9L5Fgk3TlAxV8Uug7JhKMIcjCwRjs",
        "Origin": "https://chatgpt.com",
        "Referer": "https://chatgpt.com/",
        "Accept": "*/*"
      }
    });

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
