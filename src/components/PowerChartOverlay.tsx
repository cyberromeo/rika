import React, { useState, useEffect, useRef } from 'react';
import { usePower, PowerDataPoint } from '../store/powerStore';
import { hapticFeedback } from '../telegram';

type ChartMode = 'days' | 'weeks' | 'months';

function formatKwh(val: number): string {
  if (val >= 100) return val.toFixed(0);
  if (val >= 10) return val.toFixed(1);
  return val.toFixed(1);
}

interface BarChartProps {
  data: PowerDataPoint[];
  accentColor: string;
}

function BarChart({ data, accentColor }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 0.1);
  const chartHeight = 180;
  const barGap = 6;
  const chartWidth = 100; // percentage-based internally, we use viewBox

  const barCount = data.length || 1;
  const viewBoxWidth = barCount * 48;
  const barWidth = (viewBoxWidth - (barCount + 1) * barGap) / barCount;

  return (
    <div className="power-bar-chart-wrapper">
      <svg
        className="power-bar-chart"
        viewBox={`0 0 ${viewBoxWidth} ${chartHeight + 30}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={0}
            y1={chartHeight - chartHeight * frac}
            x2={viewBoxWidth}
            y2={chartHeight - chartHeight * frac}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        ))}

        {data.map((d, i) => {
          const barHeight = maxVal > 0 ? (d.value / maxVal) * (chartHeight - 20) : 0;
          const x = barGap + i * (barWidth + barGap);
          const y = chartHeight - barHeight;
          const radius = Math.min(barWidth / 2, 4);

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={radius}
                ry={radius}
                fill={accentColor}
                opacity={0.85}
              />
              {/* Value label on top */}
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="7"
                  fill="rgba(255,255,255,0.6)"
                  fontFamily="inherit"
                >
                  {formatKwh(d.value)}
                </text>
              )}
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                fontSize="7.5"
                fill="rgba(255,255,255,0.45)"
                fontFamily="inherit"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Max value indicator */}
      <div className="power-chart-max">
        {formatKwh(maxVal)} kWh max
      </div>
    </div>
  );
}

interface PowerChartOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PowerChartOverlay({ isOpen, onClose }: PowerChartOverlayProps) {
  const { last7Days, last7Weeks, last7Months } = usePower();
  const [mode, setMode] = useState<ChartMode>('days');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      hapticFeedback('light');
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleModeChange = (newMode: ChartMode) => {
    hapticFeedback('light');
    setMode(newMode);
  };

  const getData = (): PowerDataPoint[] => {
    switch (mode) {
      case 'days': return last7Days;
      case 'weeks': return last7Weeks;
      case 'months': return last7Months;
    }
  };

  const getTotalLabel = (): string => {
    const data = getData();
    const total = data.reduce((sum, d) => sum + d.value, 0);
    return `${formatKwh(total)} kWh total`;
  };

  const getAccentColor = (): string => {
    switch (mode) {
      case 'days': return '#0a84ff';
      case 'weeks': return '#30d158';
      case 'months': return '#ff9f0a';
    }
  };

  return (
    <div
      ref={overlayRef}
      className={`power-chart-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div className={`power-chart-panel ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Power consumption chart">
        {/* Handle */}
        <div className="cart-handle-bar" />

        {/* Header */}
        <div className="power-chart-header">
          <div className="power-chart-header-left">
            <svg className="power-chart-header-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <div>
              <h2 className="power-chart-title">Power Usage</h2>
              <p className="power-chart-subtitle">{getTotalLabel()}</p>
            </div>
          </div>
          <button
            className="cart-close-btn"
            onClick={() => { hapticFeedback('light'); onClose(); }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Segmented Control */}
        <div className="power-chart-tabs">
          <button
            className={`power-chart-tab ${mode === 'days' ? 'active' : ''}`}
            onClick={() => handleModeChange('days')}
          >
            7 Days
          </button>
          <button
            className={`power-chart-tab ${mode === 'weeks' ? 'active' : ''}`}
            onClick={() => handleModeChange('weeks')}
          >
            7 Weeks
          </button>
          <button
            className={`power-chart-tab ${mode === 'months' ? 'active' : ''}`}
            onClick={() => handleModeChange('months')}
          >
            7 Months
          </button>
        </div>

        {/* Chart */}
        <div className="power-chart-body">
          <BarChart data={getData()} accentColor={getAccentColor()} />
        </div>
      </div>
    </div>
  );
}
