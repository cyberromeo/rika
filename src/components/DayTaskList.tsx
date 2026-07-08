import React from 'react';
import { format } from 'date-fns';
import { useTasks } from '../store/taskStore';
import TaskItem from './TaskItem';

interface DayTaskListProps {
  selectedDate: Date;
}

export default function DayTaskList({ selectedDate }: DayTaskListProps) {
  const { getTasksByDate } = useTasks();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasks = getTasksByDate(dateStr);

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="day-tasks-container">
      <div className="day-tasks-header">
        {format(selectedDate, 'EEEE, MMM d')}
        {tasks.length > 0 && <span className="task-count">{activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}</span>}
      </div>

      {tasks.length === 0 ? (
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
