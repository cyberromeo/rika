import { send, readBody, env, missing } from './_lib.js';

// FMGE syllabus tracker, stored by the medx API.
const DEFAULT_URL = 'https://medx.srihari.quest/api/tracker';
const FIELDS = new Set(['Videos', 'R1', 'R2', 'PYQs', 'RevisionVideos', 'Qbank']);

export default async function handler(req, res) {
  const userId = env('MEDX_USER_ID');
  const url = env('MEDX_TRACKER_URL') || DEFAULT_URL;
  if (!userId) return missing(res, 'The FMGE tracker');

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${url}?userId=${encodeURIComponent(userId)}`);
      const data = await r.json().catch(() => null);
      if (!r.ok || !data) return send(res, 502, { error: `Tracker answered ${r.status}` });
      return send(res, 200, { subjects: data.subjects || {}, gts: data.gts || {} });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const value = Boolean(body.value);
      let payload;
      if (typeof body.subject === 'string' && FIELDS.has(body.field)) {
        payload = { userId, subject: body.subject.slice(0, 80), field: body.field, value };
      } else if (typeof body.gt === 'string' && /^GT\d{1,2}$/.test(body.gt)) {
        payload = { userId, gt: body.gt, value };
      } else {
        return send(res, 400, { error: 'Nothing to update.' });
      }
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return send(res, 502, { error: `Tracker answered ${r.status}` });
      return send(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}
