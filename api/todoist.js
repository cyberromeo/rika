import { send, readBody, env, missing } from './_lib.js';

// Todoist REST API v1. The token stays on the server; the browser never sees it.
const BASE = 'https://api.todoist.com/api/v1';

function token() {
  return env('TODOIST_API_TOKEN', 'VITE_TODOIST_API_TOKEN');
}

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Todoist ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function listAll(path) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ limit: '200' });
    if (cursor) q.set('cursor', cursor);
    const page = await call(`${path}?${q}`);
    out.push(...(page?.results || []));
    cursor = page?.next_cursor;
    if (!cursor) break;
  }
  return out;
}

function slim(t) {
  return {
    id: t.id,
    content: t.content,
    description: t.description || '',
    priority: t.priority || 1,
    due: t.due ? t.due.date : null,
    recurring: Boolean(t.due && t.due.is_recurring),
    labels: t.labels || [],
    projectId: t.project_id,
    sectionId: t.section_id || null,
    parentId: t.parent_id || null,
    order: t.child_order || 0,
  };
}

function cleanInput(data = {}) {
  const out = {};
  if (typeof data.content === 'string') out.content = data.content.slice(0, 500);
  if (typeof data.description === 'string') out.description = data.description.slice(0, 4000);
  if ([1, 2, 3, 4].includes(data.priority)) out.priority = data.priority;
  if (data.due === null) out.due_string = 'no date';
  else if (typeof data.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.due)) out.due_date = data.due;
  if (typeof data.sectionId === 'string' && data.sectionId) out.section_id = data.sectionId;
  if (typeof data.projectId === 'string' && data.projectId) out.project_id = data.projectId;
  return out;
}

export default async function handler(req, res) {
  if (!token()) return missing(res, 'Todoist');
  try {
    if (req.method === 'GET') {
      const [tasks, sections] = await Promise.all([listAll('/tasks'), listAll('/sections')]);
      return send(res, 200, {
        tasks: tasks.map(slim),
        sections: sections.map((s) => ({ id: s.id, name: s.name, projectId: s.project_id })),
      });
    }

    if (req.method === 'POST') {
      const { op, id, data } = readBody(req);
      const safeId = typeof id === 'string' && /^[\w-]{1,64}$/.test(id) ? id : null;

      switch (op) {
        case 'add': {
          const input = cleanInput(data);
          if (!input.content) return send(res, 400, { error: 'A task needs a name.' });
          const task = await call('/tasks', { method: 'POST', body: JSON.stringify(input) });
          return send(res, 200, { task: slim(task) });
        }
        case 'update': {
          if (!safeId) return send(res, 400, { error: 'Missing task.' });
          const input = cleanInput(data);
          delete input.section_id;
          delete input.project_id;
          const task = await call(`/tasks/${safeId}`, { method: 'POST', body: JSON.stringify(input) });
          return send(res, 200, { task: slim(task) });
        }
        case 'close':
        case 'reopen': {
          if (!safeId) return send(res, 400, { error: 'Missing task.' });
          await call(`/tasks/${safeId}/${op}`, { method: 'POST' });
          return send(res, 200, { ok: true });
        }
        case 'delete': {
          if (!safeId) return send(res, 400, { error: 'Missing task.' });
          await call(`/tasks/${safeId}`, { method: 'DELETE' });
          return send(res, 200, { ok: true });
        }
        default:
          return send(res, 400, { error: 'Unknown action.' });
      }
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (e) {
    return send(res, e.status === 401 || e.status === 403 ? 502 : 500, { error: String(e.message || e) });
  }
}
