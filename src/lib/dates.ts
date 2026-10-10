const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const todayYmd = () => ymd(new Date());

const DAY = 86400000;
export function dayDiff(a: string, b: string): number {
  return Math.round((parseYmd(a).getTime() - parseYmd(b).getTime()) / DAY);
}

export function friendlyDue(due: string): string {
  const diff = dayDiff(due, todayYmd());
  const time = due.length > 10 ? ' · ' + formatTime(due) : '';
  if (diff === 0) return 'Today' + time;
  if (diff === 1) return 'Tomorrow' + time;
  if (diff === -1) return 'Yesterday' + time;
  const d = parseYmd(due);
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' }) + time;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }) + time
  );
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function longDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function hm(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// The study day rolls over at 8 AM IST (same rule the study service uses).
export function studyDay(now = new Date()): string {
  const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000);
  if (ist.getHours() < 8) ist.setDate(ist.getDate() - 1);
  return ymd(ist);
}

export const EXAM_DATE = (import.meta.env.VITE_FMGE_EXAM_DATE as string | undefined) || '2026-10-31';
