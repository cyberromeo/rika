import { app, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const TRACKER_COL = 'user_tracker';
const LOCAL_STORAGE_KEY = 'fmge_tracker_data_v1';
const DEFAULT_USER_ID = 'NpFFvozZSFWnCKdmutkISEGPf8o2';

const auth = getAuth(app);
let authPromise: Promise<void> | null = null;

export async function ensureAuthenticated(): Promise<void> {
  if (auth.currentUser) return;

  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        unsubscribe();
        resolve();
        return;
      }

      if (!authPromise) {
        authPromise = (async () => {
          try {
            const res = await fetch('/api/firebase-token');
            if (res.ok) {
              const data = await res.json();
              if (data.token) {
                await signInWithCustomToken(auth, data.token);
              }
            } else {
              console.error('Firebase token endpoint status:', res.status);
            }
          } catch (e) {
            console.error('Failed to authenticate with Firebase Auth:', e);
          }
        })();
      }

      try {
        await authPromise;
      } finally {
        unsubscribe();
        resolve();
      }
    });
  });
}

function getUserId(): string {
  return import.meta.env.VITE_FIREBASE_USER_ID || DEFAULT_USER_ID;
}

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
  const userId = getUserId();
  const docRef = doc(db, TRACKER_COL, userId);

  let unsubSnapshot: (() => void) | null = null;
  let isCancelled = false;

  ensureAuthenticated().then(() => {
    if (isCancelled) return;
    unsubSnapshot = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as TrackerData;
          const merged: TrackerData = {
            subjects: { ...INITIAL_STATE.subjects, ...(remoteData.subjects || {}) },
            gts: { ...INITIAL_STATE.gts, ...(remoteData.gts || {}) },
          };
          saveLocalData(merged);
          callback(merged);
        }
      },
      (error) => {
        console.error('Realtime tracker listener error:', error);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubSnapshot) unsubSnapshot();
  };
}

export async function getTrackerData(): Promise<TrackerData> {
  await ensureAuthenticated();
  const userId = getUserId();
  
  try {
    const docRef = doc(db, TRACKER_COL, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const remoteData = docSnap.data() as TrackerData;
      const merged: TrackerData = {
        subjects: { ...INITIAL_STATE.subjects, ...(remoteData.subjects || {}) },
        gts: { ...INITIAL_STATE.gts, ...(remoteData.gts || {}) },
      };
      saveLocalData(merged);
      return merged;
    } else {
      const local = getLocalData();
      const dataToSave = local || INITIAL_STATE;
      await setDoc(docRef, dataToSave, { merge: true });
      saveLocalData(dataToSave);
      return dataToSave;
    }
  } catch (error) {
    console.error('Error fetching tracker data from Firestore:', error);
    return getLocalData() || INITIAL_STATE;
  }
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

  try {
    await ensureAuthenticated();
    const userId = getUserId();
    const docRef = doc(db, TRACKER_COL, userId);
    try {
      await updateDoc(docRef, {
        [`subjects.${subject}.${field}`]: value
      });
    } catch {
      await setDoc(docRef, {
        subjects: {
          [subject]: {
            [field]: value
          }
        }
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error updating subject tracker in Firestore:', error);
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

  try {
    await ensureAuthenticated();
    const userId = getUserId();
    const docRef = doc(db, TRACKER_COL, userId);
    try {
      await updateDoc(docRef, {
        [`gts.${gt}`]: value
      });
    } catch {
      await setDoc(docRef, {
        gts: {
          [gt]: value
        }
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error updating GT tracker in Firestore:', error);
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
