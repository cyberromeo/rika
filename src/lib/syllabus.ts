export const SUBJECTS = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Microbiology', 'Pharmacology', 'Forensic medicine',
  'Community Medicine (PSM)', 'General Medicine', 'General Surgery',
  'Obstetrics & Gynecology (OBG)', 'Pediatrics', 'Ophthalmology',
  'Otorhinolaryngology (ENT)', 'Orthopedics', 'Anesthesiology',
  'Dermatology & Venereology', 'Psychiatry', 'Radiodiagnosis (Radiology)',
];

// Shorter names for small screens; the stored keys above stay unchanged.
export const SHORT: Record<string, string> = {
  'Forensic medicine': 'Forensic Medicine',
  'Community Medicine (PSM)': 'PSM',
  'Obstetrics & Gynecology (OBG)': 'OBG',
  'Otorhinolaryngology (ENT)': 'ENT',
  'Dermatology & Venereology': 'Dermatology',
  'Radiodiagnosis (Radiology)': 'Radiology',
};
export const shortName = (s: string) => SHORT[s] || s;

export const FIELDS: { key: string; label: string }[] = [
  { key: 'Videos', label: 'Videos' },
  { key: 'Qbank', label: 'Qbank' },
  { key: 'PYQs', label: 'PYQs' },
  { key: 'R1', label: 'Rev 1' },
  { key: 'R2', label: 'Rev 2' },
  { key: 'RevisionVideos', label: 'Rev videos' },
];

export const GTS = ['GT1', 'GT2', 'GT3', 'GT4', 'GT5', 'GT6', 'GT7'];

export const TOTAL_ITEMS = SUBJECTS.length * FIELDS.length + GTS.length;

export function subjectDone(row: Record<string, boolean> | undefined): number {
  if (!row) return 0;
  return FIELDS.filter((f) => row[f.key]).length;
}

export function overallProgress(t: { subjects: Record<string, Record<string, boolean>>; gts: Record<string, boolean> }) {
  let done = 0;
  for (const s of SUBJECTS) done += subjectDone(t.subjects[s]);
  for (const g of GTS) if (t.gts[g]) done++;
  return { done, total: TOTAL_ITEMS, pct: Math.round((done / TOTAL_ITEMS) * 100) };
}
