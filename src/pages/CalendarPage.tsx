import React, { useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import DayTaskList from '../components/DayTaskList';

interface CalendarPageProps {
  onAddTask: (date?: string) => void;
}

export default function CalendarPage({ onAddTask }: CalendarPageProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Calendar</h1>
        <div className="subtitle">Tap a date to see tasks</div>
      </div>

      <CalendarGrid selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <DayTaskList selectedDate={selectedDate} />
    </div>
  );
}
