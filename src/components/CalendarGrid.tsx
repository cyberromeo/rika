import React, { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday as isTodayFn,
} from 'date-fns';
import { useTasks, Priority } from '../store/taskStore';
import { hapticSelection, hapticFeedback } from '../telegram';

interface CalendarGridProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function CalendarGrid({ selectedDate, onSelectDate }: CalendarGridProps) {
  const { tasks } = useTasks();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slideDir, setSlideDir] = useState<'left' | 'right' | ''>('');

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Build task map: date string -> list of priorities
  const taskMap = useMemo(() => {
    const map: Record<string, Priority[]> = {};
    tasks.forEach((t) => {
      if (!t.completed) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t.priority);
      }
    });
    return map;
  }, [tasks]);

  // Build calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    // Week starts on Monday (1)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const goToPrevMonth = () => {
    hapticFeedback('light');
    setSlideDir('right');
    setCurrentMonth((m) => subMonths(m, 1));
    setTimeout(() => setSlideDir(''), 300);
  };

  const goToNextMonth = () => {
    hapticFeedback('light');
    setSlideDir('left');
    setCurrentMonth((m) => addMonths(m, 1));
    setTimeout(() => setSlideDir(''), 300);
  };

  const handleDayClick = (day: Date) => {
    hapticSelection();
    onSelectDate(day);
  };

  // Get unique priorities for a date (sorted by severity)
  const getDotsForDate = (dateStr: string): Priority[] => {
    const priorities = taskMap[dateStr];
    if (!priorities) return [];
    const unique = [...new Set(priorities)];
    unique.sort(); // p1 < p2 < p3 < p4
    return unique.slice(0, 3); // max 3 dots
  };

  return (
    <div className="calendar-container">
      {/* Month navigation */}
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={goToPrevMonth} aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="calendar-month-label">{format(currentMonth, 'MMMM yyyy')}</span>
        <button className="calendar-nav-btn" onClick={goToNextMonth} aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="calendar-grid-wrapper">
        <div className={`calendar-grid ${slideDir ? `slide-${slideDir}` : ''}`}>
          {weekdays.map((wd) => (
            <div key={wd} className="calendar-weekday">
              {wd}
            </div>
          ))}

          {/* Day cells */}
          {calendarDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isTodayFn(day);
            const dots = getDotsForDate(dateStr);

            return (
              <button
                key={dateStr}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
                  isToday ? 'today' : ''
                } ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className="calendar-day-number">{format(day, 'd')}</span>
                <div className="calendar-dots">
                  {dots.map((p, i) => (
                    <span key={i} className={`calendar-dot ${p}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
