const API_ENDPOINTS = [
  '/api/motra',
  'https://api.srihari.quest/api/motra',
];
const LOCAL_STORAGE_KEY = 'rika_motra_data_v1';

/** The 18 muscles the Motra recovery model tracks. */
export const MUSCLE_KEYS = [
  'abductors', 'abs', 'adductors', 'biceps', 'calves', 'chest',
  'forearms', 'glutes', 'hamstrings', 'hipFlexors', 'lats', 'lowerBack',
  'obliques', 'quads', 'shoulders', 'tibialisAnterior', 'traps', 'triceps',
] as const;

export type MuscleKey = typeof MUSCLE_KEYS[number];

export const MUSCLE_LABELS: Record<string, string> = {
  abductors: 'Abductors',
  abs: 'Abs',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  hipFlexors: 'Hip Flexors',
  lats: 'Lats',
  lowerBack: 'Lower Back',
  obliques: 'Obliques',
  quads: 'Quads',
  shoulders: 'Shoulders',
  tibialisAnterior: 'Tibialis Ant.',
  traps: 'Traps',
  triceps: 'Triceps',
};

export interface MuscleRecovery {
  recovery: number;
  daysToRecovery: number;
  daysSinceLastUsed: number | null;
  workoutDays: number[];
}

export interface MuscleNeedingRecovery {
  muscle: string;
  recovery: number;
  days_to_recovery: number;
}

export interface WeeklyDay {
  date: string;
  weekday: string;
  workouts: number;
  minutes: number;
  calories: number;
  sets: number;
  reps: number;
  tvl: number;
  trained: boolean;
}

export interface WeeklySummary {
  week_start: string;
  days_trained: number;
  total_workouts: number;
  total_minutes: number;
  total_duration: string;
  total_calories: number;
  total_sets: number;
  total_reps: number;
  total_volume_kg: number;
  days: WeeklyDay[];
}

export interface PersonalRecord {
  exercise: string;
  type: string;
  weight_kg?: number;
  reps?: number;
}

/** One logged set inside an exercise. `phase` is 'warmup' or 'main'. */
export interface ExerciseSet {
  set: number;
  phase: string;
  reps: number | null;
  weight_kg: number | null;
  unit: string;
  seconds: number | null;
  rest_seconds: number | null;
}

export interface WorkoutExercise {
  exercise: string;
  exercise_id: string;
  category: string;
  segment: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  set_count: number;
  warmup_sets: number;
  total_reps: number;
  top_weight_kg: number | null;
  volume_kg: number;
  /** Pre-formatted by the API, e.g. "12 @ 15kg, 7 @ 15kg". */
  summary: string;
  sets: ExerciseSet[];
}

export interface RecentWorkout {
  id: string;
  name: string;
  date: string;
  duration: string;
  minutes: number;
  calories: number;
  volume_kg: number;
  sets: number;
  primary_muscles: string[];
  secondary_muscles: string[];
  pr_count: number;
  personal_records: PersonalRecord[];
  exercises: WorkoutExercise[];
}

export interface MuscleGroupStat {
  group: string;
  reps: number;
  sets: number;
  volume_kg: number;
}

export interface OverallStats {
  lifetime_workouts: number;
  period_workouts: number;
  period_reps: number;
  period_sets: number;
  period_volume_kg: number;
  period_calories: number;
  period_minutes: number;
  leaderboard_rank: number;
  leaderboard_prev_rank: number;
  leaderboard_delta: number;
  top_exercises: string[];
}

export interface MotraData {
  overall_recovery: string;
  recovered_muscles: string;
  recovering_muscles: number;
  days_since_workout: number;
  muscles: Record<string, MuscleRecovery>;
  updated_at: string;
  streak: { current_days: number; minutes: number; minutes_goal: number };
  lifetime: { workouts: number; train_workouts: number; external_workouts: number };
  last_workout: { name: string; date: string } | null;
  weekly: WeeklySummary;
  overall: OverallStats;
  muscle_groups: MuscleGroupStat[];
  recent_workouts: RecentWorkout[];
  muscles_needing_recovery: MuscleNeedingRecovery[];
}

const FULLY_RECOVERED: MuscleRecovery = {
  recovery: 100,
  daysToRecovery: 0,
  daysSinceLastUsed: null,
  workoutDays: [],
};

function buildDefaultMuscles(): Record<string, MuscleRecovery> {
  const out: Record<string, MuscleRecovery> = {};
  MUSCLE_KEYS.forEach(k => { out[k] = { ...FULLY_RECOVERED }; });
  return out;
}

