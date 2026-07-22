import React, { useState, useEffect, useCallback } from 'react';
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

const FIELD_LABELS: Record<string, string> = {
  Videos: 'Videos', R1: 'Rev 1', R2: 'Rev 2', PYQs: 'PYQs',
  RevisionVideos: 'Rev Vids', Qbank: 'Qbank',
};

type FmgeTab = 'overview' | 'tracker';

export default function FmgePage() {
  const [tab, setTab] = useState<FmgeTab>('overview');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [trackerLoading, setTrackerLoading] = useState(true);

  useEffect(() => {
    const examDate = new Date('2027-01-09T00:00:00').getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = examDate - now;
      if (distance < 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
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

  useEffect(() => {
    getTrackerData().then(data => { setTracker(data); setTrackerLoading(false); });
    const unsubscribe = subscribeTrackerData(data => {
      setTracker(data);
      setTrackerLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = (next: FmgeTab) => {
    if (next === tab) return;
    hapticFeedback('light');
    setTab(next);
  };

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

  const handleGTChange = useCallback(async (gt: string, currentValue: boolean) => {
    if (!tracker) return;
    hapticFeedback('light');
    const newVal = !currentValue;
    setTracker(prev => prev ? { ...prev, gts: { ...prev.gts, [gt]: newVal } } : prev);
    await updateGTTracker(gt, newVal);
  }, [tracker]);

  const progress = tracker ? calculateProgress(tracker) : 0;
  const completedItems = Math.round((progress / 100) * TOTAL_ITEMS);
  const completedGTs = tracker ? Object.values(tracker.gts).filter(Boolean).length : 0;
  const completedSubjects = tracker
    ? SUBJECTS_LIST.filter(s => {
        const sd = tracker.subjects[s] || {};
        return SUBJECT_FIELDS.every(f => (sd as any)[f]);
      }).length
    : 0;

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>FMGE Prep</h1>
        <div className="subtitle">Foreign Medical Graduate Examination</div>
      </div>

      {/* Segmented Control */}
      <div className="fmge-tabs">
        <button
          className={`fmge-tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
          role="tab"
          aria-selected={tab === 'overview'}
        >
          Overview
        </button>
        <button
          className={`fmge-tab ${tab === 'tracker' ? 'active' : ''}`}
          onClick={() => handleTabChange('tracker')}
          role="tab"
          aria-selected={tab === 'tracker'}
        >
          Tracker
        </button>
      </div>

      {tab === 'overview' ? (
        <>
          <div className="fmge-countdown-container">
            <div className="fmge-countdown-title">Time to Exam</div>
            <div className="fmge-countdown">
              <div className="countdown-item">
                <span className="countdown-value">{timeLeft.days}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-colon">:</div>
              <div className="countdown-item">
                <span className="countdown-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-colon">:</div>
              <div className="countdown-item">
                <span className="countdown-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="countdown-label">Mins</span>
              </div>
              <div className="countdown-colon">:</div>
              <div className="countdown-item accent">
                <span className="countdown-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="countdown-label">Secs</span>
              </div>
            </div>
          </div>

          {/* Quick Summary */}
          {!trackerLoading && tracker && (
            <div className="fmge-overview-stats">
              <div className="fmge-stat-card hero">
                <div className="fmge-stat-ring">
                  <svg viewBox="0 0 36 36" className="fmge-stat-ring-svg">
                    <circle className="fmge-stat-ring-bg" cx="18" cy="18" r="15.5" />
                    <circle
                      className="fmge-stat-ring-fill"
                      cx="18" cy="18" r="15.5"
                      strokeDasharray={`${(progress / 100) * 97.4} 97.4`}
                    />
                  </svg>
                  <span className="fmge-stat-ring-pct">{progress}%</span>
                </div>
                <div className="fmge-stat-hero-body">
                  <span className="fmge-stat-hero-label">Overall Progress</span>
                  <span className="fmge-stat-hero-count">{completedItems} / {TOTAL_ITEMS} items</span>
                </div>
              </div>

              <div className="fmge-stat-card">
                <span className="fmge-stat-value">{completedSubjects}</span>
                <span className="fmge-stat-value-sub">/ {SUBJECTS_LIST.length}</span>
                <span className="fmge-stat-label">Subjects done</span>
              </div>

              <div className="fmge-stat-card">
                <span className="fmge-stat-value">{completedGTs}</span>
                <span className="fmge-stat-value-sub">/ 7</span>
                <span className="fmge-stat-label">Grand Tests</span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Tracker tab */
        <div className="fmge-tracker-section">
          {trackerLoading ? (
            <div className="fmge-tracker-loading">
              <div className="loading-spinner small" />
            </div>
          ) : tracker ? (
            <>
              {/* Overall progress */}
              <div className="fmge-progress-summary">
                <div className="fmge-progress-summary-top">
                  <span className="fmge-progress-pct">{progress}%</span>
                  <span className="fmge-progress-count">
                    {completedItems} / {TOTAL_ITEMS}
                  </span>
                </div>
                <div className="fmge-progress-track">
                  <div className="fmge-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Grand Tests */}
              <div className="fmge-gt-section">
                <div className="fmge-gt-title">
                  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Grand Tests
                </div>
                <div className="fmge-gt-grid">
                  {[1, 2, 3, 4, 5, 6, 7].map(num => {
                    const key = `GT${num}`;
                    const checked = tracker.gts[key];
                    return (
                      <button
                        key={key}
                        className={`fmge-gt-btn ${checked ? 'checked' : ''}`}
                        onClick={() => handleGTChange(key, checked)}
                      >
                        {checked ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span>GT{num}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subjects */}
              <div className="fmge-subjects-title">Subjects</div>
              <div className="fmge-subjects-list">
                {SUBJECTS_LIST.map(subject => {
                  const subData = tracker.subjects[subject] || {};
                  const subCompleted = SUBJECT_FIELDS.filter(f => (subData as any)[f]).length;
                  const subProgress = Math.round((subCompleted / 6) * 100);
                  return (
                    <div key={subject} className="fmge-subject-card">
                      <div className="fmge-subject-header">
                        <span className="fmge-subject-name">{subject}</span>
                        <span className="fmge-subject-count">{subCompleted}/6</span>
                      </div>
                      <div className="fmge-subject-progress">
                        <div className="fmge-subject-progress-fill" style={{ width: `${subProgress}%` }} />
                      </div>
                      <div className="fmge-subject-fields">
                        {SUBJECT_FIELDS.map(field => {
                          const checked = !!(subData as any)[field];
                          return (
                            <button
                              key={field}
                              className={`fmge-field-btn ${checked ? 'checked' : ''}`}
                              onClick={() => handleSubjectChange(subject, field, checked)}
                            >
                              {FIELD_LABELS[field]}
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
    </div>
  );
}
