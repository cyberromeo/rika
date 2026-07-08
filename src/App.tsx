import React, { useState } from 'react';
import { TaskProvider } from './store/taskStore';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import AddTaskModal from './components/AddTaskModal';
import { hapticFeedback } from './telegram';

type TabId = 'tasks' | 'calendar';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>();

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

  return (
    <div className="app-shell">
      {/* Page Content */}
      <div className="page-content">
        {activeTab === 'tasks' ? (
          <TasksPage />
        ) : (
          <CalendarPage onAddTask={openAddModal} />
        )}
      </div>

      {/* FAB */}
      <button
        className={`fab ${isModalOpen ? 'open' : ''}`}
        onClick={() => openAddModal()}
        aria-label="Add new task"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* iOS 26 Liquid Glass Tab Bar */}
      <nav className="bottom-nav" role="tablist">
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
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
}
