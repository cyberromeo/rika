// MirAIe Power Consumption API
// Device: Panasonic AC (36ff8e5467b2)

const isDev = import.meta.env.DEV;
const API_BASE = isDev
  ? '/api/miraie/simplifi/v1'
  : 'https://app.miraie.in/simplifi/v1';
const DEVICE_ID = import.meta.env.VITE_MIRAIE_DEVICE_ID;
const AUTH_TOKEN = import.meta.env.VITE_MIRAIE_AUTH_TOKEN;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DailyPowerEntry {
  power: number;
  day: string; // DDMMYYYY
}

export interface WeeklyPowerEntry {
  power: number;
  week: string; // DDMMYYYY (week start date)
}

export interface MonthlyPowerEntry {
  power: number;
  month: string; // MMYYYY
}

interface PowerResponse<T> {
  value: T[];
  Count: number;
}

// ─── Date Format Helpers ─────────────────────────────────────────────────────

/** Pad a number to 2 digits */
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Convert JS Date → DDMMYYYY */
export function dateToDDMMYYYY(d: Date): string {
  return `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;
}

/** Convert JS Date → MMYYYY */
export function dateToMMYYYY(d: Date): string {
  return `${pad2(d.getMonth() + 1)}${d.getFullYear()}`;
}

/** Convert DDMMYYYY → YYYY-MM-DD */
export function ddmmyyyyToISO(s: string): string {
  const day = s.substring(0, 2);
  const month = s.substring(2, 4);
  const year = s.substring(4, 8);
  return `${year}-${month}-${day}`;
}

/** Convert MMYYYY → YYYY-MM */
export function mmyyyyToYYYYMM(s: string): string {
  const month = s.substring(0, 2);
  const year = s.substring(2, 6);
  return `${year}-${month}`;
}

/** Convert YYYY-MM-DD → DDMMYYYY */
export function isoToDDMMYYYY(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}${month}${year}`;
}

// ─── API Fetcher ─────────────────────────────────────────────────────────────

async function fetchPower<T>(params: string): Promise<T[]> {
  const url = `${API_BASE}/powerConsumption/devices/${DEVICE_ID}?${params}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MirAIe API ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Fetch daily power consumption between two dates */
export async function fetchDailyPower(
  startDate: Date,
  endDate: Date
): Promise<DailyPowerEntry[]> {
  const start = dateToDDMMYYYY(startDate);
  const end = dateToDDMMYYYY(endDate);
  return fetchPower<DailyPowerEntry>(`grain=Daily&startDate=${start}&endDate=${end}`);
}

/** Fetch weekly power consumption between two dates */
export async function fetchWeeklyPower(
  startDate: Date,
  endDate: Date
): Promise<WeeklyPowerEntry[]> {
  const start = dateToDDMMYYYY(startDate);
  const end = dateToDDMMYYYY(endDate);
  return fetchPower<WeeklyPowerEntry>(`grain=Weekly&startDate=${start}&endDate=${end}`);
}

/** Fetch monthly power consumption between two month strings */
export async function fetchMonthlyPower(
  startMonth: Date,
  endMonth: Date
): Promise<MonthlyPowerEntry[]> {
  const start = dateToMMYYYY(startMonth);
  const end = dateToMMYYYY(endMonth);
  return fetchPower<MonthlyPowerEntry>(`grain=Monthly&startDate=${start}&endDate=${end}`);
}
