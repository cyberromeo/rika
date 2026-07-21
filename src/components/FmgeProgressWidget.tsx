import React, { useEffect, useMemo, useState } from 'react';
import {
  getTrackerData,
  calculateProgress,
  SUBJECTS_LIST,
  SUBJECT_FIELDS,
  TOTAL_ITEMS,
  TrackerData,
} from '../api/tracker';
import { hapticFeedback } from '../telegram';

const EXAM_DATE = new Date('2027-01-09T00:00:00').getTime();

interface FmgeProgressWidgetProps {
  onNavigate?: () => void;
}

export default function FmgeProgressWidget({ onNavigate }: FmgeProgressWidgetProps) {
  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTrackerData();
        setTracker(data);
      } catch (e) {
        console.error('Failed to load tracker:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const updateDays = () => {
      const distance = EXAM_DATE - Date.now();
      setDaysLeft(Math.max(0, Math.floor(distance / (1000 * 60 * 60 * 24))));
    };
    updateDays();
    const id = setInterval(updateDays, 60_000);
    return () => clearInterval(id);
  }, []);

  const { progress, completedItems, completedSubjects, completedGTs, statusLabel } = useMemo(() => {
    if (!tracker) {
      return {
        progress: 0,
        completedItems: 0,
        completedSubjects: 0,
        completedGTs: 0,
        statusLabel: 'Getting started',
      };
    }
    const p = calculateProgress(tracker);
    const items = Math.round((p / 100) * TOTAL_ITEMS);
    const subjects = SUBJECTS_LIST.filter(s => {
      const sd = tracker.subjects[s] || {};
      return SUBJECT_FIELDS.every(f => (sd as any)[f]);
    }).length;
    const gts = Object.values(tracker.gts).filter(Boolean).length;
    const label =
      p < 10 ? 'Just starting'
      : p < 30 ? 'Getting going'
      : p < 60 ? 'Halfway there'
      : p < 90 ? 'Almost done'
      : 'Ready!';
    return { progress: p, completedItems: items, completedSubjects: subjects, completedGTs: gts, statusLabel: label };
  }, [tracker]);

  const handleTap = () => {
    hapticFeedback('light');
    onNavigate?.();
  };

  return (
    <div className="fmge-widget" onClick={handleTap}>
      <div className="fmge-widget-head">
        <div className="fmge-widget-head-left">
          <svg className="fmge-widget-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="fmge-widget-title">FMGE Prep</span>
        </div>
        <span className="fmge-widget-days">
          <span className="fmge-widget-days-num">{daysLeft}</span>
          <span className="fmge-widget-days-lbl">days left</span>
        </span>
      </div>

      {loading ? (
        <div className="fmge-widget-loading">
          <div className="loading-spinner small" />
        </div>
      ) : (
        <div className="fmge-widget-body">
          <div className="fmge-widget-ring">
            <svg viewBox="0 0 36 36" className="fmge-widget-ring-svg">
              <circle className="fmge-widget-ring-bg" cx="18" cy="18" r="15.5" />
              <circle
                className="fmge-widget-ring-fill"
                cx="18" cy="18" r="15.5"
                strokeDasharray={`${(progress / 100) * 97.4} 97.4`}
              />
            </svg>
            <div className="fmge-widget-ring-pct">
              <span className="fmge-widget-ring-num">{progress}</span>
              <span className="fmge-widget-ring-pct-sign">%</span>
            </div>
          </div>

          <div className="fmge-widget-stats">
            <div className="fmge-widget-stat">
              <span className="fmge-widget-stat-num">{completedSubjects}</span>
              <span className="fmge-widget-stat-lbl">Subjects</span>
            </div>
            <div className="fmge-widget-stat-divider" />
            <div className="fmge-widget-stat">
              <span className="fmge-widget-stat-num">{completedGTs}<span className="fmge-widget-stat-sub">/7</span></span>
              <span className="fmge-widget-stat-lbl">Grand Tests</span>
            </div>
            <div className="fmge-widget-stat-divider" />
            <div className="fmge-widget-stat">
              <span className="fmge-widget-stat-num">{completedItems}<span className="fmge-widget-stat-sub">/{TOTAL_ITEMS}</span></span>
              <span className="fmge-widget-stat-lbl">Items</span>
            </div>
          </div>

          <div className="fmge-widget-bar">
            <div className="fmge-widget-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="fmge-widget-foot">
            <span className="fmge-widget-status">{statusLabel}</span>
            <span className="fmge-widget-cta">
              Open tracker
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
