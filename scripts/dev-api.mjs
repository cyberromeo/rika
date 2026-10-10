// Local stand-in for Vercel's /api routes: `node scripts/dev-api.mjs` (reads .env.local),
// then `npm run dev` proxies /api here.
import http from 'node:http';
import fs from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const routes = {
  '/api/todoist': () => import('../api/todoist.js'),
  '/api/study': () => import('../api/study.js'),
  '/api/tracker': () => import('../api/tracker.js'),
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const load = routes[url.pathname];
    if (!load) {
      res.writeHead(404).end();
      return;
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    req.query = Object.fromEntries(url.searchParams);
    req.body = raw ? JSON.parse(raw) : undefined;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.send = (body) => res.end(body);
    const { default: handler } = await load();
    await handler(req, res);
  })
  .listen(3001, () => console.log('api on http://localhost:3001'));
