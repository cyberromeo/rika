import { useEffect, useMemo, useState } from 'react';
import { EXAM_DATE, addDays, clock, dayDiff, hm, parseYmd, studyDay, todayYmd, ymd } from '../lib/dates';
import { useStore } from '../lib/store';
import { FIELDS, GTS, SUBJECTS, overallProgress, shortName, subjectDone } from '../lib/syllabus';
import { CardTitle, Header, Loading, Problem } from '../components/Bits';
import Icon from '../components/Icon';
import Ring from '../components/Ring';

type Seg = 'timer' | 'syllabus' | 'week';
const DURATIONS = [25, 50, 90, 120];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function TimerCard() {
  const { study, studyAction, refreshStudy, showToast } = useStore();
  const s = study.data;
  const t = s?.activeTimer || null;
  const live = Boolean(t && t.isRunning && !t.completed);
  const now = useNow(live);
  const [mode, setMode] = useState<'study' | 'pyq'>('study');
  const [mins, setMins] = useState(50);
  const [busy, setBusy] = useState(false);

  const remaining = t
    ? t.isRunning
      ? Math.max(0, t.durationSeconds - (now - new Date(t.startTime).getTime()) / 1000)
      : t.secondsRemaining
    : 0;

  // When a running session reaches zero the study service logs it on the next read.
  useEffect(() => {
    if (live && remaining <= 0) {
      refreshStudy().then(() => showToast('Session complete, time logged'));
    }
  }, [live, remaining, refreshStudy, showToast]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const start = () => run(() => studyAction('start_timer', { durationSeconds: mins * 60, mode }));
  const pause = () => run(() => studyAction('pause_timer'));
  const resume = () => run(() => studyAction('resume_timer'));
  const end = () =>
    run(async () => {
      if (!t) return;
      const spent = Math.round(t.durationSeconds - remaining);
      if (spent >= 60 && (t.mode === 'study' || t.mode === 'pyq')) {
        await studyAction('log', { seconds: spent, mode: t.mode, note: 'Ended early' });
      }
      await studyAction('cancel_timer');
      showToast(spent >= 60 ? `Logged ${hm(spent)}` : 'Session ended');
    });

  if (study.loading) return <section className="card"><Loading lines={4} /></section>;
  if (study.error && !s) return <Problem text="Couldn't load study time." onRetry={refreshStudy} />;
  if (!s) return null;

  const active = t && !t.completed;
  const total = active ? t.durationSeconds : mins * 60;

  return (
    <section className="card timer-card">
      <CardTitle icon="clock" color="green" title="Focus timer" />
      {active ? (
        <div className="timer-live">
          <Ring value={total ? remaining / Math.max(total, 1) : 0} size={200} stroke={12}>
            <strong className="timer-clock">{clock(remaining)}</strong>
            <span>{t.mode === 'pyq' ? 'PYQ session' : 'Study session'}</span>
          </Ring>
          <div className="btn-row">
            {t.isRunning ? (
              <button className="btn soft" onClick={pause} disabled={busy}>
                <Icon name="pause" size={16} /> Pause
              </button>
            ) : (
              <button className="btn primary" onClick={resume} disabled={busy}>
                <Icon name="play" size={16} /> Resume
              </button>
            )}
            <button className="btn ghost" onClick={end} disabled={busy}>
              <Icon name="stop" size={16} /> End
            </button>
          </div>
          {!t.isRunning && <p className="muted small center">Paused</p>}
        </div>
      ) : (
        <div className="timer-setup">
          {t?.completed && <div className="note good">Last session finished and logged.</div>}
          <div className="segmented small" role="tablist">
            <button role="tab" aria-selected={mode === 'study'} className={mode === 'study' ? 'on' : ''} onClick={() => setMode('study')}>
              Study
            </button>
            <button role="tab" aria-selected={mode === 'pyq'} className={mode === 'pyq' ? 'on' : ''} onClick={() => setMode('pyq')}>
              PYQs
            </button>
          </div>
          <div className="big-time">{mins} min</div>
          <div className="seg-row center">
            {DURATIONS.map((d) => (
              <button key={d} className={`pill ${mins === d ? 'on' : ''}`} onClick={() => setMins(d)}>
                {d < 60 ? `${d} min` : d === 90 ? '1½ hrs' : `${d / 60} hrs`}
              </button>
            ))}
          </div>
          <button className="btn primary full" onClick={start} disabled={busy}>
            <Icon name="play" size={16} /> Start
          </button>
          <p className="muted small center">Time is saved to your study log, and the iPhone timer sees it too.</p>
        </div>
      )}

      <div className="today-stats">
        <div>
          <span>Study</span>
          <strong>{hm(s.todayStudySeconds)}</strong>
          <div className="bar thin"><div className="bar-fill" style={{ width: `${Math.min(100, (s.todayStudySeconds / (s.goalSeconds || 1)) * 100)}%` }} /></div>
          <em>Goal {hm(s.goalSeconds)}</em>
        </div>
        <div>
          <span>PYQs</span>
          <strong>{hm(s.todayPyqSeconds)}</strong>
          <div className="bar thin"><div className="bar-fill" style={{ width: `${Math.min(100, (s.todayPyqSeconds / (s.pyqGoalSeconds || 1)) * 100)}%` }} /></div>
          <em>Goal {hm(s.pyqGoalSeconds)}</em>
        </div>
        <div>
          <span>Streak</span>
          <strong className="streak-num"><Icon name="flame" size={16} /> {s.streak}</strong>
          <em>day{s.streak === 1 ? '' : 's'} on goal</em>
        </div>
      </div>
    </section>
  );
}

function WeekCard() {
  const { study } = useStore();
  const s = study.data;
  const days = useMemo(() => {
    const end = parseYmd(studyDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(end, i - 6);
      const k = ymd(d);
      const isToday = i === 6;
      const st = isToday ? s?.todayStudySeconds || 0 : s?.history[k] || 0;
      const pq = isToday ? s?.todayPyqSeconds || 0 : s?.historyPyq[k] || 0;
      return { k, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), st, pq, isToday };
    });
  }, [s]);
  if (!s) return study.loading ? <section className="card"><Loading /></section> : null;
  const max = Math.max(3600, s.goalSeconds * 1.2, ...days.map((d) => d.st + d.pq));
  const totalSt = days.reduce((a, d) => a + d.st, 0);
  const totalPq = days.reduce((a, d) => a + d.pq, 0);

  return (
    <section className="card">
      <CardTitle icon="chart" color="purple" title="Last 7 days" right={<span className="muted small">{hm(totalSt + totalPq)} total</span>} />
      <div className="chart">
        <div className="chart-plot">
          {s.goalSeconds > 0 && (
            <div className="goal-line" style={{ bottom: `${(s.goalSeconds / max) * 100}%` }}>
              <span>Goal {hm(s.goalSeconds)}</span>
            </div>
          )}
          {days.map((d) => (
            <div className="chart-bar" key={d.k} title={`${hm(d.st)} study, ${hm(d.pq)} PYQs`}>
              <div className="seg pyq" style={{ height: `${(d.pq / max) * 100}%` }} />
              <div className="seg st" style={{ height: `${(d.st / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="chart-labels">
          {days.map((d) => (
            <span key={d.k} className={d.isToday ? 'today' : ''}>{d.label}</span>
          ))}
        </div>
      </div>
      <div className="legend">
        <span><i className="st" /> Study {hm(totalSt)}</span>
        <span><i className="pyq" /> PYQs {hm(totalPq)}</span>
      </div>
    </section>
  );
}

function SyllabusCard() {
  const { tracker, toggleSubject, toggleGt, refreshTracker } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  if (tracker.loading) return <section className="card"><Loading lines={6} /></section>;
  if (tracker.error && !tracker.data) return <Problem text="Couldn't load the syllabus tracker." onRetry={refreshTracker} />;
  const t = tracker.data;
  if (!t) return null;
  const p = overallProgress(t);

  return (
    <section className="card">
      <CardTitle icon="list" color="teal" title="Syllabus" right={<strong className="pct">{p.pct}%</strong>} />
      <div className="bar"><div className="bar-fill" style={{ width: `${p.pct}%` }} /></div>
      <p className="muted small">{p.done} of {p.total} steps ticked</p>

      <div className="field-label">Grand tests</div>
      <div className="seg-row">
        {GTS.map((g) => (
          <button key={g} className={`pill ${t.gts[g] ? 'on' : ''}`} onClick={() => toggleGt(g)} aria-pressed={Boolean(t.gts[g])}>
            {t.gts[g] && <Icon name="check" size={13} strokeWidth={3} />} {g}
          </button>
        ))}
      </div>

      <div className="field-label">Subjects</div>
      <div className="subjects">
        {SUBJECTS.map((name) => {
          const row = t.subjects[name];
          const done = subjectDone(row);
          const isOpen = open === name;
          return (
            <div className={`subject ${isOpen ? 'open' : ''}`} key={name}>
              <button className="subject-head" onClick={() => setOpen(isOpen ? null : name)} aria-expanded={isOpen}>
                <span className="subject-name">{shortName(name)}</span>
                <span className="mini-bar"><i style={{ width: `${(done / FIELDS.length) * 100}%` }} /></span>
                <span className={`subject-count ${done === FIELDS.length ? 'full' : ''}`}>{done}/{FIELDS.length}</span>
                <Icon name="chevronDown" size={16} className="chev" />
              </button>
              {isOpen && (
                <div className="subject-body">
                  {FIELDS.map((f) => (
                    <button
                      key={f.key}
                      className={`pill ${row?.[f.key] ? 'on' : ''}`}
                      onClick={() => toggleSubject(name, f.key)}
                      aria-pressed={Boolean(row?.[f.key])}
                    >
                      {row?.[f.key] && <Icon name="check" size={13} strokeWidth={3} />} {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Study() {
  const [seg, setSeg] = useState<Seg>('timer');
  const daysLeft = dayDiff(EXAM_DATE, todayYmd());
  const sub = daysLeft > 1 ? `${daysLeft} days to FMGE` : daysLeft === 1 ? '1 day to FMGE' : daysLeft === 0 ? 'FMGE is today' : 'FMGE done';

  return (
    <div className="page">
      <Header title="Study" subtitle={sub} />
      <div className="segmented phone-only" role="tablist">
        {(['timer', 'syllabus', 'week'] as Seg[]).map((k) => (
          <button key={k} role="tab" aria-selected={seg === k} className={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>
            {k === 'timer' ? 'Timer' : k === 'syllabus' ? 'Syllabus' : 'Week'}
          </button>
        ))}
      </div>
      <div className={`study-layout show-${seg}`}>
        <div className="study-col">
          <div className="pane-timer"><TimerCard /></div>
          <div className="pane-week"><WeekCard /></div>
        </div>
        <div className="study-col pane-syllabus"><SyllabusCard /></div>
      </div>
    </div>
  );
}
