import React, { useState } from 'react';
import { Task, useTasks } from '../store/taskStore';
import { hapticFeedback, hapticNotification } from '../telegram';
import {
  format,
  isToday as isTodayFn,
  isTomorrow as isTomorrowFn,
  isYesterday as isYesterdayFn,
  isPast,
  parseISO,
} from 'date-fns';

interface TaskItemProps {
  task: Task;
  showDate?: boolean;
  staggerIndex?: number;
}

export default function TaskItem({ task, showDate = true, staggerIndex = 0 }: TaskItemProps) {
  const { toggleTask, deleteTask } = useTasks();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = () => {
    if (isCompleting || isDeleting) return;
    hapticFeedback('light');
    if (!task.completed) {
      setIsCompleting(true);
      hapticNotification('success');
      setTimeout(() => {
        toggleTask(task.id);
        setIsCompleting(false);
      }, 400);
    } else {
      toggleTask(task.id);
    }
  };

  const handleDelete = () => {
    if (isDeleting) return;
    hapticFeedback('medium');
    setIsDeleting(true);
    setTimeout(() => {
      deleteTask(task.id);
    }, 300);
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = parseISO(dateStr);
    if (isTodayFn(date)) return 'Today';
    if (isTomorrowFn(date)) return 'Tomorrow';
    if (isYesterdayFn(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const isOverdue = !task.completed && task.dueDate && isPast(parseISO(task.dueDate + 'T23:59:59'));

  return (
    <div
      style={{ animationDelay: `${staggerIndex * 0.05}s` }}
      className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''} ${
        isCompleting ? 'completing' : ''
      } ${isDeleting ? 'deleting' : ''}`}
    >
      {/* Checkbox */}
      <button
        className={`task-checkbox priority-${task.priority} ${task.completed || isCompleting ? 'checked' : ''}`}
        onClick={handleToggle}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-description">{task.description}</div>}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="task-labels">
            {task.labels.map((label) => (
              <span key={label} className="task-label">@{label}</span>
            ))}
          </div>
        )}

        {showDate && task.dueDate && (
          <div className="task-meta">
            <span className={`task-date-chip ${isOverdue ? 'overdue' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDueDate(task.dueDate)}
              {task.isRecurring && ' 🔁'}
            </span>
          </div>
        )}
      </div>

      {/* Delete */}
      <button className="task-delete" onClick={handleDelete} aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
