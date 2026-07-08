import React, { useMemo } from 'react';
import { useTasks, Task } from '../store/taskStore';
import TaskItem from '../components/TaskItem';
import { parseISO, isToday, isBefore, startOfDay } from 'date-fns';

export default function TasksPage() {
  const { tasks, loading, error, refreshTasks } = useTasks();

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

    tasks.forEach((task) => {
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
  }, [tasks]);

  const totalActive = overdue.length + today.length + upcoming.length;
  const totalDone = completed.length;

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
        <h1>Tasks</h1>
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
    </div>
  );
}
