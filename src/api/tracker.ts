const TARGET_USER_ID = 'NpFFvozZSFWnCKdmutkISEGPf8o2';
const API_ENDPOINTS = [
  `/api/tracker?userId=${TARGET_USER_ID}`,
  `https://medx.srihari.quest/api/tracker?userId=${TARGET_USER_ID}`,
];
const LOCAL_STORAGE_KEY = 'fmge_tracker_data_v1';

export const SUBJECTS_LIST = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Microbiology', 'Pharmacology', 'Forensic medicine',
  'Community Medicine (PSM)', 'General Medicine', 'General Surgery',
  'Obstetrics & Gynecology (OBG)', 'Pediatrics', 'Ophthalmology',
  'Otorhinolaryngology (ENT)', 'Orthopedics', 'Anesthesiology',
  'Dermatology & Venereology', 'Psychiatry', 'Radiodiagnosis (Radiology)',
];

export const SUBJECT_FIELDS = ['Videos', 'R1', 'R2', 'PYQs', 'RevisionVideos', 'Qbank'];
export const TOTAL_ITEMS = 19 * 6 + 7;

export interface TrackerSubject {
  Videos: boolean;
  R1: boolean;
  R2: boolean;
  PYQs: boolean;
  RevisionVideos: boolean;
  Qbank: boolean;
}

export interface TrackerData {
  subjects: Record<string, TrackerSubject>;
  gts: Record<string, boolean>;
}

const INITIAL_STATE: TrackerData = {
  subjects: {},
  gts: { GT1: false, GT2: false, GT3: false, GT4: false, GT5: false, GT6: false, GT7: false },
};

SUBJECTS_LIST.forEach(sub => {
  INITIAL_STATE.subjects[sub] = {
    Videos: false, R1: false, R2: false, PYQs: false, RevisionVideos: false, Qbank: false,
  };
});

function getLocalData(): TrackerData | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        subjects: { ...INITIAL_STATE.subjects, ...(parsed.subjects || {}) },
        gts: { ...INITIAL_STATE.gts, ...(parsed.gts || {}) },
      };
    }
  } catch (e) {
    console.error('Error reading tracker local storage:', e);
  }
  return null;
}

function saveLocalData(data: TrackerData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving tracker local storage:', e);
  }
}

export function subscribeTrackerData(callback: (data: TrackerData) => void): () => void {
  let isCancelled = false;

  const fetchLatest = async () => {
    if (isCancelled) return;
    const data = await getTrackerData();
    if (!isCancelled) {
      callback(data);
    }
  };

  fetchLatest();
  const intervalId = setInterval(fetchLatest, 5000);

  return () => {
    isCancelled = true;
    clearInterval(intervalId);
  };
}

export async function getTrackerData(): Promise<TrackerData> {
  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const merged: TrackerData = {
          subjects: { ...INITIAL_STATE.subjects, ...(data.subjects || {}) },
          gts: { ...INITIAL_STATE.gts, ...(data.gts || {}) },
        };
        saveLocalData(merged);
        return merged;
      }
    } catch (error) {
      // try next endpoint
    }
  }
  return getLocalData() || INITIAL_STATE;
}

export async function updateSubjectTracker(subject: string, field: string, value: boolean): Promise<void> {
  const current = getLocalData() || INITIAL_STATE;
  const updatedSubjects = {
    ...current.subjects,
    [subject]: {
      ...(current.subjects[subject] || { Videos: false, R1: false, R2: false, PYQs: false, RevisionVideos: false, Qbank: false }),
      [field]: value,
    },
  };
  const updatedData: TrackerData = { ...current, subjects: updatedSubjects };
  saveLocalData(updatedData);

  for (const url of API_ENDPOINTS) {
    try {
      const baseUrl = url.split('?')[0];
      await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: TARGET_USER_ID, subject, field, value }),
      });
      break;
    } catch (error) {
      // fallback
    }
  }
}

export async function updateGTTracker(gt: string, value: boolean): Promise<void> {
  const current = getLocalData() || INITIAL_STATE;
  const updatedGts = {
    ...current.gts,
    [gt]: value,
  };
  const updatedData: TrackerData = { ...current, gts: updatedGts };
  saveLocalData(updatedData);

  for (const url of API_ENDPOINTS) {
    try {
      const baseUrl = url.split('?')[0];
      await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: TARGET_USER_ID, gt, value }),
      });
      break;
    } catch (error) {
      // fallback
    }
  }
}

export function calculateProgress(data: TrackerData): number {
  let count = 0;
  SUBJECTS_LIST.forEach(sub => {
    const s = data.subjects[sub];
    if (s) {
      SUBJECT_FIELDS.forEach(f => { if ((s as any)[f]) count++; });
    }
  });
  Object.keys(data.gts).forEach(gt => {
    if (data.gts[gt]) count++;
  });
  return Math.round((count / TOTAL_ITEMS) * 100) || 0;
}
