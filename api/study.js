import { send, readBody, env, missing } from './_lib.js';

// Study time + focus timer, stored by the medx API (shared with the iOS app).
const DEFAULT_URL = 'https://medx.srihari.quest/api/studytime';
const ACTIONS = new Set([
  'start_timer', 'pause_timer', 'resume_timer', 'cancel_timer',
  'log', 'set_goal', 'set_pyq_goal',
]);

export default async function handler(req, res) {
  const password = env('MEDX_STUDYTIME_PASSWORD');
  const url = env('MEDX_STUDYTIME_URL') || DEFAULT_URL;
  if (!password) return missing(res, 'Study time');

  try {
    let upstream;
    if (req.method === 'GET') {
      upstream = await fetch(`${url}?password=${encodeURIComponent(password)}`);
    } else if (req.method === 'POST') {
      const body = readBody(req);
      if (!ACTIONS.has(body.action)) return send(res, 400, { error: 'Unknown action.' });
      const payload = { action: body.action, password };
      for (const k of ['durationSeconds', 'mode', 'note', 'seconds', 'goalSeconds', 'pyqGoalSeconds']) {
        if (body[k] !== undefined) payload[k] = body[k];
      }
      payload.source = 'rika';
      upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { error: 'Method not allowed.' });
    }

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.state) {
      return send(res, 502, { error: data.error || `Study service answered ${upstream.status}` });
    }
    const s = data.state;
    return send(res, 200, {
      state: {
        day: s.currentStudyDay,
        todayStudySeconds: s.todayStudySeconds || 0,
        todayPyqSeconds: s.todayPyqSeconds || 0,
        goalSeconds: s.dailyGoalSeconds || 0,
        pyqGoalSeconds: s.dailyPyqGoalSeconds || 0,
        streak: s.streak || 0,
        streakPyq: s.streakPyq || 0,
        history: s.history || {},
        historyPyq: s.historyPyq || {},
        activeTimer: s.activeTimer
          ? {
              mode: s.activeTimer.mode,
              note: s.activeTimer.note || '',
              startTime: s.activeTimer.startTime,
              durationSeconds: s.activeTimer.durationSeconds,
              secondsRemaining: s.activeTimer.secondsRemaining,
              isRunning: Boolean(s.activeTimer.isRunning),
              completed: Boolean(s.activeTimer.completed),
            }
          : null,
      },
    });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
}
