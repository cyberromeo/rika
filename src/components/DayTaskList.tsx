import React from 'react';
import { format } from 'date-fns';
import { useTasks } from '../store/taskStore';
import { usePower } from '../store/powerStore';
import TaskItem from './TaskItem';

interface DayTaskListProps {
  selectedDate: Date;
}

export default function DayTaskList({ selectedDate }: DayTaskListProps) {
  const { getTasksByDate } = useTasks();
  const { getPowerForDate } = usePower();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasks = getTasksByDate(dateStr);
  const dayPower = getPowerForDate(dateStr);

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="day-tasks-container">
      <div className="day-tasks-header">
        {format(selectedDate, 'EEEE, MMM d')}
        {tasks.length > 0 && <span className="task-count">{activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}</span>}
        {dayPower > 0 && (
          <span className="day-power-badge">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {dayPower.toFixed(1)} kWh
          </span>
        )}
      </div>

      {tasks.length === 0 && dayPower === 0 ? (
        <div className="day-tasks-empty">
          No tasks for this day
        </div>
      ) : (
        <>
          {activeTasks.map((task, idx) => (
            <TaskItem key={task.id} task={task} showDate={false} staggerIndex={idx} />
          ))}
          {completedTasks.map((task, idx) => (
            <TaskItem key={task.id} task={task} showDate={false} staggerIndex={activeTasks.length + idx} />
          ))}
        </>
      )}
    </div>
  );
}
