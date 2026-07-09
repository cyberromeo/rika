import React, { useEffect, useRef } from 'react';
import { Task, useTasks } from '../store/taskStore';
import { hapticFeedback, hapticNotification } from '../telegram';
import { format, isToday, isTomorrow, isYesterday, isPast, parseISO } from 'date-fns';

interface ShoppingCartPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function ShoppingItem({ task }: { task: Task }) {
  const { toggleTask, deleteTask } = useTasks();
  const [isCompleting, setIsCompleting] = React.useState(false);

  const handleToggle = () => {
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
    hapticFeedback('medium');
    deleteTask(task.id);
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const isOverdue = !task.completed && task.dueDate
    ? isPast(parseISO(task.dueDate + 'T23:59:59'))
    : false;

  const dateLabel = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <div className={`shopping-item ${task.completed ? 'completed' : ''} ${isCompleting ? 'completing' : ''}`}>
      <button
        className={`shopping-checkbox ${task.completed || isCompleting ? 'checked' : ''}`}
        onClick={handleToggle}
        aria-label={task.completed ? 'Mark as not bought' : 'Mark as bought'}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      <div className="shopping-item-body">
        <span className="shopping-item-title">{task.title}</span>
        {dateLabel && (
          <span className={`shopping-item-date ${isOverdue ? 'overdue' : ''}`}>
            {dateLabel}
          </span>
        )}
      </div>
      <button className="shopping-item-delete" onClick={handleDelete} aria-label="Remove item">
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function ShoppingCartPanel({ isOpen, onClose }: ShoppingCartPanelProps) {
  const { tasks, shoppingSectionIds } = useTasks();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Filter tasks that belong to a shopping section
  const shoppingTasks = tasks.filter((t) => {
    if (t.sectionId && shoppingSectionIds.size > 0) {
      return shoppingSectionIds.has(t.sectionId);
    }
    // Fallback: match by label name
    return t.labels.some((l) =>
      /shopping|grocery|groceries|buy/i.test(l)
    );
  });

  const pending = shoppingTasks.filter((t) => !t.completed);
  const bought = shoppingTasks.filter((t) => t.completed);

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      hapticFeedback('light');
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <div
      ref={overlayRef}
      className={`cart-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div className={`cart-panel ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Shopping cart">
        {/* Handle */}
        <div className="cart-handle-bar" />

        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <svg className="cart-header-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <div>
              <h2 className="cart-title">Shopping Cart</h2>
              <p className="cart-subtitle">{pending.length} item{pending.length !== 1 ? 's' : ''} to get</p>
            </div>
          </div>
          <button className="cart-close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="cart-body">
          {shoppingTasks.length === 0 ? (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p>Cart is empty</p>
              <span>Tasks in your <em>Shopping Cart</em> section will appear here.</span>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="cart-section">
                  <div className="cart-section-label">To get · {pending.length}</div>
                  {pending.map((task) => (
                    <ShoppingItem key={task.id} task={task} />
                  ))}
                </div>
              )}

              {bought.length > 0 && (
                <div className="cart-section">
                  <div className="cart-section-label cart-section-label--done">Got it · {bought.length}</div>
                  {bought.map((task) => (
                    <ShoppingItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
