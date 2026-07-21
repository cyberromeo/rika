import React, { useEffect, useState } from 'react';
import { getTrackerData, calculateProgress } from '../api/tracker';
import { hapticFeedback } from '../telegram';

interface FmgeProgressWidgetProps {
  onNavigate?: () => void;
}

export default function FmgeProgressWidget({ onNavigate }: FmgeProgressWidgetProps) {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTrackerData();
        setProgress(calculateProgress(data));
      } catch (e) {
        console.error('Failed to load tracker:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleTap = () => {
    hapticFeedback('light');
    onNavigate?.();
  };

  return (
    <div className="fmge-progress-widget" onClick={handleTap}>
      <div className="fmge-progress-header">
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="fmge-progress-title">FMGE Progress</span>
        <svg className="fmge-progress-chevron" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      {loading ? (
        <div className="fmge-progress-loading">
          <div className="loading-spinner small" />
        </div>
      ) : (
        <div className="fmge-progress-body">
          <div className="fmge-progress-ring-container">
            <svg viewBox="0 0 36 36" className="fmge-progress-ring">
              <circle className="fmge-ring-bg" cx="18" cy="18" r="15.5" />
              <circle
                className="fmge-ring-fill"
                cx="18" cy="18" r="15.5"
                strokeDasharray={`${(progress / 100) * 97.4} 97.4`}
              />
            </svg>
            <span className="fmge-ring-pct">{progress}%</span>
          </div>
          <div className="fmge-progress-details">
            <div className="fmge-progress-bar-track">
              <div className="fmge-progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="fmge-progress-label">
              {progress < 30 ? 'Getting started' : progress < 60 ? 'Halfway there' : progress < 90 ? 'Almost done' : 'Ready!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
