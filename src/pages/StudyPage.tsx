import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { hapticFeedback } from '../telegram';
import {
  getTrackerData,
  subscribeTrackerData,
  updateSubjectTracker,
  updateGTTracker,
  SUBJECTS_LIST,
  SUBJECT_FIELDS,
  TOTAL_ITEMS,
  calculateProgress,
  TrackerData,
} from '../api/tracker';
import {
  getStudyTimeState,
  subscribeStudyTimeData,
  logStudyTime,
  startCloudTimer,
  pauseCloudTimer,
  resumeCloudTimer,
  cancelCloudTimer,
  StudyTimeState,
} from '../api/studytime';

const FIELD_LABELS: Record<string, string> = {
  Videos: 'Videos', R1: 'Rev 1', R2: 'Rev 2', PYQs: 'PYQs',
  RevisionVideos: 'Rev Vids', Qbank: 'Qbank',
};

type StudySubTab = 'overview' | 'tracker' | 'timer';

export default function StudyPage() {
  const [activeTab, setActiveTab] = useState<StudySubTab>('overview');

  // FMGE Exam Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Tracker State
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [trackerLoading, setTrackerLoading] = useState(true);

  // Study Time State
  const [studyState, setStudyState] = useState<StudyTimeState | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);

  // Local Stopwatch / Timer State
  const [timerMode, setTimerMode] = useState<'study' | 'pyq' | 'break10'>('study');
  const [timerDuration, setTimerDuration] = useState<number>(3600); // in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [manualMinutes, setManualMinutes] = useState<string>('30');
  const [logNote, setLogNote] = useState<string>('');
  const [isSubmittingLog, setIsSubmittingLog] = useState<boolean>(false);

  // Countdown timer effect for Exam (Jan 9, 2027)
  useEffect(() => {
    const examDate = new Date('2027-01-09T00:00:00').getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = examDate - now;
      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };
    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Fetch & Subscribe Tracker Data
  useEffect(() => {
    getTrackerData().then(data => { setTracker(data); setTrackerLoading(false); });
    const unsubscribe = subscribeTrackerData(data => {
      setTracker(data);
      setTrackerLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch & Subscribe Study Time State
  useEffect(() => {
    getStudyTimeState().then(st => { setStudyState(st); setStudyLoading(false); });
    const unsubscribe = subscribeStudyTimeData(st => {
      setStudyState(st);
      setStudyLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Local focus timer tick effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (isTimerRunning && secondsRemaining === 0) {
      setIsTimerRunning(false);
      hapticFeedback('heavy');
      // Auto log session
      const modeLogged = timerMode === 'break10' ? 'study' : timerMode;
      logStudyTime(timerDuration, modeLogged, `${timerMode.toUpperCase()} Focus Session`).then(st => {
        if (st) setStudyState(st);
      });
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, secondsRemaining, timerDuration, timerMode]);

  const handleSubTabChange = (next: StudySubTab) => {
    if (next === activeTab) return;
    hapticFeedback('light');
    setActiveTab(next);
  };

  // Subject Tracker Handler
  const handleSubjectChange = useCallback(async (subject: string, field: string, currentValue: boolean) => {
    if (!tracker) return;
    hapticFeedback('light');
    const newVal = !currentValue;
    setTracker(prev => prev ? {
      ...prev,
      subjects: { ...prev.subjects, [subject]: { ...prev.subjects[subject], [field]: newVal } },
    } : prev);
    await updateSubjectTracker(subject, field, newVal);
  }, [tracker]);

  // GT Change Handler
  const handleGTChange = useCallback(async (gt: string, currentValue: boolean) => {
    if (!tracker) return;
    hapticFeedback('light');
    const newVal = !currentValue;
    setTracker(prev => prev ? { ...prev, gts: { ...prev.gts, [gt]: newVal } } : prev);
    await updateGTTracker(gt, newVal);
  }, [tracker]);

  // Focus Timer Actions
  const handleSelectPreset = (mins: number) => {
    hapticFeedback('light');
    const secs = mins * 60;
    setTimerDuration(secs);
    setSecondsRemaining(secs);
    setIsTimerRunning(false);
  };

  const handleToggleTimer = () => {
    hapticFeedback('medium');
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    hapticFeedback('light');
    setIsTimerRunning(false);
    setSecondsRemaining(timerDuration);
  };

  const handleQuickLog = async (secs: number, mode: 'study' | 'pyq') => {
    hapticFeedback('medium');
    setIsSubmittingLog(true);
    const updated = await logStudyTime(secs, mode, 'Quick Log');
    if (updated) setStudyState(updated);
    setIsSubmittingLog(false);
  };

  const handleManualSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(manualMinutes, 10);
    if (isNaN(mins) || mins <= 0) return;
    hapticFeedback('medium');
    setIsSubmittingLog(true);
    const updated = await logStudyTime(mins * 60, timerMode === 'pyq' ? 'pyq' : 'study', logNote || 'Manual Log');
    if (updated) setStudyState(updated);
    setIsSubmittingLog(false);
    setLogNote('');
  };

  // Derived progress values
  const progress = tracker ? calculateProgress(tracker) : 0;
  const completedItems = Math.round((progress / 100) * TOTAL_ITEMS);
  const completedGTs = tracker ? Object.values(tracker.gts).filter(Boolean).length : 0;
  const completedSubjects = tracker
    ? SUBJECTS_LIST.filter(s => {
        const sd = tracker.subjects[s] || {};
        return SUBJECT_FIELDS.every(f => (sd as any)[f]);
      }).length
    : 0;

  // Study hours derived values
  const todayStudyHours = studyState ? (studyState.todayStudySeconds / 3600).toFixed(1) : '0.0';
  const todayPyqHours = studyState ? (studyState.todayPyqSeconds / 3600).toFixed(1) : '0.0';
  const streak = studyState ? studyState.streak : 0;

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page-enter study-page-container">
      {/* Header */}
      <div className="page-header">
        <div className="study-header-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Study Hub
        </div>
        <h1>FMGE & Study Tracker</h1>
        <div className="subtitle">Track 19 Subjects, Grand Tests & Daily Study Time</div>
      </div>

      {/* Subtab Segmented Control */}
      <div className="study-segmented-nav">
        <button
          className={`study-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('overview')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          Overview
        </button>

        <button
          className={`study-nav-btn ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('tracker')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Subjects ({progress}%)
        </button>

        <button
          className={`study-nav-btn ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('timer')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Timer & Logs
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="study-overview-content">
          {/* Exam Countdown Card */}
          <div className="study-card countdown-card">
            <div className="card-header-row">
              <span className="card-tag">FMGE Jan 2027</span>
              <span className="countdown-status">Countdown</span>
            </div>
            <div className="study-countdown-grid">
              <div className="countdown-box">
                <span className="countdown-num">{timeLeft.days}</span>
                <span className="countdown-lbl">Days</span>
              </div>
              <div className="countdown-sep">:</div>
              <div className="countdown-box">
                <span className="countdown-num">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="countdown-lbl">Hours</span>
              </div>
              <div className="countdown-sep">:</div>
              <div className="countdown-box">
                <span className="countdown-num">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="countdown-lbl">Mins</span>
              </div>
              <div className="countdown-sep">:</div>
              <div className="countdown-box accent">
                <span className="countdown-num">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="countdown-lbl">Secs</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="study-stats-grid">
            {/* FMGE Progress Card */}
            <div className="study-card stat-card" onClick={() => handleSubTabChange('tracker')}>
              <div className="stat-card-ring">
                <svg viewBox="0 0 36 36" className="stat-ring-svg">
                  <circle className="ring-bg" cx="18" cy="18" r="15.5" />
                  <circle
                    className="ring-fill"
                    cx="18" cy="18" r="15.5"
                    strokeDasharray={`${(progress / 100) * 97.4} 97.4`}
                  />
                </svg>
                <div className="ring-center">
                  <span className="ring-pct">{progress}%</span>
                </div>
              </div>
              <div className="stat-card-info">
                <div className="stat-label">Syllabus Progress</div>
                <div className="stat-value">{completedItems} / {TOTAL_ITEMS} items</div>
                <div className="stat-sub">{completedSubjects} subjects · {completedGTs} GTs done</div>
              </div>
            </div>

            {/* Today's Study Time Card */}
            <div className="study-card stat-card" onClick={() => handleSubTabChange('timer')}>
              <div className="stat-icon-wrapper blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-card-info">
                <div className="stat-label">Today's Study Time</div>
                <div className="stat-value">{todayStudyHours} hrs <span className="stat-goal">/ 11h goal</span></div>
                <div className="stat-sub">PYQs: {todayPyqHours} hrs / 2h goal</div>
              </div>
            </div>

            {/* Streak Card */}
            <div className="study-card stat-card streak-card">
              <div className="stat-icon-wrapper fire">
                🔥
              </div>
              <div className="stat-card-info">
                <div className="stat-label">Study Streak</div>
                <div className="stat-value">{streak} Days</div>
                <div className="stat-sub">Keep the momentum going!</div>
              </div>
            </div>
          </div>

          {/* Quick Launch Focus Timer */}
          <div className="study-card quick-timer-card">
            <div className="card-title-row">
              <h3>⚡ Quick Focus Launcher</h3>
              <span className="card-sub-tag">Synced to API</span>
            </div>
            <div className="quick-buttons-row">
              <button
                className="quick-btn primary"
                onClick={() => {
                  handleSelectPreset(60);
                  setTimerMode('study');
                  handleSubTabChange('timer');
                }}
              >
                <span className="btn-icon">⏱️</span>
                <span className="btn-text">1 Hour Study</span>
              </button>
              <button
                className="quick-btn amber"
                onClick={() => {
                  handleSelectPreset(45);
                  setTimerMode('pyq');
                  handleSubTabChange('timer');
                }}
              >
                <span className="btn-icon">🎯</span>
                <span className="btn-text">45m PYQ</span>
              </button>
              <button
                className="quick-btn green"
                onClick={() => {
                  handleSelectPreset(10);
                  setTimerMode('break10');
                  handleSubTabChange('timer');
                }}
              >
                <span className="btn-icon">☕</span>
                <span className="btn-text">10m Break</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACKER TAB */}
      {activeTab === 'tracker' && (
        <div className="study-tracker-content">
          {trackerLoading ? (
            <div className="study-loading">
              <div className="loading-spinner" />
              <span>Fetching tracker state from medx API...</span>
            </div>
          ) : tracker ? (
            <>
              {/* Overall Progress Summary Bar */}
              <div className="study-card progress-summary-card">
                <div className="summary-top">
                  <span className="summary-title">Overall FMGE Progress</span>
                  <span className="summary-count">{progress}% ({completedItems}/{TOTAL_ITEMS})</span>
                </div>
                <div className="summary-bar-bg">
                  <div className="summary-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Grand Tests Section */}
              <div className="study-card gt-card">
                <div className="card-title-row">
                  <h3>🏆 Grand Tests (GTs)</h3>
                  <span className="gt-count">{completedGTs} / 7 Completed</span>
                </div>
                <div className="gt-grid">
                  {[1, 2, 3, 4, 5, 6, 7].map(num => {
                    const gtKey = `GT${num}`;
                    const checked = !!tracker.gts[gtKey];
                    return (
                      <button
                        key={gtKey}
                        className={`gt-pill ${checked ? 'checked' : ''}`}
                        onClick={() => handleGTChange(gtKey, checked)}
                      >
                        <div className="gt-circle">
                          {checked ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span>{num}</span>
                          )}
                        </div>
                        <span className="gt-label">GT {num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 19 Subjects Section */}
              <div className="subjects-header">
                <h3>📚 19 Medical Subjects</h3>
                <span className="subjects-sub">Tap checkboxes to sync progress live</span>
              </div>

              <div className="subjects-grid">
                {SUBJECTS_LIST.map(subject => {
                  const subData = tracker.subjects[subject] || {};
                  const subCompleted = SUBJECT_FIELDS.filter(f => (subData as any)[f]).length;
                  const subPct = Math.round((subCompleted / 6) * 100);

                  return (
                    <div key={subject} className="study-card subject-card">
                      <div className="subject-head">
                        <span className="subject-name">{subject}</span>
                        <span className="subject-badge">{subCompleted}/6</span>
                      </div>

                      <div className="subject-progress-bg">
                        <div className="subject-progress-fill" style={{ width: `${subPct}%` }} />
                      </div>

                      <div className="subject-fields-grid">
                        {SUBJECT_FIELDS.map(field => {
                          const isChecked = !!(subData as any)[field];
                          return (
                            <button
                              key={field}
                              className={`field-btn ${isChecked ? 'active' : ''}`}
                              onClick={() => handleSubjectChange(subject, field, isChecked)}
                            >
                              <span className="field-checkbox">
                                {isChecked && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </span>
                              <span className="field-name">{FIELD_LABELS[field]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TIMER & LOGS TAB */}
      {activeTab === 'timer' && (
        <div className="study-timer-content">
          {/* Main Focus Timer Card */}
          <div className="study-card timer-main-card">
            {/* Mode Switcher */}
            <div className="timer-mode-selector">
              <button
                className={`mode-btn ${timerMode === 'study' ? 'active-study' : ''}`}
                onClick={() => { setTimerMode('study'); handleSelectPreset(60); }}
              >
                📖 Study Mode
              </button>
              <button
                className={`mode-btn ${timerMode === 'pyq' ? 'active-pyq' : ''}`}
                onClick={() => { setTimerMode('pyq'); handleSelectPreset(45); }}
              >
                🎯 PYQ Mode
              </button>
              <button
                className={`mode-btn ${timerMode === 'break10' ? 'active-break' : ''}`}
                onClick={() => { setTimerMode('break10'); handleSelectPreset(10); }}
              >
                ☕ Break
              </button>
            </div>

            {/* Circular Timer Display */}
            <div className="timer-display-ring">
              <div className="timer-time-text">{formatTime(secondsRemaining)}</div>
              <div className="timer-mode-label">{timerMode.toUpperCase()} FOCUS SESSION</div>
            </div>

            {/* Presets */}
            <div className="timer-presets-row">
              {[15, 25, 45, 60, 90, 120].map(mins => (
                <button
                  key={mins}
                  className={`preset-chip ${timerDuration === mins * 60 ? 'selected' : ''}`}
                  onClick={() => handleSelectPreset(mins)}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="timer-actions-row">
              <button
                className={`timer-play-btn ${isTimerRunning ? 'pause' : 'start'}`}
                onClick={handleToggleTimer}
              >
                {isTimerRunning ? '⏸️ Pause' : '▶️ Start Focus Timer'}
              </button>

              <button className="timer-reset-btn" onClick={handleResetTimer}>
                🔄 Reset
              </button>

              <button
                className="timer-finish-btn"
                onClick={async () => {
                  const elapsed = timerDuration - secondsRemaining;
                  if (elapsed > 0) {
                    hapticFeedback('medium');
                    const modeLogged = timerMode === 'break10' ? 'study' : timerMode;
                    const st = await logStudyTime(elapsed, modeLogged, 'Manual Finished Session');
                    if (st) setStudyState(st);
                    handleResetTimer();
                  }
                }}
              >
                ✅ Finish & Log
              </button>
            </div>
          </div>

          {/* Quick Manual Time Logger Card */}
          <div className="study-card manual-log-card">
            <h3>📝 Quick Manual Time Log</h3>
            <div className="quick-add-buttons">
              <button
                disabled={isSubmittingLog}
                onClick={() => handleQuickLog(15 * 60, 'study')}
                className="quick-log-chip"
              >
                +15m Study
              </button>
              <button
                disabled={isSubmittingLog}
                onClick={() => handleQuickLog(30 * 60, 'study')}
                className="quick-log-chip"
              >
                +30m Study
              </button>
              <button
                disabled={isSubmittingLog}
                onClick={() => handleQuickLog(60 * 60, 'study')}
                className="quick-log-chip"
              >
                +1h Study
              </button>
              <button
                disabled={isSubmittingLog}
                onClick={() => handleQuickLog(30 * 60, 'pyq')}
                className="quick-log-chip pyq"
              >
                +30m PYQs
              </button>
              <button
                disabled={isSubmittingLog}
                onClick={() => handleQuickLog(60 * 60, 'pyq')}
                className="quick-log-chip pyq"
              >
                +1h PYQs
              </button>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleManualSubmitLog} className="custom-log-form">
              <input
                type="number"
                min="1"
                max="720"
                value={manualMinutes}
                onChange={e => setManualMinutes(e.target.value)}
                placeholder="Minutes"
                className="log-input mins"
              />
              <input
                type="text"
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                placeholder="Note (e.g. Pathology Rev)"
                className="log-input note"
              />
              <button type="submit" disabled={isSubmittingLog} className="log-submit-btn">
                {isSubmittingLog ? 'Saving...' : 'Log Time'}
              </button>
            </form>
          </div>

          {/* Weekly Study History Breakdown */}
          {studyState && studyState.weeklyHistory && (
            <div className="study-card weekly-chart-card">
              <div className="card-title-row">
                <h3>📊 Weekly Study Breakdown</h3>
                <span className="weekly-total">{studyState.weeklyGrandTotalHours || 0} hrs Total</span>
              </div>

              <div className="weekly-bar-chart">
                {studyState.weeklyHistory.map(dayLog => {
                  const maxHours = 12; // cap chart max for scaling
                  const studyPct = Math.min(100, Math.round((dayLog.studyHours / maxHours) * 100));
                  const pyqPct = Math.min(100, Math.round((dayLog.pyqHours / maxHours) * 100));

                  return (
                    <div key={dayLog.date} className="bar-column">
                      <div className="bar-values">
                        <span className="val-text">{dayLog.totalHours}h</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill study"
                          style={{ height: `${studyPct}%` }}
                          title={`Study: ${dayLog.studyHours}h`}
                        />
                        <div
                          className="bar-fill pyq"
                          style={{ height: `${pyqPct}%` }}
                          title={`PYQ: ${dayLog.pyqHours}h`}
                        />
                      </div>
                      <span className="day-name">{dayLog.day}</span>
                    </div>
                  );
                })}
              </div>

              <div className="chart-legend">
                <span className="legend-item study">
                  <span className="dot" /> Study Hours ({studyState.weeklyStudyTotalHours || 0}h)
                </span>
                <span className="legend-item pyq">
                  <span className="dot" /> PYQ Hours ({studyState.weeklyPyqTotalHours || 0}h)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
