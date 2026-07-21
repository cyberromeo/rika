// Todoist API v1 service
// Docs: https://developer.todoist.com/

// In dev, requests go through Vite proxy to avoid CORS; in prod, direct to API
const isDev = import.meta.env.DEV;
const API_BASE = isDev ? '/api/todoist/api/v1' : 'https://api.todoist.com/api/v1';
const API_TOKEN = import.meta.env.VITE_TODOIST_API_TOKEN;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TodoistDue {
  date: string;        // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  string: string;      // human-readable
  is_recurring: boolean;
  timezone: string | null;
  lang: string;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  checked: boolean;
  priority: number;    // 1=normal, 2=medium, 3=high, 4=urgent
  due: TodoistDue | null;
  labels: string[];
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  child_order: number;
  added_at: string;
  updated_at: string;
  completed_at: string | null;
  is_deleted: boolean;
  note_count: number;
}

export interface TodoistSection {
  id: string;
  name: string;
  project_id: string;
  order: number;
}

interface TasksResponse {
  results: TodoistTask[];
  next_cursor: string | null;
}

interface SectionsResponse {
  results: TodoistSection[];
  next_cursor: string | null;
}


// ─── API Helpers ─────────────────────────────────────────────────────────────

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Todoist API ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

async function apiPost<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Todoist API ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchAllTasks(): Promise<TodoistTask[]> {
  const allTasks: TodoistTask[] = [];
  let cursor: string | null = null;

  // Paginate through all tasks
  do {
    const url = cursor ? `/tasks?cursor=${cursor}` : '/tasks';
    const data = await apiGet<TasksResponse>(url);
    allTasks.push(...data.results);
    cursor = data.next_cursor;
  } while (cursor);

  return allTasks;
}

export async function fetchAllSections(): Promise<TodoistSection[]> {
  const allSections: TodoistSection[] = [];
  let cursor: string | null = null;

  do {
    const url = cursor ? `/sections?cursor=${cursor}` : '/sections';
    const data = await apiGet<SectionsResponse>(url);
    allSections.push(...data.results);
    cursor = data.next_cursor;
  } while (cursor);

  return allSections;
}

export async function createTask(data: {
  content: string;
  description?: string;
  due_date?: string;
  priority?: number;
  labels?: string[];
}): Promise<TodoistTask> {
  return apiPost<TodoistTask>('/tasks', data);
}

export async function closeTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Close failed: ${res.status}`);
}

export async function reopenTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/reopen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Reopen failed: ${res.status}`);
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ─── Priority Mapping ────────────────────────────────────────────────────────
// Todoist: 1=normal, 2=medium, 3=high, 4=urgent
// Display: p1=urgent, p2=high, p3=medium, p4=normal
export type DisplayPriority = 'p1' | 'p2' | 'p3' | 'p4';

export function todoistPriorityToDisplay(todoistPriority: number): DisplayPriority {
  switch (todoistPriority) {
    case 4: return 'p1';
    case 3: return 'p2';
    case 2: return 'p3';
    default: return 'p4';
  }
}

export function displayPriorityToTodoist(display: DisplayPriority): number {
  switch (display) {
    case 'p1': return 4;
    case 'p2': return 3;
    case 'p3': return 2;
    default: return 1;
  }
}

// ─── Date Helpers ────────────────────────────────────────────────────────────
// due.date can be "2026-07-08" or "2026-07-08T18:00:00" — extract just the date
export function extractDateFromDue(due: TodoistDue | null): string {
  if (!due) return '';
  const d = due.date;
  // If it contains 'T', take the date part only
  return d.includes('T') ? d.split('T')[0] : d;
}
