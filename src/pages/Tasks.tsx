import { useMemo } from 'react';
import type { Task } from '../lib/api';
import { dayDiff, todayYmd } from '../lib/dates';
import { useStore } from '../lib/store';
import { Empty, Header, Loading, Problem } from '../components/Bits';
import Icon from '../components/Icon';
import TaskRow from '../components/TaskRow';

interface Props {
  view: 'all' | 'shopping';
  setView: (v: 'all' | 'shopping') => void;
  openTask: (t: Task) => void;
  newTask: (opts?: { shopping?: boolean }) => void;
}

const GROUPS = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'tomorrow', title: 'Tomorrow' },
  { key: 'week', title: 'Next 7 days' },
  { key: 'later', title: 'Later' },
  { key: 'none', title: 'No date' },
] as const;

function groupOf(t: Task, today: string): (typeof GROUPS)[number]['key'] {
  if (!t.due) return 'none';
  const d = dayDiff(t.due, today);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d <= 7) return 'week';
  return 'later';
}

export default function Tasks({ view, setView, openTask, newTask }: Props) {
  const { tasks, shoppingSectionIds, refreshTasks } = useStore();
  const today = todayYmd();

  const { groups, shopping, openCount } = useMemo(() => {
    const all = tasks.data || [];
    const isShop = (t: Task) => Boolean(t.sectionId && shoppingSectionIds.has(t.sectionId));
    const regular = all.filter((t) => !isShop(t));
    const shopping = all.filter(isShop).sort((a, b) => a.order - b.order);
    const groups: Record<string, Task[]> = {};
    for (const t of regular) (groups[groupOf(t, today)] ||= []).push(t);
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => (a.due || '').localeCompare(b.due || '') || b.priority - a.priority || a.order - b.order);
    }
    return { groups, shopping, openCount: regular.length };
  }, [tasks.data, shoppingSectionIds, today]);

  const hasShopping = shoppingSectionIds.size > 0;
  const subtitle =
    view === 'shopping'
      ? `${shopping.length} item${shopping.length === 1 ? '' : 's'} to buy`
      : `${openCount} open task${openCount === 1 ? '' : 's'}`;

  return (
    <div className="page">
      <Header
        title={view === 'shopping' ? 'Shopping list' : 'Tasks'}
        subtitle={tasks.data ? subtitle : undefined}
        action={
          <button
            className="round-btn"
            onClick={() => newTask({ shopping: view === 'shopping' })}
            aria-label={view === 'shopping' ? 'Add an item' : 'Add a task'}
          >
            <Icon name="plus" size={20} strokeWidth={2.5} />
          </button>
        }
      />

      {hasShopping && (
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={view === 'all'} className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
            <Icon name="checkCircle" size={16} /> Tasks
          </button>
          <button
            role="tab"
            aria-selected={view === 'shopping'}
            className={view === 'shopping' ? 'on' : ''}
            onClick={() => setView('shopping')}
          >
            <Icon name="cart" size={16} /> Shopping
          </button>
        </div>
      )}

      {tasks.loading && (
        <div className="card">
          <Loading lines={5} />
        </div>
      )}
      {tasks.error && !tasks.data && <Problem text="Couldn't load your tasks." onRetry={refreshTasks} />}

      {tasks.data && view === 'all' && (
        <div className="columns">
          {openCount === 0 && (
            <div className="card">
              <Empty icon="sun" text="No open tasks. Tap + to add one." />
            </div>
          )}
          {GROUPS.filter((g) => groups[g.key]?.length).map((g) => (
            <section className="card" key={g.key}>
              <div className={`group-title ${g.key === 'overdue' ? 'warn' : ''}`}>
                <span>{g.title}</span>
                <span className="count">{groups[g.key].length}</span>
              </div>
              <div className="task-list">
                {groups[g.key].map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={openTask} showDue={g.key !== 'today' && g.key !== 'none'} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tasks.data && view === 'shopping' && (
        <section className="card">
          {shopping.length === 0 ? (
            <Empty icon="cart" text="List is empty. Tap + to add something." />
          ) : (
            <div className="task-list">
              {shopping.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={openTask} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
