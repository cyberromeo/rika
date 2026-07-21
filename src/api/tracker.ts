import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const TRACKER_COL = 'user_tracker';
const USER_ID = import.meta.env.VITE_FIREBASE_USER_ID;

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

export async function getTrackerData(): Promise<TrackerData> {
  try {
    const docRef = doc(db, TRACKER_COL, USER_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as TrackerData;
      return {
        subjects: { ...INITIAL_STATE.subjects, ...(data.subjects || {}) },
        gts: { ...INITIAL_STATE.gts, ...(data.gts || {}) },
      };
    }
    await setDoc(docRef, INITIAL_STATE);
    return INITIAL_STATE;
  } catch (error) {
    console.error('Error fetching tracker data:', error);
    return INITIAL_STATE;
  }
}

export async function updateSubjectTracker(subject: string, field: string, value: boolean): Promise<void> {
  try {
    const docRef = doc(db, TRACKER_COL, USER_ID);
    await updateDoc(docRef, { [`subjects.${subject}.${field}`]: value });
  } catch (error) {
    console.error('Error updating subject tracker:', error);
  }
}

export async function updateGTTracker(gt: string, value: boolean): Promise<void> {
  try {
    const docRef = doc(db, TRACKER_COL, USER_ID);
    await updateDoc(docRef, { [`gts.${gt}`]: value });
  } catch (error) {
    console.error('Error updating GT tracker:', error);
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
