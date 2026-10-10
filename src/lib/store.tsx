import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type Section, type StudyState, type Task, type TaskInput, type TrackerState } from './api';

type Load<T> = { data: T | null; error: string | null; loading: boolean };

interface Store {
  tasks: Load<Task[]>;
  sections: Section[];
  shoppingSectionIds: Set<string>;
  study: Load<StudyState>;
  tracker: Load<TrackerState>;
  toast: string | null;
  showToast: (msg: string) => void;
  refreshTasks: () => Promise<void>;
  refreshStudy: () => Promise<void>;
  refreshTracker: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (id: string, input: TaskInput) => Promise<boolean>;
  completeTask: (task: Task) => Promise<void>;
  deleteTask: (task: Task) => Promise<void>;
  studyAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
  toggleSubject: (subject: string, field: string) => Promise<void>;
  toggleGt: (gt: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Load<Task[]>>({ data: null, error: null, loading: true });
  const [sections, setSections] = useState<Section[]>([]);
  const [study, setStudy] = useState<Load<StudyState>>({ data: null, error: null, loading: true });
  const [tracker, setTracker] = useState<Load<TrackerState>>({ data: null, error: null, loading: true });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      const r = await api.tasks();
      setTasks({ data: r.tasks, error: null, loading: false });
      setSections(r.sections);
    } catch (e) {
      setTasks((s) => ({ ...s, error: errorText(e), loading: false }));
    }
  }, []);

  const refreshStudy = useCallback(async () => {
    try {
      const r = await api.study();
      setStudy({ data: r.state, error: null, loading: false });
    } catch (e) {
      setStudy((s) => ({ ...s, error: errorText(e), loading: false }));
    }
  }, []);

  const refreshTracker = useCallback(async () => {
    try {
      const r = await api.tracker();
      setTracker({ data: r, error: null, loading: false });
    } catch (e) {
      setTracker((s) => ({ ...s, error: errorText(e), loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshTasks();
    refreshStudy();
    refreshTracker();
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshTasks();
        refreshStudy();
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [refreshTasks, refreshStudy, refreshTracker]);

  const shoppingSectionIds = useMemo(
    () => new Set(sections.filter((s) => /shopping|grocer/i.test(s.name)).map((s) => s.id)),
    [sections],
  );

  const addTask = useCallback(
    async (input: TaskInput) => {
      try {
        const { task } = await api.addTask(input);
        setTasks((s) => ({ ...s, data: [...(s.data || []), task] }));
        showToast('Task added');
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
    [showToast],
  );

  const updateTask = useCallback(
    async (id: string, input: TaskInput) => {
      try {
        const { task } = await api.updateTask(id, input);
        setTasks((s) => ({ ...s, data: (s.data || []).map((t) => (t.id === id ? task : t)) }));
        showToast('Saved');
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
    [showToast],
  );

  const completeTask = useCallback(
    async (task: Task) => {
      setTasks((s) => ({ ...s, data: (s.data || []).filter((t) => t.id !== task.id) }));
      try {
        await api.closeTask(task.id);
        // A recurring task comes back with its next date.
        if (task.recurring) refreshTasks();
        showToast(task.recurring ? 'Done · next one scheduled' : 'Done');
      } catch (e) {
        setTasks((s) => ({ ...s, data: [...(s.data || []), task] }));
        showToast(errorText(e));
      }
    },
    [refreshTasks, showToast],
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      setTasks((s) => ({ ...s, data: (s.data || []).filter((t) => t.id !== task.id) }));
      try {
        await api.deleteTask(task.id);
        showToast('Deleted');
      } catch (e) {
        setTasks((s) => ({ ...s, data: [...(s.data || []), task] }));
        showToast(errorText(e));
      }
    },
    [showToast],
  );

  const studyAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      try {
        const r = await api.studyAction(action, payload);
        setStudy({ data: r.state, error: null, loading: false });
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
    [showToast],
  );

  const toggleSubject = useCallback(
    async (subject: string, field: string) => {
      const current = Boolean(tracker.data?.subjects?.[subject]?.[field]);
      const flip = (v: boolean) =>
        setTracker((s) =>
          s.data
            ? {
                ...s,
                data: {
                  ...s.data,
                  subjects: { ...s.data.subjects, [subject]: { ...(s.data.subjects[subject] || {}), [field]: v } },
                },
              }
            : s,
        );
      flip(!current);
      try {
        await api.setSubject(subject, field, !current);
      } catch (e) {
        flip(current);
        showToast(errorText(e));
      }
    },
    [tracker.data, showToast],
  );

  const toggleGt = useCallback(
    async (gt: string) => {
      const current = Boolean(tracker.data?.gts?.[gt]);
      const flip = (v: boolean) =>
        setTracker((s) => (s.data ? { ...s, data: { ...s.data, gts: { ...s.data.gts, [gt]: v } } } : s));
      flip(!current);
      try {
        await api.setGt(gt, !current);
      } catch (e) {
        flip(current);
        showToast(errorText(e));
      }
    },
    [tracker.data, showToast],
  );

  const value: Store = {
    tasks, sections, shoppingSectionIds, study, tracker, toast, showToast,
    refreshTasks, refreshStudy, refreshTracker, addTask, updateTask, completeTask, deleteTask,
    studyAction, toggleSubject, toggleGt,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
