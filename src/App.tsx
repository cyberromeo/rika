import { useCallback, useEffect, useState } from 'react';
import type { Task } from './lib/api';
import { StoreProvider, useStore } from './lib/store';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Study from './pages/Study';
import TaskSheet from './components/TaskSheet';
import Icon from './components/Icon';

export type TabId = 'home' | 'tasks' | 'calendar' | 'study';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'tasks', label: 'Tasks', icon: 'checkCircle' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'study', label: 'Study', icon: 'book' },
];

function initialTab(): TabId {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.id === h)?.id as TabId) || 'home';
}

function Shell() {
  const { toast } = useStore();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [taskView, setTaskView] = useState<'all' | 'shopping'>('all');
  const [sheet, setSheet] = useState<{ open: boolean; task?: Task | null; due?: string | null; shopping?: boolean }>({
    open: false,
  });

  useEffect(() => {
    const onHash = () => setTab(initialTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((t: TabId, view?: 'all' | 'shopping') => {
    setTab(t);
    if (view) setTaskView(view);
    window.history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  const openTask = useCallback((task: Task) => setSheet({ open: true, task }), []);
  const newTask = useCallback(
    (opts: { due?: string; shopping?: boolean } = {}) =>
      setSheet({ open: true, task: null, due: opts.due ?? null, shopping: opts.shopping }),
    [],
  );
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);

  return (
    <div className="app">
      <main className="main" key={tab}>
        {tab === 'home' && <Home go={go} openTask={openTask} />}
        {tab === 'tasks' && <Tasks view={taskView} setView={setTaskView} openTask={openTask} newTask={newTask} />}
        {tab === 'calendar' && <Calendar openTask={openTask} newTask={newTask} />}
        {tab === 'study' && <Study />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => go(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <TaskSheet open={sheet.open} onClose={close} task={sheet.task} defaultDue={sheet.due} shopping={sheet.shopping} />

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
