import { useState } from 'react';
import type { Task } from '../lib/api';
import { dayDiff, friendlyDue, todayYmd } from '../lib/dates';
import { useStore } from '../lib/store';
import Icon from './Icon';

const PRIORITY_CLASS: Record<number, string> = { 4: 'p1', 3: 'p2', 2: 'p3', 1: 'p4' };

interface Props {
  task: Task;
  onOpen: (t: Task) => void;
  showDue?: boolean;
}

export default function TaskRow({ task, onOpen, showDue = true }: Props) {
  const { completeTask } = useStore();
  const [leaving, setLeaving] = useState(false);
  const overdue = task.due ? dayDiff(task.due, todayYmd()) < 0 : false;

  const done = () => {
    setLeaving(true);
    window.setTimeout(() => completeTask(task), 320);
  };

  return (
    <div className={`task-row ${leaving ? 'leaving' : ''}`}>
      <button
        className={`check ${PRIORITY_CLASS[task.priority] || 'p4'} ${leaving ? 'on' : ''}`}
        onClick={done}
        aria-label={`Mark "${task.content}" done`}
      >
        <Icon name="check" size={14} strokeWidth={3} />
      </button>
      <button className="task-main" onClick={() => onOpen(task)}>
        <span className="task-title">{task.content}</span>
        {(showDue && task.due) || task.recurring || task.labels.length ? (
          <span className="task-meta">
            {showDue && task.due && (
              <span className={overdue ? 'due overdue' : 'due'}>
                <Icon name="calendar" size={12} /> {friendlyDue(task.due)}
              </span>
            )}
            {task.recurring && <span className="chip">Repeats</span>}
            {task.labels.slice(0, 2).map((l) => (
              <span className="chip" key={l}>
                {l}
              </span>
            ))}
          </span>
        ) : null}
      </button>
    </div>
  );
}
