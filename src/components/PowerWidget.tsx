import React from 'react';
import { usePower } from '../store/powerStore';
import { hapticFeedback } from '../telegram';
import PowerChartOverlay from './PowerChartOverlay';

function formatKwh(val: number): string {
  if (val >= 100) return val.toFixed(0);
  if (val >= 10) return val.toFixed(1);
  return val.toFixed(1);
}

interface PowerWidgetProps {
  chartOpen: boolean;
  setChartOpen: (open: boolean) => void;
}

export default function PowerWidget({ chartOpen, setChartOpen }: PowerWidgetProps) {
  const { todayPower, thisWeekPower, thisMonthPower, loading } = usePower();

  const handleTap = () => {
    hapticFeedback('light');
    setChartOpen(true);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTap();
    }
  };

  return (
    <>
      <div
        className="power-widget"
        onClick={handleTap}
        onKeyDown={handleKey}
        role="button"
        tabIndex={0}
        aria-label={`AC power usage. Today ${formatKwh(todayPower)} kWh. Open chart.`}
      >
        <div className="power-widget-header">
          <svg className="power-widget-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="power-widget-title">AC Power</span>
          <svg className="power-widget-chevron" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {loading ? (
          <div className="power-widget-loading">
            <div className="loading-spinner small" />
          </div>
        ) : (
          <div className="power-widget-stats">
            <div className="power-stat primary">
              <span className="power-stat-value">{formatKwh(todayPower)}</span>
              <span className="power-stat-unit">kWh</span>
              <span className="power-stat-label">Today</span>
            </div>
            <div className="power-stat-divider" />
            <div className="power-stat">
              <span className="power-stat-value">{formatKwh(thisWeekPower)}</span>
              <span className="power-stat-unit">kWh</span>
              <span className="power-stat-label">This Week</span>
            </div>
            <div className="power-stat-divider" />
            <div className="power-stat">
              <span className="power-stat-value">{formatKwh(thisMonthPower)}</span>
              <span className="power-stat-unit">kWh</span>
              <span className="power-stat-label">This Month</span>
            </div>
          </div>
        )}
      </div>

      <PowerChartOverlay isOpen={chartOpen} onClose={() => setChartOpen(false)} />
    </>
  );
}
