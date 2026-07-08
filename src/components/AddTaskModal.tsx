import React, { useState, useEffect } from 'react';
import { Priority, useTasks } from '../store/taskStore';
import { hapticFeedback, hapticSelection } from '../telegram';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export default function AddTaskModal({ isOpen, onClose, initialDate }: AddTaskModalProps) {
  const { addTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('p4');
  const [isClosing, setIsClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDueDate(initialDate || new Date().toISOString().split('T')[0]);
      setPriority('p4');
      setIsClosing(false);
      setIsSaving(false);
    }
  }, [isOpen, initialDate]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;
    hapticFeedback('medium');
    setIsSaving(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority,
      });
      handleClose();
    } catch {
      setIsSaving(false);
    }
  };

  const handlePriorityChange = (p: Priority) => {
    hapticSelection();
    setPriority(p);
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 className="modal-title">New Task</h2>

        <div className="modal-field">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            type="text"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="modal-field">
          <label htmlFor="task-desc">Description</label>
          <textarea
            id="task-desc"
            placeholder="Add details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="task-date">Due Date</label>
          <input
            id="task-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="modal-field">
          <label>Priority</label>
          <div className="priority-selector">
            {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
              <button
                key={p}
                className={`priority-option ${p} ${priority === p ? 'selected' : ''}`}
                onClick={() => handlePriorityChange(p)}
              >
                <span className="priority-dot" />
                {p === 'p1' ? 'Urgent' : p === 'p2' ? 'High' : p === 'p3' ? 'Medium' : 'Low'}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