const DEFAULT_STATE: MotraData = {
  overall_recovery: '100%',
  recovered_muscles: `${MUSCLE_KEYS.length}/${MUSCLE_KEYS.length}`,
  recovering_muscles: 0,
  days_since_workout: 0,
  muscles: buildDefaultMuscles(),
  updated_at: '',
  streak: { current_days: 0, minutes: 0, minutes_goal: 100 },
  lifetime: { workouts: 0, train_workouts: 0, external_workouts: 0 },
  last_workout: null,
  weekly: {
    week_start: '',
    days_trained: 0,
    total_workouts: 0,
    total_minutes: 0,
    total_duration: '0m',
    total_calories: 0,
    total_sets: 0,
    total_reps: 0,
    total_volume_kg: 0,
    days: [],
  },
  overall: {
    lifetime_workouts: 0,
    period_workouts: 0,
    period_reps: 0,
    period_sets: 0,
    period_volume_kg: 0,
    period_calories: 0,
    period_minutes: 0,
    leaderboard_rank: 0,
    leaderboard_prev_rank: 0,
    leaderboard_delta: 0,
    top_exercises: [],
  },
  muscle_groups: [],
  recent_workouts: [],
  muscles_needing_recovery: [],
};

/** Merge an API payload over the defaults so the UI never has to null-guard. */
function mergeState(raw: any): MotraData {
  const muscles = buildDefaultMuscles();
  if (raw?.muscles && typeof raw.muscles === 'object') {
    Object.keys(raw.muscles).forEach(k => {
      muscles[k] = { ...FULLY_RECOVERED, ...raw.muscles[k] };
    });
  }
  return {
    ...DEFAULT_STATE,
    ...raw,
    muscles,
    streak: { ...DEFAULT_STATE.streak, ...(raw?.streak || {}) },
    lifetime: { ...DEFAULT_STATE.lifetime, ...(raw?.lifetime || {}) },
    weekly: { ...DEFAULT_STATE.weekly, ...(raw?.weekly || {}) },
    overall: { ...DEFAULT_STATE.overall, ...(raw?.overall || {}) },
    muscle_groups: raw?.muscle_groups || [],
    recent_workouts: raw?.recent_workouts || [],
    muscles_needing_recovery: raw?.muscles_needing_recovery || [],
  };
}

function getLocalState(): MotraData | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return mergeState(JSON.parse(saved));
  } catch (e) {
    console.error('Error reading motra local storage:', e);
  }
  return null;
}

function saveLocalState(state: MotraData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving motra local storage:', e);
  }
}

export async function getMotraData(): Promise<MotraData> {
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json?.status === 'success' && json.data) {
          const merged = mergeState(json.data);
          saveLocalState(merged);
          return merged;
        }
      }
    } catch (error) {
      // try next endpoint
    }
  }
  return getLocalState() || DEFAULT_STATE;
}

export function subscribeMotraData(
  callback: (data: MotraData) => void,
  intervalMs = 60_000,
): () => void {
  let isCancelled = false;

  const fetchLatest = async () => {
    if (isCancelled) return;
    const latest = await getMotraData();
    if (!isCancelled) callback(latest);
  };

  fetchLatest();
  const id = setInterval(fetchLatest, intervalMs);

  return () => {
    isCancelled = true;
    clearInterval(id);
  };
}

/** `"97%"` → `97`. */
export function parseRecoveryPercent(value: string): number {
  const n = parseInt(String(value ?? '').replace('%', ''), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

export type RecoveryTier = 'fatigued' | 'sore' | 'nearly' | 'ready';

export function recoveryTier(recovery: number): RecoveryTier {
  if (recovery >= 100) return 'ready';
  if (recovery >= 75) return 'nearly';
  if (recovery >= 50) return 'sore';
  return 'fatigued';
}

/**
 * The six axes the radar chart plots, in clockwise render order starting from
 * the top-left spoke. Chest and Arms sit adjacent (bottom-left / bottom-right)
 * so a push-and-pull week reads as a filled wedge rather than a straight line.
 */
export const MUSCLE_GROUP_AXES = ['back', 'shoulders', 'core', 'arms', 'chest', 'legs'] as const;
export type MuscleGroupAxis = typeof MUSCLE_GROUP_AXES[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroupAxis, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  core: 'Core',
  arms: 'Arms',
  legs: 'Legs',
  back: 'Back',
};

/** Group names the API may use that don't match an axis name outright. */
const GROUP_ALIASES: Record<string, MuscleGroupAxis> = {
  abs: 'core',
  obliques: 'core',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  lats: 'back',
  traps: 'back',
  lowerback: 'back',
  'lower back': 'back',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
};

/**
 * The API only returns groups that have data, so fold its sparse list onto all
 * six axes with zeros for the rest — otherwise the radar would collapse.
 */
export function normalizeMuscleGroups(
  stats: MuscleGroupStat[],
): Record<MuscleGroupAxis, MuscleGroupStat> {
  const out = {} as Record<MuscleGroupAxis, MuscleGroupStat>;
  MUSCLE_GROUP_AXES.forEach(axis => {
    out[axis] = { group: axis, reps: 0, sets: 0, volume_kg: 0 };
  });

  (stats || []).forEach(s => {
    const key = String(s.group || '').toLowerCase();
    const axis = (MUSCLE_GROUP_AXES as readonly string[]).includes(key)
      ? (key as MuscleGroupAxis)
      : GROUP_ALIASES[key];
    if (!axis) return;
    out[axis].reps += s.reps || 0;
    out[axis].sets += s.sets || 0;
    out[axis].volume_kg += s.volume_kg || 0;
  });

  return out;
}
