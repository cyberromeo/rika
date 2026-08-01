import { useState, useRef, useEffect } from 'react';
import { App as F7App, Page, Toolbar, ToolbarPane, Link } from 'framework7-react';
import { TaskProvider } from './store/taskStore';
import { PowerProvider } from './store/powerStore';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import StudyPage from './pages/StudyPage';
import AddTaskModal from './components/AddTaskModal';
import UnauthorizedScreen from './components/UnauthorizedScreen';
import { hapticFeedback } from './telegram';

type TabId = 'home' | 'tasks' | 'calendar' | 'study';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'f7:house_fill' },
  { id: 'tasks', label: 'Tasks', icon: 'f7:checkmark_circle_fill' },
  { id: 'calendar', label: 'Calendar', icon: 'f7:calendar_fill' },
  { id: 'study', label: 'Study', icon: 'f7:book_fill' },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>();
  const [cartOpen, setCartOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);

  const handleTabChange = (tab: TabId) => {
    if (tab !== activeTab) {
      // iOS-style haptic on tab switch
      hapticFeedback('light');
      setActiveTab(tab);
    }
  };

  const openAddModal = (date?: string) => {
    hapticFeedback('medium');
    setModalDate(date);
    setIsModalOpen(true);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomePage
            chartOpen={chartOpen}
            setChartOpen={setChartOpen}
            onNavigateFmge={() => handleTabChange('study')}
          />
        );
      case 'tasks':
        return <TasksPage cartOpen={cartOpen} setCartOpen={setCartOpen} />;
      case 'calendar':
        return <CalendarPage onAddTask={openAddModal} />;
      case 'study':
        return <StudyPage />;
    }
  };

  const barsHidden = cartOpen || chartOpen;

  // Framework7 v9's iOS tabbar owns the touch path: initTabbarHighlight()
  // calls preventDefault() on touchstart (killing the native click) and then
  // re-emits a synthetic .click() from its own pointerup handler. When that
  // synthetic click doesn't land — Telegram's WebView, or a pointercancel from
  // finger jitter — the first tap is swallowed and only the second registers.
  //
  // Fix: listen for pointerup ourselves in the CAPTURE phase, so we switch tabs
  // before F7's document-level (bubble phase) handler can interfere. Mouse taps
  // still arrive via the Link's onClick; handleTabChange no-ops on re-taps, so
  // the two paths can't double-fire.
  const f7ToolbarRef = useRef<{ el: HTMLElement } | null>(null);

  useEffect(() => {
    const root = f7ToolbarRef.current?.el ?? null;
    if (!root) return;

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const link = (e.target as HTMLElement | null)?.closest?.('.tab-link');
      if (!link || !root.contains(link)) return;
      const index = Array.prototype.indexOf.call(
        root.querySelectorAll('.tab-link'),
        link
      );
      const tab = TABS[index];
      if (tab) handleTabChange(tab.id);
    };

    root.addEventListener('pointerup', onPointerUp, true);
    return () => root.removeEventListener('pointerup', onPointerUp, true);
  }, [activeTab]);

  return (
    <F7App theme="ios" darkMode className="rika-app">
      <Page pageContent={false} className="app-shell" noNavbar noSwipeback>
        {/* Scrollable content — our own container, deliberately NOT .page-content
            (that class belongs to Framework7 core and brings height:100%). */}
        <div className="app-scroll">
          {renderPage()}
        </div>

        {/* FAB */}
        <button
          className={`fab ${isModalOpen ? 'open' : ''} ${(barsHidden || activeTab !== 'tasks') ? 'hidden' : ''}`}
          onClick={() => openAddModal()}
          aria-label="Add new task"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* iOS 26 liquid-glass tabbar. The sliding pill (.tab-link-highlight) is
            created and repositioned by f7.toolbar.setHighlight(), which the
            Toolbar component calls in a layout effect on every render. */}
        <Toolbar
          tabbar
          icons
          bottom
          ref={f7ToolbarRef as never}
          className={`rika-tabbar ${barsHidden ? 'toolbar-hidden' : ''}`}
        >
          <ToolbarPane>
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={false}
                tabLink
                tabLinkActive={activeTab === tab.id}
                iconIos={tab.icon}
                text={tab.label}
                onClick={() => handleTabChange(tab.id)}
                aria-label={tab.label}
              />
            ))}
          </ToolbarPane>
        </Toolbar>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialDate={modalDate}
        />
      </Page>
    </F7App>
  );
}

export default function App() {
  const ALLOWED_USER_ID = '940420310';
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const isTelegram = Boolean(tgUser?.id);
  const currentUserId = tgUser?.id ? String(tgUser.id) : null;

  // In Telegram Mini App, restrict strictly to allowed TG user ID 940420310.
  // Outside Telegram (e.g. local browser dev), allow in DEV mode for testing.
  const isAuthorized = isTelegram
    ? currentUserId === ALLOWED_USER_ID
    : (import.meta.env.DEV || currentUserId === ALLOWED_USER_ID);

  if (!isAuthorized) {
    return <UnauthorizedScreen />;
  }

  return (
    <TaskProvider>
      <PowerProvider>
        <AppContent />
      </PowerProvider>
    </TaskProvider>
  );
}
