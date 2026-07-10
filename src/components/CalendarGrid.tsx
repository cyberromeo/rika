import React, { useState, useMemo, useEffect } from 'react';
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
import { usePower } from '../store/powerStore';
import { hapticSelection, hapticFeedback } from '../telegram';

interface CalendarGridProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function CalendarGrid({ selectedDate, onSelectDate }: CalendarGridProps) {
  const { tasks } = useTasks();
  const { getPowerForDate, getPowerForMonth, fetchMonthDailyData } = usePower();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slideDir, setSlideDir] = useState<'left' | 'right' | ''>('');

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Fetch power data when the viewed month changes
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    fetchMonthDailyData(year, month);
  }, [currentMonth, fetchMonthDailyData]);

  // Monthly power total for the header
  const monthPowerStr = format(currentMonth, 'yyyy-MM');
  const monthPower = getPowerForMonth(monthPowerStr);

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
        <div className="calendar-month-group">
          <span className="calendar-month-label">{format(currentMonth, 'MMMM yyyy')}</span>
          {monthPower > 0 && (
            <span className="calendar-month-power">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="calendar-power-bolt">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {monthPower >= 100 ? monthPower.toFixed(0) : monthPower.toFixed(1)} kWh
            </span>
          )}
        </div>
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
            const dayPower = isCurrentMonth ? getPowerForDate(dateStr) : 0;

            return (
              <button
                key={dateStr}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
                  isToday ? 'today' : ''
                } ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className="calendar-day-number">{format(day, 'd')}</span>
                {dayPower > 0 && isCurrentMonth ? (
                  <span className="calendar-power-badge">{dayPower.toFixed(1)}</span>
                ) : dots.length > 0 ? (
                  <div className="calendar-dots">
                    {dots.map((p, i) => (
                      <span key={i} className={`calendar-dot ${p}`} />
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
