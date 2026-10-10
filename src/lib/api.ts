export interface Task {
  id: string;
  content: string;
  description: string;
  priority: number; // 4 = urgent … 1 = normal (Todoist)
  due: string | null; // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  recurring: boolean;
  labels: string[];
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  order: number;
}

export interface Section {
  id: string;
  name: string;
  projectId: string;
}

export interface TaskInput {
  content?: string;
  description?: string;
  priority?: number;
  due?: string | null;
  sectionId?: string;
  projectId?: string;
}

export interface ActiveTimer {
  mode: 'study' | 'pyq' | string;
  note: string;
  startTime: string;
  durationSeconds: number;
  secondsRemaining: number;
  isRunning: boolean;
  completed: boolean;
}

export interface StudyState {
  day: string;
  todayStudySeconds: number;
  todayPyqSeconds: number;
  goalSeconds: number;
  pyqGoalSeconds: number;
  streak: number;
  streakPyq: number;
  history: Record<string, number>;
  historyPyq: Record<string, number>;
  activeTimer: ActiveTimer | null;
}

export interface TrackerState {
  subjects: Record<string, Record<string, boolean>>;
  gts: Record<string, boolean>;
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(path, {
    ...rest,
    method: json !== undefined ? 'POST' : rest.method || 'GET',
    headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Something went wrong (${res.status})`);
  return data as T;
}

export const api = {
  tasks: () => request<{ tasks: Task[]; sections: Section[] }>('/api/todoist'),
  addTask: (data: TaskInput) => request<{ task: Task }>('/api/todoist', { json: { op: 'add', data } }),
  updateTask: (id: string, data: TaskInput) =>
    request<{ task: Task }>('/api/todoist', { json: { op: 'update', id, data } }),
  closeTask: (id: string) => request('/api/todoist', { json: { op: 'close', id } }),
  reopenTask: (id: string) => request('/api/todoist', { json: { op: 'reopen', id } }),
  deleteTask: (id: string) => request('/api/todoist', { json: { op: 'delete', id } }),

  study: () => request<{ state: StudyState }>('/api/study'),
  studyAction: (action: string, payload: Record<string, unknown> = {}) =>
    request<{ state: StudyState }>('/api/study', { json: { action, ...payload } }),

  tracker: () => request<TrackerState>('/api/tracker'),
  setSubject: (subject: string, field: string, value: boolean) =>
    request('/api/tracker', { json: { subject, field, value } }),
  setGt: (gt: string, value: boolean) => request('/api/tracker', { json: { gt, value } }),
};
