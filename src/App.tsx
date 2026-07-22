import React, { useState } from 'react';
import { TaskProvider } from './store/taskStore';
import { PowerProvider } from './store/powerStore';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import FmgePage from './pages/FmgePage';
import AddTaskModal from './components/AddTaskModal';
import UnauthorizedScreen from './components/UnauthorizedScreen';
import { hapticFeedback } from './telegram';

type TabId = 'home' | 'tasks' | 'calendar' | 'fmge';

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
            onNavigateFmge={() => handleTabChange('fmge')}
          />
        );
      case 'tasks':
        return <TasksPage cartOpen={cartOpen} setCartOpen={setCartOpen} />;
      case 'calendar':
        return <CalendarPage onAddTask={openAddModal} />;
      case 'fmge':
        return <FmgePage />;
    }
  };

  return (
    <div className="app-shell">
      {/* Page Content */}
      <div className="page-content">
        {renderPage()}
      </div>

      {/* FAB */}
      <button
        className={`fab ${isModalOpen ? 'open' : ''} ${(cartOpen || chartOpen || activeTab !== 'tasks') ? 'hidden' : ''}`}
        onClick={() => openAddModal()}
        aria-label="Add new task"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* iOS 26 Liquid Glass Tab Bar */}
      <nav className={`bottom-nav ${(cartOpen || chartOpen) ? 'hidden' : ''}`} role="tablist">
        <button
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleTabChange('home')}
          role="tab"
          aria-selected={activeTab === 'home'}
          aria-label="Home"
        >
          <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => handleTabChange('tasks')}
          role="tab"
          aria-selected={activeTab === 'tasks'}
          aria-label="Tasks"
        >
          <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Tasks</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => handleTabChange('calendar')}
          role="tab"
          aria-selected={activeTab === 'calendar'}
          aria-label="Calendar"
        >
          <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Calendar</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'fmge' ? 'active' : ''}`}
          onClick={() => handleTabChange('fmge')}
          role="tab"
          aria-selected={activeTab === 'fmge'}
          aria-label="FMGE"
        >
          <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>FMGE</span>
        </button>
      </nav>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDate={modalDate}
      />
    </div>
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
