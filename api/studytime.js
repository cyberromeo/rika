import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@medx-e9acd.iam.gserviceaccount.com';
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpjlgjlFfpY++/\nibhrLv+CQVZUN41Drp7mQPSY/nRL3rJOW0gZswy3MkItHNymGbrYHKSzXnqS7mA5\nW0D/hjIel4hHIq0zGvmpkDIxrpFbG+FDgAcJc/G0ES0BlfFvBzRUIRNXZOV5VXwv\n2VJsxRPVnPZGzu1rkHXZHxLqTDPQgIbjGMy8+pcsk5/85uvTex4bdR3Is68qWlgA\nwrH8PmzMLGoZeFH1p9XEAHBTlHgTPL0OTKsiMewmk/ui6BWmAneehgDVzIMT9dd1\nmrRrzpAdTxkQMeCg/1VOUTc10+HB8q9f9qEtwvqyAA8+WIVb+aB6B7+rMwJQCrb+\n4PjjlPDDAgMBAAECggEAAhzIY1UXTUyV8ZR1LDyvKT/IJA93Hpc/2o2HnppY95ME\nNK61dMCC0Yt6QJah9x3N8qBUuvlb3JXEtCI7apOQ70mjBIPdlYvp/V9TCMRsgi6U\nPWOMcuUzZzNplKH6GpCD6eJpm8ahh0P14qC6Aqnn59rnRJWSZqsrlLNq6GlfoeLa\n2l1sQdlzZfdrHmtNl0S1VxyvH9ONSt/I59wnBHo6xH/QyKb7DO3QS8FlA8EaY34X\nQCLazAboGsBDNuTwnfJ5Q8NI1ypUFxt7ZKVBydBat5jEP+6aEBOoi3OW52B2EMyb\nkW7aLXaTrYU5NNtB8TylE483ii3vkDhsvtKXNsCgHQKBgQDQxfodzXFevasm3PZz\nmA6N9Ga082Rlv/rurFMtqrXs1W7ZwAuNXB0pOh28n3KvI0fAxOSrjIHRs8wmPnWK\nhaMwSThwdA3mquAlmZgRsbUJs4yrIxmq6aaDuESMTbO9y7FVl5BY6UCXwlk4d/E6\nlIV40GoggQm5PweBfZJ2I9m+dwKBgQDP6UzkJqcV0FFSxJGfZsEu21SRHnbpVzkS\nl6uY0G/Ph5EcMf5XNHhDA1Hr76qY786AXrGK/MbLEzHRlK7lJVw70Km13WFpUx1g\nTP30EQ97dGy55U2DGlqpa13rCO6eyQ1YhBMBJ0VcKigZsHeoryCoJa7VwIIYk5pX\nwmqPfwl3FQKBgQC4F2rmbqriTMMnwL38zf8/g1wxgVFtO20Mmp257gb/cHCPx/0n\nyCramKlyEvNwpd52h+fPsVUj0bRZoMfKvu5X/Kis2FkNpm2CGj7yk0284TtQCOJw\nSBmRmqGvSjENUhjsDXq2O+++IhzEY1cuPZq4HqcGRGKLm52FvHGyhQhTHwKBgCDw\ndmUjFo+nLGsvh164udyBlTlUmURItFsUunQAeeZoNP5BkWkhf/gl+4Gku+N1AsNl\nvT0m5RvhU6A/rSHStHUpjumoRDmamGncaNOVLF3DyUH+aTRfJYP35a5KAPwZIEso\nyZYCMcPzTd0cDykjbcoWBkgJMtNP90D2JUnMt6QtAoGBAIFcyXNahOxf4EelnIPF\nZg9ugdCJrhgblpWnMvtAP8gdSSYXoOoOKxMI9pMj3YFH89OO14m3/JvDeesDVtMg\nPli8AerqjVq1JLQvrJKF9ivx9uGsfPQu3R3nbdeJdW5t0WF3Bf83VNxFObaxl8uo\ne/yEBDGjK9H6REQYkqwF2YqX\n-----END PRIVATE KEY-----\n';
const privateKey = rawKey.replace(/\\n/g, '\n');
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'medx-e9acd';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const adminDb = getFirestore();
const PASSWORD = 'superstudiopro';
const DEFAULT_DAILY_GOAL = 11 * 3600; // 11 hours
const DEFAULT_PYQ_GOAL = 2 * 3600;    // 2 hours
const DEFAULT_NTFY_TOPIC = 'https://ntfy.sh/medx_study_siren_superstudiopro';

