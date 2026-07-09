import React, { useMemo, useState } from 'react';
import { useTasks, Task } from '../store/taskStore';
import TaskItem from '../components/TaskItem';
import ShoppingCartPanel from '../components/ShoppingCartPanel';
import { parseISO, isToday, isBefore, startOfDay } from 'date-fns';

export default function TasksPage() {
  const { tasks, loading, error, refreshTasks, shoppingSectionIds } = useTasks();
  const [cartOpen, setCartOpen] = useState(false);

  const { overdue, today, upcoming, completed } = useMemo(() => {
    const now = startOfDay(new Date());
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    const sortByPriority = (a: Task, b: Task) => {
      if (a.priority < b.priority) return -1;
      if (a.priority > b.priority) return 1;
      return 0;
    };

    // Exclude shopping section tasks from the main list
    const nonShoppingTasks = tasks.filter((t) => {
      if (t.sectionId && shoppingSectionIds.size > 0) {
        return !shoppingSectionIds.has(t.sectionId);
      }
      return !t.labels.some((l) => /shopping|grocery|groceries|buy/i.test(l));
    });

    nonShoppingTasks.forEach((task) => {
      if (task.completed) {
        completed.push(task);
      } else if (!task.dueDate) {
        upcoming.push(task); // No due date → upcoming
      } else {
        const dueDate = parseISO(task.dueDate);
        if (isToday(dueDate)) {
          today.push(task);
        } else if (isBefore(dueDate, now)) {
          overdue.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    overdue.sort(sortByPriority);
    today.sort(sortByPriority);
    upcoming.sort((a, b) => {
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (a.dueDate && b.dueDate) {
        const dateCompare = a.dueDate.localeCompare(b.dueDate);
        if (dateCompare !== 0) return dateCompare;
      }
      return sortByPriority(a, b);
    });

    return { overdue, today, upcoming, completed };
  }, [tasks, shoppingSectionIds]);

  const totalActive = overdue.length + today.length + upcoming.length;
  const totalDone = completed.length;

  const shoppingCount = tasks.filter((t) => {
    if (!t.completed) {
      if (t.sectionId && shoppingSectionIds.size > 0) {
        return shoppingSectionIds.has(t.sectionId);
      }
      return t.labels.some((l) => /shopping|grocery|groceries|buy/i.test(l));
    }
    return false;
  }).length;

  if (loading && tasks.length === 0) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Tasks</h1>
          <div className="subtitle">Loading from Todoist...</div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Fetching your tasks</p>
        </div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Tasks</h1>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Couldn't load tasks</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={refreshTasks}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <h1>Tasks</h1>
          <button
            className={`cart-icon-btn ${shoppingCount > 0 ? 'has-items' : ''}`}
            onClick={() => setCartOpen(true)}
            aria-label="Open shopping cart"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {shoppingCount > 0 && (
              <span className="cart-badge">{shoppingCount}</span>
            )}
          </button>
        </div>
        <div className="subtitle">
          {totalActive} active · {totalDone} completed
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-chip">
          <span className="stat-number">{overdue.length}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-chip">
          <span className="stat-number">{today.length}</span>
          <span className="stat-label">Today</span>
        </div>
        <div className="stat-chip">
          <span className="stat-number">{upcoming.length}</span>
          <span className="stat-label">Upcoming</span>
        </div>
      </div>

      {totalActive === 0 && totalDone === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h3>All clear!</h3>
          <p>No tasks yet. Tap + to create your first task.</p>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <div className="section-header overdue">
                Overdue · {overdue.length}
              </div>
              {overdue.map((task, idx) => (
                <TaskItem key={task.id} task={task} staggerIndex={idx} />
              ))}
            </>
          )}

          {today.length > 0 && (
            <>
              <div className="section-header">
                Today · {today.length}
              </div>
              {today.map((task, idx) => (
                <TaskItem key={task.id} task={task} showDate={false} staggerIndex={overdue.length + idx} />
              ))}
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <div className="section-header">
                Upcoming · {upcoming.length}
              </div>
              {upcoming.map((task, idx) => (
                <TaskItem key={task.id} task={task} staggerIndex={overdue.length + today.length + idx} />
              ))}
            </>
          )}

          {completed.length > 0 && (
            <>
              <div className="section-header">
                Completed · {completed.length}
              </div>
              {completed.map((task, idx) => (
                <TaskItem key={task.id} task={task} staggerIndex={overdue.length + today.length + upcoming.length + idx} />
              ))}
            </>
          )}
        </>
      )}
      <ShoppingCartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
