const PASSWORD = 'superstudiopro';
const LOCAL_STORAGE_KEY = 'rika_studytime_data_v1';
const API_ENDPOINTS = [
  `/api/studytime`,
  `https://medx.srihari.quest/api/studytime`,
];

export interface WeeklyDayLog {
  date: string;
  day: string;
  studySeconds: number;
  studyHours: number;
  pyqSeconds: number;
  pyqHours: number;
  totalHours: number;
}

export interface ActiveTimer {
  id: string;
  startTime: string;
  durationSeconds: number;
  mode: 'study' | 'pyq' | 'break10' | 'break20';
  note?: string;
  webhookUrl?: string;
  isRunning: boolean;
  completed: boolean;
  secondsRemaining?: number;
  elapsedSeconds?: number;
}

export interface StudyTodo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface StudyTimeState {
  currentStudyDay: string;
  todayStudySeconds: number;
  todayPyqSeconds: number;
  dailyGoalSeconds: number;
  dailyPyqGoalSeconds: number;
  todayStudyHours: number;
  todayPyqHours: number;
  streak: number;
  streakPyq: number;
  todos: StudyTodo[];
  webhookUrl: string;
  activeTimer: ActiveTimer | null;
  history: Record<string, number>;
  historyPyq: Record<string, number>;
  weeklyHistory: WeeklyDayLog[];
  weeklyStudyTotalHours: number;
  weeklyPyqTotalHours: number;
  weeklyGrandTotalHours: number;
  lastUpdated?: string;
}

const DEFAULT_STATE: StudyTimeState = {
  currentStudyDay: new Date().toISOString().split('T')[0],
  todayStudySeconds: 0,
  todayPyqSeconds: 0,
  dailyGoalSeconds: 11 * 3600,
  dailyPyqGoalSeconds: 2 * 3600,
  todayStudyHours: 0,
  todayPyqHours: 0,
  streak: 0,
  streakPyq: 0,
  todos: [],
  webhookUrl: '',
  activeTimer: null,
  history: {},
  historyPyq: {},
  weeklyHistory: [],
  weeklyStudyTotalHours: 0,
  weeklyPyqTotalHours: 0,
  weeklyGrandTotalHours: 0,
};

function getLocalState(): StudyTimeState {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_STATE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error reading studytime local storage:', e);
  }
  return DEFAULT_STATE;
}

function saveLocalState(state: StudyTimeState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving studytime local storage:', e);
  }
}

export async function getStudyTimeState(): Promise<StudyTimeState> {
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(`${url}?password=${encodeURIComponent(PASSWORD)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          const merged: StudyTimeState = {
            ...DEFAULT_STATE,
            ...data.state,
          };
          saveLocalState(merged);
          return merged;
        }
      }
    } catch (error) {
      // fallback to next
    }
  }
  return getLocalState();
}

export function subscribeStudyTimeData(callback: (state: StudyTimeState) => void, intervalMs = 5000): () => void {
  let isCancelled = false;

  const fetchLatest = async () => {
    if (isCancelled) return;
    const latest = await getStudyTimeState();
    if (!isCancelled) {
      callback(latest);
    }
  };

  fetchLatest();
  const id = setInterval(fetchLatest, intervalMs);

  return () => {
    isCancelled = true;
    clearInterval(id);
  };
}

export async function postStudyTimeAction(action: string, payload: Record<string, any> = {}): Promise<StudyTimeState | null> {
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: PASSWORD,
          action,
          ...payload,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          saveLocalState(data.state);
          return data.state;
        }
      }
    } catch (error) {
      // fallback
    }
  }
  return null;
}

export async function logStudyTime(seconds: number, mode: 'study' | 'pyq' = 'study', note = ''): Promise<StudyTimeState | null> {
  const current = getLocalState();
  if (mode === 'pyq') {
    current.todayPyqSeconds += seconds;
    current.todayPyqHours = parseFloat((current.todayPyqSeconds / 3600).toFixed(2));
  } else {
    current.todayStudySeconds += seconds;
    current.todayStudyHours = parseFloat((current.todayStudySeconds / 3600).toFixed(2));
  }
  saveLocalState(current);
  return postStudyTimeAction('log', { seconds, mode, note });
}

export async function startCloudTimer(durationSeconds: number, mode: 'study' | 'pyq' | 'break10' | 'break20' = 'study', note = ''): Promise<StudyTimeState | null> {
  return postStudyTimeAction('start_timer', { durationSeconds, mode, note });
}

export async function pauseCloudTimer(): Promise<StudyTimeState | null> {
  return postStudyTimeAction('pause_timer');
}

export async function resumeCloudTimer(): Promise<StudyTimeState | null> {
  return postStudyTimeAction('resume_timer');
}

export async function cancelCloudTimer(): Promise<StudyTimeState | null> {
  return postStudyTimeAction('cancel_timer');
}