function getStudyDayAnchor(date = new Date()) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + istOffset);

  if (istDate.getHours() < 8) {
    istDate.setDate(istDate.getDate() - 1);
  }
  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calculateStreak(history, currentAnchor, goalSeconds) {
  let streak = 0;
  const [y, m, d] = currentAnchor.split('-').map(Number);
  let checkDate = new Date(y, m - 1, d);

  if ((history[currentAnchor] || 0) >= goalSeconds) {
    streak++;
  }

  while (true) {
    checkDate.setDate(checkDate.getDate() - 1);
    const yyyy = checkDate.getFullYear();
    const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
    const dd = String(checkDate.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;

    const secs = history[key] || 0;
    if (secs >= goalSeconds) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeWeeklySummary(history, historyPyq, currentAnchor, todayStudySecs, todayPyqSecs) {
  const list = [];
  let totalStudySecs = 0;
  let totalPyqSecs = 0;
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    const sSecs = history[key] || (key === currentAnchor ? todayStudySecs : 0);
    const pSecs = historyPyq[key] || (key === currentAnchor ? todayPyqSecs : 0);

    totalStudySecs += sSecs;
    totalPyqSecs += pSecs;

    list.push({
      date: key,
      day: dayName,
      studySeconds: sSecs,
      studyHours: parseFloat((sSecs / 3600).toFixed(2)),
      pyqSeconds: pSecs,
      pyqHours: parseFloat((pSecs / 3600).toFixed(2)),
      totalHours: parseFloat(((sSecs + pSecs) / 3600).toFixed(2)),
    });
  }

  return {
    weeklyHistory: list,
    weeklyStudyTotalHours: parseFloat((totalStudySecs / 3600).toFixed(2)),
    weeklyPyqTotalHours: parseFloat((totalPyqSecs / 3600).toFixed(2)),
    weeklyGrandTotalHours: parseFloat(((totalStudySecs + totalPyqSecs) / 3600).toFixed(2)),
  };
}

async function dispatchSirenWebhook(webhookUrl, mode, durationSeconds) {
  const results = [];
  const titleStr = mode === 'pyq' ? '🚨 PYQ SESSION COMPLETED!' : '🚨 AERO FOCUS TIMER ENDED!';
  const bodyStr = mode === 'pyq' ? 'Great job on PYQs! Keep grinding!' : 'TIMER ENDED! GET BACK TO WORK IMMEDIATELY!';

  try {
    const ntfyRes = await fetch(DEFAULT_NTFY_TOPIC, {
      method: 'POST',
      headers: {
        Title: titleStr,
        Priority: '5',
        Tags: mode === 'pyq' ? 'books,target,fire' : 'warning,alarm_clock,rotating_light',
      },
      body: bodyStr,
    });
    results.push({ target: 'ntfy_default', success: ntfyRes.ok, status: ntfyRes.status });
  } catch (e) {
    results.push({ target: 'ntfy_default', success: false, error: e.message });
  }

  if (webhookUrl && webhookUrl.trim() && webhookUrl.trim() !== DEFAULT_NTFY_TOPIC) {
    try {
      const payload = {
        title: titleStr,
        body: bodyStr,
        message: `${titleStr}\n${bodyStr}`,
        content: `${titleStr}\n**${bodyStr}**`,
        text: `${titleStr}\n${bodyStr}`,
        topic: 'studytime',
        priority: 5,
        event: 'timer_ended',
        mode: mode || 'study',
        durationSeconds: durationSeconds || 3600,
        timestamp: new Date().toISOString(),
      };

      const customRes = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resText = await customRes.text().catch(() => '');
      results.push({
        target: 'custom_webhook',
        success: customRes.ok,
        status: customRes.status,
        response: resText.substring(0, 150),
      });
    } catch (err) {
      results.push({ target: 'custom_webhook', success: false, error: err.message });
    }
  }

  const primaryResult = results.find((r) => r.target === 'custom_webhook') || results[0];
  return {
    success: primaryResult ? primaryResult.success : true,
    results,
    primary: primaryResult,
  };
}

async function getOrInitState() {
  const docRef = adminDb.collection('studyTime').doc('globalState');
  const doc = await docRef.get();
  const todayAnchor = getStudyDayAnchor();

  let state = {
    currentStudyDay: todayAnchor,
    todayStudySeconds: 0,
    todayPyqSeconds: 0,
    dailyGoalSeconds: DEFAULT_DAILY_GOAL,
    dailyPyqGoalSeconds: DEFAULT_PYQ_GOAL,
    history: {},
    historyPyq: {},
    streak: 0,
    streakPyq: 0,
    todos: [],
    webhookUrl: DEFAULT_NTFY_TOPIC,
    activeTimer: null,
    lastUpdated: new Date().toISOString(),
  };

  if (doc.exists) {
    const data = doc.data();
    state = {
      ...state,
      ...data,
      todayPyqSeconds: data.todayPyqSeconds || 0,
      dailyGoalSeconds: data.dailyGoalSeconds || DEFAULT_DAILY_GOAL,
      dailyPyqGoalSeconds: data.dailyPyqGoalSeconds || DEFAULT_PYQ_GOAL,
      history: data.history || {},
      historyPyq: data.historyPyq || {},
      todos: data.todos || [],
      webhookUrl: data.webhookUrl || DEFAULT_NTFY_TOPIC,
      activeTimer: data.activeTimer || null,
    };

    if (state.currentStudyDay !== todayAnchor) {
      const oldAnchor = state.currentStudyDay;
      if (oldAnchor) {
        state.history[oldAnchor] = state.todayStudySeconds || 0;
        state.historyPyq[oldAnchor] = state.todayPyqSeconds || 0;
      }
      state.currentStudyDay = todayAnchor;
      state.todayStudySeconds = 0;
      state.todayPyqSeconds = 0;
      state.todos = (state.todos || []).filter((t) => !t.completed);
    }
  }

  // Cloud timer evaluation
  if (state.activeTimer && state.activeTimer.isRunning) {
    const now = Date.now();
    const startTimeMs = new Date(state.activeTimer.startTime).getTime();
    const elapsedSecs = Math.max(0, Math.floor((now - startTimeMs) / 1000));
    const remainingSecs = Math.max(0, state.activeTimer.durationSeconds - elapsedSecs);

    state.activeTimer.secondsRemaining = remainingSecs;
    state.activeTimer.elapsedSeconds = elapsedSecs;

    if (remainingSecs <= 0 && !state.activeTimer.completed) {
      state.activeTimer.completed = true;
      state.activeTimer.isRunning = false;

      const addedSeconds = state.activeTimer.durationSeconds;
      const mode = state.activeTimer.mode || 'study';

      if (mode === 'pyq') {
        state.todayPyqSeconds = (state.todayPyqSeconds || 0) + addedSeconds;
        state.historyPyq[todayAnchor] = state.todayPyqSeconds;
      } else if (mode === 'study') {
        state.todayStudySeconds = (state.todayStudySeconds || 0) + addedSeconds;
        state.history[todayAnchor] = state.todayStudySeconds;
      }

      await adminDb.collection('studyTimeLogs').add({
        seconds: addedSeconds,
        mode: mode,
        note: state.activeTimer.note || (mode === 'pyq' ? 'Cloud PYQ Session Completed' : 'Cloud Study Session Completed'),
        anchorDay: todayAnchor,
        timestamp: new Date().toISOString(),
        source: 'cloud_timer',
      });

      await dispatchSirenWebhook(
        state.webhookUrl || state.activeTimer.webhookUrl,
        mode,
        addedSeconds
      );
    }
  }

  state.streak = calculateStreak(state.history, todayAnchor, state.dailyGoalSeconds);
  state.streakPyq = calculateStreak(state.historyPyq, todayAnchor, state.dailyPyqGoalSeconds);

  const weeklySummary = computeWeeklySummary(
    state.history,
    state.historyPyq,
    todayAnchor,
    state.todayStudySeconds,
    state.todayPyqSeconds
  );

  state = {
    ...state,
    todayStudyHours: parseFloat((state.todayStudySeconds / 3600).toFixed(2)),
    todayPyqHours: parseFloat((state.todayPyqSeconds / 3600).toFixed(2)),
    ...weeklySummary,
  };

  await docRef.set(state, { merge: true });
  return state;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const pass = req.query.password || (req.body && req.body.password);
    if (pass && pass !== PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized. Incorrect password.' });
    }

    if (req.method === 'GET') {
      const state = await getOrInitState();
      return res.status(200).json({ success: true, state });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const action = body.action;
      const docRef = adminDb.collection('studyTime').doc('globalState');
      const state = await getOrInitState();
      const todayAnchor = getStudyDayAnchor();

      switch (action) {
        case 'start_timer': {
          const durationSeconds = Math.max(10, parseInt(body.durationSeconds || 3600, 10));
          const mode = body.mode || 'study';
          const note = body.note || '';
          const webhookUrl = body.webhookUrl || state.webhookUrl || DEFAULT_NTFY_TOPIC;

          state.activeTimer = {
            id: 'timer_' + Date.now(),
            startTime: new Date().toISOString(),
            durationSeconds,
            mode,
            note,
            webhookUrl,
            isRunning: true,
            completed: false,
            secondsRemaining: durationSeconds,
            elapsedSeconds: 0,
          };
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'pause_timer': {
          if (state.activeTimer && state.activeTimer.isRunning) {
            const now = Date.now();
            const startTimeMs = new Date(state.activeTimer.startTime).getTime();
            const elapsedSecs = Math.max(0, Math.floor((now - startTimeMs) / 1000));
            const remainingSecs = Math.max(0, state.activeTimer.durationSeconds - elapsedSecs);

            state.activeTimer.isRunning = false;
            state.activeTimer.secondsRemaining = remainingSecs;
            state.activeTimer.durationSeconds = remainingSecs;
            state.lastUpdated = new Date().toISOString();
          }
          break;
        }

        case 'resume_timer': {
          if (state.activeTimer && !state.activeTimer.isRunning && !state.activeTimer.completed) {
            const remaining = state.activeTimer.secondsRemaining || state.activeTimer.durationSeconds || 3600;
            state.activeTimer.startTime = new Date().toISOString();
            state.activeTimer.durationSeconds = remaining;
            state.activeTimer.secondsRemaining = remaining;
            state.activeTimer.isRunning = true;
            state.lastUpdated = new Date().toISOString();
          }
          break;
        }

        case 'cancel_timer': {
          state.activeTimer = null;
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'set_webhook': {
          state.webhookUrl = (body.webhookUrl || DEFAULT_NTFY_TOPIC).trim();
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'test_webhook': {
          const targetUrl = body.webhookUrl || state.webhookUrl || DEFAULT_NTFY_TOPIC;
          const result = await dispatchSirenWebhook(targetUrl, 'test', 3600);
          return res.status(200).json({ success: true, result, state });
        }

        case 'log': {
          const addedSeconds = Math.max(0, parseInt(body.seconds || 0, 10));
          const mode = body.mode || 'study';
          const note = body.note || '';

          if (mode === 'pyq') {
            state.todayPyqSeconds = (state.todayPyqSeconds || 0) + addedSeconds;
            state.historyPyq[todayAnchor] = state.todayPyqSeconds;
          } else {
            state.todayStudySeconds = (state.todayStudySeconds || 0) + addedSeconds;
            state.history[todayAnchor] = state.todayStudySeconds;
          }
          state.lastUpdated = new Date().toISOString();

          if (addedSeconds > 0) {
            await adminDb.collection('studyTimeLogs').add({
              seconds: addedSeconds,
              mode,
              note,
              anchorDay: todayAnchor,
              timestamp: new Date().toISOString(),
              source: body.source || 'api',
            });
          }
          break;
        }

        case 'set_seconds': {
          const seconds = Math.max(0, parseInt(body.seconds || 0, 10));
          state.todayStudySeconds = seconds;
          state.history[todayAnchor] = seconds;
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'set_pyq_seconds': {
          const seconds = Math.max(0, parseInt(body.seconds || 0, 10));
          state.todayPyqSeconds = seconds;
          state.historyPyq[todayAnchor] = seconds;
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'set_goal': {
          const goalSeconds = Math.max(60, parseInt(body.goalSeconds || DEFAULT_DAILY_GOAL, 10));
          state.dailyGoalSeconds = goalSeconds;
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'set_pyq_goal': {
          const pyqGoalSeconds = Math.max(60, parseInt(body.pyqGoalSeconds || DEFAULT_PYQ_GOAL, 10));
          state.dailyPyqGoalSeconds = pyqGoalSeconds;
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'reset_today': {
          state.todayStudySeconds = 0;
          state.todayPyqSeconds = 0;
          state.history[todayAnchor] = 0;
          state.historyPyq[todayAnchor] = 0;
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'add_todo': {
          const text = (body.text || '').trim();
          if (text) {
            const newTodo = {
              id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              text,
              completed: false,
              createdAt: new Date().toISOString(),
            };
            state.todos = [newTodo, ...(state.todos || [])];
            state.lastUpdated = new Date().toISOString();
          }
          break;
        }

        case 'toggle_todo': {
          const id = body.id;
          state.todos = (state.todos || []).map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          );
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'delete_todo': {
          const id = body.id;
          state.todos = (state.todos || []).filter((t) => t.id !== id);
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'clear_todos': {
          state.todos = (state.todos || []).filter((t) => !t.completed);
          state.lastUpdated = new Date().toISOString();
          break;
        }

        case 'sync': {
          if (body.state) {
            if (typeof body.state.todayStudySeconds === 'number') {
              state.todayStudySeconds = body.state.todayStudySeconds;
              state.history[todayAnchor] = state.todayStudySeconds;
            }
            if (typeof body.state.todayPyqSeconds === 'number') {
              state.todayPyqSeconds = body.state.todayPyqSeconds;
              state.historyPyq[todayAnchor] = state.todayPyqSeconds;
            }
            if (Array.isArray(body.state.todos)) {
              state.todos = body.state.todos;
            }
            if (typeof body.state.dailyGoalSeconds === 'number') {
              state.dailyGoalSeconds = body.state.dailyGoalSeconds;
            }
            if (typeof body.state.dailyPyqGoalSeconds === 'number') {
              state.dailyPyqGoalSeconds = body.state.dailyPyqGoalSeconds;
            }
            if (typeof body.state.webhookUrl === 'string') {
              state.webhookUrl = body.state.webhookUrl;
            }
            state.lastUpdated = new Date().toISOString();
          }
          break;
        }

        default:
          return res.status(400).json({ error: `Invalid action '${action}'` });
      }

      state.streak = calculateStreak(state.history, todayAnchor, state.dailyGoalSeconds);
      state.streakPyq = calculateStreak(state.historyPyq, todayAnchor, state.dailyPyqGoalSeconds);

      const weeklySummary = computeWeeklySummary(
        state.history,
        state.historyPyq,
        todayAnchor,
        state.todayStudySeconds,
        state.todayPyqSeconds
      );

      const finalState = {
        ...state,
        todayStudyHours: parseFloat((state.todayStudySeconds / 3600).toFixed(2)),
        todayPyqHours: parseFloat((state.todayPyqSeconds / 3600).toFixed(2)),
        ...weeklySummary,
      };

      await docRef.set(finalState, { merge: true });
      return res.status(200).json({ success: true, action, state: finalState });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Studytime API Error:', error);
    return res.status(500).json({
      error: 'Failed to process studytime request',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
