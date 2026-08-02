import React, { useEffect, useMemo, useState } from 'react';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { hapticFeedback } from '../telegram';
import {
  getMotraData,
  subscribeMotraData,
  parseRecoveryPercent,
  recoveryTier,
  MUSCLE_LABELS,
  MotraData,
} from '../api/motra';

interface GymRecoveryWidgetProps {
  onNavigate?: () => void;
}

function relativeDay(dateStr: string): string {
  try {
    const diff = differenceInCalendarDays(new Date(), parseISO(dateStr));
    if (diff <= 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
    return `${Math.floor(diff / 365)}y ago`;
  } catch {
    return dateStr;
  }
}

export default function GymRecoveryWidget({ onNavigate }: GymRecoveryWidgetProps) {
  const [data, setData] = useState<MotraData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMotraData()
      .then(d => setData(d))
      .catch(e => console.error('Failed to load motra:', e))
      .finally(() => setLoading(false));

    const unsubscribe = subscribeMotraData(d => {
      setData(d);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const { recovery, fatigued, statusLabel } = useMemo(() => {
    if (!data) {
      return { recovery: 0, fatigued: [], statusLabel: 'Loading' };
    }
    const pct = parseRecoveryPercent(data.overall_recovery);
    const top = (data.muscles_needing_recovery || []).slice(0, 3);
    const label =
      data.recovering_muscles === 0 ? 'Fully recovered'
      : pct >= 90 ? 'Almost ready'
      : pct >= 70 ? 'Recovering'
      : 'Rest up';
    return { recovery: pct, fatigued: top, statusLabel: label };
  }, [data]);

  const handleTap = () => {
    hapticFeedback('light');
    onNavigate?.();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTap();
    }
  };

  return (
    <div
      className="gym-widget"
      onClick={handleTap}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      aria-label={`Gym recovery ${recovery}%. Open gym.`}
    >
      <div className="gym-widget-head">
        <div className="gym-widget-head-left">
          <svg className="gym-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11v11h-11z" />
            <path d="M3 9v6M21 9v6M6.5 12h11" />
          </svg>
          <span className="gym-widget-title">Gym</span>
        </div>
        <span className="gym-widget-status-tag">{statusLabel}</span>
      </div>

      {loading ? (
        <div className="gym-widget-loading">
          <div className="loading-spinner small" />
        </div>
      ) : data ? (
        <>
          <div className="gym-widget-body">
            <div className="gym-widget-ring">
              <svg viewBox="0 0 36 36" className="gym-widget-ring-svg">
                <circle className="gym-widget-ring-bg" cx="18" cy="18" r="15.5" />
                <circle
                  className="gym-widget-ring-fill"
                  cx="18" cy="18" r="15.5"
                  strokeDasharray={`${(recovery / 100) * 97.4} 97.4`}
                />
              </svg>
              <div className="gym-widget-ring-pct">
                <span className="gym-widget-ring-num">{recovery}</span>
                <span className="gym-widget-ring-sign">%</span>
              </div>
            </div>

            <div className="gym-widget-info">
              <div className="gym-widget-recovered">
                <span className="gym-widget-recovered-num">{data.recovered_muscles}</span>
                <span className="gym-widget-recovered-lbl">muscles recovered</span>
              </div>

              {fatigued.length > 0 ? (
                <div className="gym-widget-chips">
                  {fatigued.map(m => (
                    <span
                      key={m.muscle}
                      className={`gym-widget-chip tier-${recoveryTier(m.recovery)}`}
                    >
                      {MUSCLE_LABELS[m.muscle] || m.muscle} {m.recovery}%
                    </span>
                  ))}
                </div>
              ) : (
                <div className="gym-widget-chips">
                  <span className="gym-widget-chip tier-ready">Ready to train</span>
                </div>
              )}
            </div>
          </div>

          <div className="gym-widget-foot">
            <span className="gym-widget-last">
              {data.last_workout
                ? `Last ${relativeDay(data.last_workout.date)} · ${data.lifetime.workouts} lifetime`
                : `${data.lifetime.workouts} lifetime workouts`}
            </span>
            <span className="gym-widget-cta">
              Open gym
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </>
      ) : (
        <div className="gym-widget-loading">—</div>
      )}
    </div>
  );
}
