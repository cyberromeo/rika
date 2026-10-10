import { useMemo } from 'react';
import type { Task } from '../lib/api';
import { EXAM_DATE, dayDiff, hm, longDate, parseYmd, todayYmd } from '../lib/dates';
import { useStore } from '../lib/store';
import { overallProgress } from '../lib/syllabus';
import { CardTitle, Empty, Header, Loading, Problem } from '../components/Bits';
import Icon from '../components/Icon';
import Ring from '../components/Ring';
import TaskRow from '../components/TaskRow';
import type { TabId } from '../App';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late, Sri';
  if (h < 12) return 'Good morning, Sri';
  if (h < 17) return 'Good afternoon, Sri';
  return 'Good evening, Sri';
}

interface Props {
  go: (t: TabId, view?: 'all' | 'shopping') => void;
  openTask: (t: Task) => void;
}

export default function Home({ go, openTask }: Props) {
  const { tasks, study, tracker, shoppingSectionIds, refreshTasks, refreshStudy } = useStore();
  const today = todayYmd();
  const daysLeft = dayDiff(EXAM_DATE, today);

  const { dueNow, shopping } = useMemo(() => {
    const all = tasks.data || [];
    const shopping = all.filter((t) => t.sectionId && shoppingSectionIds.has(t.sectionId));
    const dueNow = all
      .filter((t) => !(t.sectionId && shoppingSectionIds.has(t.sectionId)))
      .filter((t) => t.due && dayDiff(t.due, today) <= 0)
      .sort((a, b) => (a.due || '').localeCompare(b.due || '') || b.priority - a.priority);
    return { dueNow, shopping };
  }, [tasks.data, shoppingSectionIds, today]);

  const overdue = dueNow.filter((t) => t.due && dayDiff(t.due, today) < 0).length;
  const s = study.data;
  const progress = tracker.data ? overallProgress(tracker.data) : null;
  const timer = s?.activeTimer && !s.activeTimer.completed ? s.activeTimer : null;

  return (
    <div className="page">
      <Header title={greeting()} subtitle={longDate(new Date())} />

      <div className="grid">
        <section className="card hero">
          <CardTitle icon="graduation" color="pink" title="FMGE" />
          <div className="hero-row">
            <div>
              <div className="hero-num">{daysLeft > 0 ? daysLeft : daysLeft === 0 ? 'Today' : 'Done'}</div>
              <div className="hero-label">
                {daysLeft > 1 ? 'days to go' : daysLeft === 1 ? 'day to go' : daysLeft === 0 ? 'Exam day. You got this.' : 'Exam finished'}
              </div>
            </div>
            <div className="hero-date">
              {parseYmd(EXAM_DATE).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
          {progress && (
            <button className="progress-block" onClick={() => go('study')}>
              <div className="progress-head">
                <span>Syllabus</span>
                <strong>{progress.pct}%</strong>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${progress.pct}%` }} />
              </div>
              <div className="muted small">
                {progress.done} of {progress.total} steps ticked
              </div>
            </button>
          )}
          {tracker.loading && <Loading lines={1} />}
        </section>

        <section className="card">
          <CardTitle
            icon="book"
            color="green"
            title="Study today"
            right={
              s && s.streak > 0 ? (
                <span className="streak">
                  <Icon name="flame" size={14} /> {s.streak} day{s.streak === 1 ? '' : 's'}
                </span>
              ) : null
            }
          />
          {study.loading && <Loading lines={2} />}
          {study.error && !s && <Problem text="Couldn't load study time." onRetry={refreshStudy} />}
          {s && (
            <button className="study-sum" onClick={() => go('study')}>
              <Ring value={s.goalSeconds ? s.todayStudySeconds / s.goalSeconds : 0} size={92} stroke={9}>
                <strong>{hm(s.todayStudySeconds)}</strong>
                <span>of {hm(s.goalSeconds)}</span>
              </Ring>
              <div className="study-sum-side">
                <div className="kv">
                  <span>PYQs</span>
                  <strong>
                    {hm(s.todayPyqSeconds)} <em>/ {hm(s.pyqGoalSeconds)}</em>
                  </strong>
                </div>
                {timer ? (
                  <div className="live-pill">
                    <span className="live-dot" /> {timer.isRunning ? 'Timer running' : 'Timer paused'}
                  </div>
                ) : (
                  <div className="link-row">
                    Start a session <Icon name="chevronRight" size={16} />
                  </div>
                )}
              </div>
            </button>
          )}
        </section>

        <section className="card span-2">
          <CardTitle
            icon="checkCircle"
            color="blue"
            title="Due today"
            right={
              <button className="text-btn" onClick={() => go('tasks')}>
                All tasks
              </button>
            }
          />
          {tasks.loading && <Loading />}
          {tasks.error && !tasks.data && <Problem text="Couldn't load your tasks." onRetry={refreshTasks} />}
          {tasks.data && dueNow.length === 0 && <Empty icon="sun" text="Nothing due today. Enjoy it." />}
          {overdue > 0 && <div className="note warn">{overdue} overdue</div>}
          <div className="task-list">
            {dueNow.slice(0, 6).map((t) => (
              <TaskRow key={t.id} task={t} onOpen={openTask} />
            ))}
          </div>
          {dueNow.length > 6 && (
            <button className="text-btn more" onClick={() => go('tasks')}>
              {dueNow.length - 6} more
            </button>
          )}
        </section>

        {shopping.length > 0 && (
          <section className="card">
            <CardTitle
              icon="cart"
              color="orange"
              title="Shopping list"
              right={<span className="count">{shopping.length}</span>}
            />
            <ul className="mini-list">
              {shopping.slice(0, 5).map((t) => (
                <li key={t.id}>{t.content}</li>
              ))}
            </ul>
            <button className="text-btn" onClick={() => go('tasks', 'shopping')}>
              Open list
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
