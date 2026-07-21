import React from 'react';
import { useTasks } from '../store/taskStore';
import { isToday, isBefore, parseISO, startOfDay } from 'date-fns';
import PowerWidget from '../components/PowerWidget';
import AiUsageWidget from '../components/AiUsageWidget';
import FmgeProgressWidget from '../components/FmgeProgressWidget';

interface HomePageProps {
  chartOpen: boolean;
  setChartOpen: (open: boolean) => void;
  onNavigateFmge: () => void;
}

export default function HomePage({ chartOpen, setChartOpen, onNavigateFmge }: HomePageProps) {
  const { tasks } = useTasks();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Sri';
    if (hour < 17) return 'Good Afternoon, Sri';
    return 'Good Evening, Sri';
  })();

  const subtitle = (() => {
    const now = startOfDay(new Date());
    let todayCount = 0;
    let overdueCount = 0;
    for (const t of tasks) {
      if (t.completed) continue;
      if (!t.dueDate) continue;
      const due = parseISO(t.dueDate);
      if (isToday(due)) todayCount++;
      else if (isBefore(due, now)) overdueCount++;
    }
    if (overdueCount > 0 && todayCount > 0) {
      return `${todayCount} due today · ${overdueCount} overdue`;
    }
    if (overdueCount > 0) return `${overdueCount} overdue task${overdueCount !== 1 ? 's' : ''}`;
    if (todayCount > 0) return `${todayCount} task${todayCount !== 1 ? 's' : ''} due today`;
    return 'All caught up for today';
  })();

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>{greeting}</h1>
        <div className="subtitle">{subtitle}</div>
      </div>

      <div className="home-widgets">
        <AiUsageWidget />
        <FmgeProgressWidget onNavigate={onNavigateFmge} />
        <PowerWidget chartOpen={chartOpen} setChartOpen={setChartOpen} />
      </div>
    </div>
  );
}
