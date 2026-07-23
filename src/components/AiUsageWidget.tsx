import React, { useEffect, useState } from 'react';
import './AiUsageWidget.css';

interface UsageStat {
  status: string;
  resetInSec: number;
  usagePercent: number;
}

interface UsageData {
  rollingUsage?: UsageStat;
  weeklyUsage?: UsageStat;
  monthlyUsage?: UsageStat;
}

function parseOpenCodeUsage(text: string): Pick<UsageData, 'rollingUsage' | 'weeklyUsage' | 'monthlyUsage'> | null {
  const match = text.match(/rollingUsage:[^{]*({[^}]+}),weeklyUsage:[^{]*({[^}]+}),monthlyUsage:[^{]*({[^}]+})/);
  if (!match) return null;

  const parseProps = (str: string): UsageStat => {
    const status = str.match(/status:"([^"]+)"/)?.[1] || 'ok';
    const resetInSec = parseInt(str.match(/resetInSec:(\d+)/)?.[1] || '0', 10);
    const usagePercent = parseInt(str.match(/usagePercent:(\d+)/)?.[1] || '0', 10);
    return { status, resetInSec, usagePercent };
  };

  return {
    rollingUsage: parseProps(match[1]),
    weeklyUsage: parseProps(match[2]),
    monthlyUsage: parseProps(match[3]),
  };
}

function hasUsageData(data: UsageData): boolean {
  return Boolean(
    data.rollingUsage ||
    data.weeklyUsage ||
    data.monthlyUsage
  );
}

function severityFor(stat?: UsageStat): 'ok' | 'warn' | 'critical' {
  if (!stat) return 'ok';
  if (stat.status === 'rate-limited' || stat.usagePercent >= 100) return 'critical';
  if (stat.usagePercent > 80) return 'warn';
  return 'ok';
}

interface Tile {
  label: string;
  short: string;
  stat?: UsageStat;
}

export default function AiUsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        if (import.meta.env.DEV) {
          const data: UsageData = {};

          try {
            const response = await fetch('/api/opencode/workspace/wrk_01KWYHQ06WTW00CA0RFP7AK07Q/go', {
              method: 'GET'
            });
            const text = await response.text();
            const parsed = parseOpenCodeUsage(text);
            if (parsed) {
              Object.assign(data, parsed);
            }
          } catch (err) {
            console.error('Failed to fetch OpenCode Usage', err);
          }

          setUsage(hasUsageData(data) ? data : null);
          return;
        }

        const response = await fetch('/api/ai-usage', { method: 'GET' });
        if (!response.ok) {
          throw new Error(`AI usage API failed with ${response.status}`);
        }

        const data = await response.json() as UsageData & { errors?: string[] };
        if (data.errors?.length) {
          console.warn('AI usage partially loaded', data.errors);
        }

        if (hasUsageData(data)) {
          setUsage(data);
        } else {
          setUsage(null);
        }
      } catch (err) {
        console.error('Failed to fetch AI usage', err);
        setUsage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds > 86400) return `${Math.floor(seconds / 86400)}d`;
    if (seconds > 3600) return `${Math.floor(seconds / 3600)}h`;
    if (seconds > 60) return `${Math.floor(seconds / 60)}m`;
    return `${seconds}s`;
  };

  const tiles: Tile[] = [
    { label: 'OpenCode 5Hr', short: '5Hr', stat: usage?.rollingUsage },
    { label: 'OpenCode Weekly', short: 'Wk', stat: usage?.weeklyUsage },
    { label: 'OpenCode Monthly', short: 'Mo', stat: usage?.monthlyUsage },
  ];

  const visibleTiles = tiles.filter(t => t.stat);
  const allStats = visibleTiles.map(t => t.stat) as UsageStat[];
  const hasCritical = allStats.some(s => severityFor(s) === 'critical');
  const hasWarn = allStats.some(s => severityFor(s) === 'warn');
  const overall: 'ok' | 'warn' | 'critical' = hasCritical ? 'critical' : hasWarn ? 'warn' : 'ok';

  const renderTile = (tile: Tile) => {
    if (!tile.stat) return null;
    const severity = severityFor(tile.stat);
    const pct = Math.min(tile.stat.usagePercent, 100);
    return (
      <div className={`ai-tile ${severity}`} key={tile.label} title={`${tile.label} • resets in ${formatTime(tile.stat.resetInSec)}`}>
        <span className="ai-tile-label">{tile.short}</span>
        <div className="ai-tile-ring">
          <svg viewBox="0 0 36 36">
            <circle className="ai-ring-bg" cx="18" cy="18" r="15.5" />
            <circle
              className="ai-ring-fill"
              cx="18" cy="18" r="15.5"
              strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
            />
          </svg>
          <span className="ai-tile-pct">{tile.stat.usagePercent}</span>
        </div>
        <span className="ai-tile-reset">{formatTime(tile.stat.resetInSec)}</span>
      </div>
    );
  };

  return (
    <div className="ai-usage-widget">
      <div className="ai-widget-head">
        <div className="ai-head-title">
          <svg className="ai-head-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>AI</span>
          <span className={`ai-head-dot ${overall}`} />
        </div>
      </div>

      <div className="ai-tiles">
        {loading ? (
          <div className="ai-tiles-loading">
            <div className="ai-mini-spinner" />
          </div>
        ) : visibleTiles.length ? (
          visibleTiles.map(renderTile)
        ) : (
          <div className="ai-tiles-error">—</div>
        )}
      </div>
    </div>
  );
}
