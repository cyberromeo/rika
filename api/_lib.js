// Shared helpers for the serverless functions. Files that start with "_"
// are not exposed as routes by Vercel.

export function send(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).send(JSON.stringify(data));
}

export function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b;
}

export function env(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

export function missing(res, what) {
  return send(res, 503, { error: `${what} is not set up on the server.` });
}
