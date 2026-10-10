import { useMemo, useState } from 'react';
import type { Task } from '../lib/api';
import { addDays, longDate, parseYmd, todayYmd, ymd } from '../lib/dates';
import { useStore } from '../lib/store';
import { Empty, Header, Loading, Problem } from '../components/Bits';
import Icon from '../components/Icon';
import TaskRow from '../components/TaskRow';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  openTask: (t: Task) => void;
  newTask: (opts?: { due?: string }) => void;
}

export default function Calendar({ openTask, newTask }: Props) {
  const { tasks, refreshTasks } = useStore();
  const today = todayYmd();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const t of tasks.data || []) if (t.due) (m[t.due.slice(0, 10)] ||= []).push(t);
    return m;
  }, [tasks.data]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = addDays(first, -offset);
    const weeks = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  }, [month]);

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const goToday = () => {
    const d = new Date();
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelected(today);
  };

  const dayTasks = (byDay[selected] || []).slice().sort((a, b) => b.priority - a.priority);
  const monthName = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="page">
      <Header
        title="Calendar"
        subtitle={monthName}
        action={
          <button className="round-btn" onClick={() => newTask({ due: selected })} aria-label="Add a task on this day">
            <Icon name="plus" size={20} strokeWidth={2.5} />
          </button>
        }
      />

      <div className="cal-layout">
        <section className="card cal-card">
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
              <Icon name="chevronLeft" />
            </button>
            <strong>{monthName}</strong>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
              <Icon name="chevronRight" />
            </button>
          </div>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => (
              <div className="cal-wd" key={w}>
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === month.getMonth();
              const count = byDay[key]?.length || 0;
              return (
                <button
                  key={key}
                  className={`cal-day ${inMonth ? '' : 'out'} ${key === today ? 'today' : ''} ${key === selected ? 'sel' : ''}`}
                  onClick={() => setSelected(key)}
                  aria-label={`${d.toDateString()}${count ? `, ${count} task${count > 1 ? 's' : ''}` : ''}`}
                >
                  <span>{d.getDate()}</span>
                  <i className="dots">{count > 0 && Array.from({ length: Math.min(count, 3) }, (_, i) => <b key={i} />)}</i>
                </button>
              );
            })}
          </div>
          {selected !== today && (
            <button className="text-btn center" onClick={goToday}>
              Back to today
            </button>
          )}
        </section>

        <section className="card">
          <div className="group-title">
            <span>{selected === today ? 'Today' : longDate(parseYmd(selected))}</span>
            {dayTasks.length > 0 && <span className="count">{dayTasks.length}</span>}
          </div>
          {tasks.loading && <Loading />}
          {tasks.error && !tasks.data && <Problem text="Couldn't load your tasks." onRetry={refreshTasks} />}
          {tasks.data && dayTasks.length === 0 && <Empty icon="calendar" text="Nothing planned for this day." />}
          <div className="task-list">
            {dayTasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={openTask} showDue={false} />
            ))}
          </div>
          <button className="btn soft full" onClick={() => newTask({ due: selected })}>
            <Icon name="plus" size={16} /> Add a task on this day
          </button>
        </section>
      </div>
    </div>
  );
}
