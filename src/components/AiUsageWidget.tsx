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
  chatgptUsage?: UsageStat;
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
    data.monthlyUsage ||
    data.chatgptUsage
  );
}

function severityFor(stat?: UsageStat): 'ok' | 'warn' | 'critical' {
  if (!stat) return 'ok';
  if (stat.status === 'rate-limited' || stat.usagePercent >= 100) return 'critical';
  if (stat.usagePercent > 80) return 'warn';
  return 'ok';
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

          try {
            const response = await fetch('/api/chatgpt/backend-api/wham/usage', {
              method: 'GET'
            });
            const json = await response.json();
            if (json?.rate_limit?.primary_window) {
              data.chatgptUsage = {
                status: json.rate_limit.limit_reached ? 'rate-limited' : 'ok',
                resetInSec: json.rate_limit.primary_window.reset_after_seconds,
                usagePercent: json.rate_limit.primary_window.used_percent
              };
            }
          } catch (err) {
            console.error('Failed to fetch ChatGPT Usage', err);
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

  const allStats: UsageStat[] = [usage?.rollingUsage, usage?.weeklyUsage, usage?.monthlyUsage, usage?.chatgptUsage].filter(Boolean) as UsageStat[];
  const maxUsage = allStats.length ? Math.max(...allStats.map(s => s.usagePercent)) : 0;
  const hasCritical = allStats.some(s => severityFor(s) === 'critical');
  const hasWarn = allStats.some(s => severityFor(s) === 'warn');
  const overallStatus: 'ok' | 'warn' | 'critical' = hasCritical ? 'critical' : hasWarn ? 'warn' : 'ok';
  const overallLabel = overallStatus === 'critical' ? 'Limited' : overallStatus === 'warn' ? 'High' : 'Healthy';

  const renderStat = (stat?: UsageStat) => {
    if (!stat) return null;
    const severity = severityFor(stat);
    return (
      <span className={`usage-pill ${severity}`}>
        <span className="usage-pill-dot" />
        {stat.usagePercent}%
      </span>
    );
  };

  const renderRow = (label: string, data?: UsageStat) => {
    if (!data) return null;
    const severity = severityFor(data);
    return (
      <div className={`usage-row ${severity}`} key={label}>
        <div className="usage-row-top">
          <div className="usage-row-label">
            <span className="usage-row-name">{label}</span>
          </div>
          {renderStat(data)}
        </div>
        <div className="usage-track">
          <div
            className={`usage-fill ${severity === 'critical' ? 'pulse-alert' : ''}`}
            style={{ width: `${Math.min(data.usagePercent, 100)}%` }}
          />
        </div>
        <div className="usage-row-bottom">
          <span className="usage-reset-text">Resets in {formatTime(data.resetInSec)}</span>
        </div>
      </div>
    );
  };

  const hasOpenCode = usage?.rollingUsage || usage?.weeklyUsage || usage?.monthlyUsage;
  const hasChatGPT = Boolean(usage?.chatgptUsage);

  return (
    <div className="ai-usage-widget">
      <div className="widget-header">
        <div className="widget-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="widget-header-text">
          <h2>AI Usage</h2>
          <span className="widget-header-sub">Live rate limits</span>
        </div>
        <div className={`widget-status-badge ${overallStatus}`}>
          <span className="status-dot" />
          {overallLabel}
        </div>
      </div>

      <div className="widget-content">
        {loading ? (
          <div className="usage-loading">
            <div className="loading-spinner" />
            <p>Syncing data…</p>
          </div>
        ) : usage ? (
          <div className="usage-body">
            {hasOpenCode && (
              <div className="usage-group">
                <div className="usage-group-head">
                  <span className="usage-group-icon opencode">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </span>
                  <span className="usage-group-name">OpenCode</span>
                  <span className="usage-group-peak">{maxUsage}% peak</span>
                </div>
                <div className="usage-rows">
                  {renderRow("5Hr Rolling", usage.rollingUsage)}
                  {renderRow("Weekly", usage.weeklyUsage)}
                  {renderRow("Monthly", usage.monthlyUsage)}
                </div>
              </div>
            )}

            {hasChatGPT && (
              <div className="usage-group">
                <div className="usage-group-head">
                  <span className="usage-group-icon chatgpt">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1 1 1 4 4 0 0 1 1 7 4 4 0 0 1-1 1 4 4 0 0 1-4 4 4 4 0 0 1-1-1 4 4 0 0 1-1 1 4 4 0 0 1-4-4 4 4 0 0 1-1-1 4 4 0 0 1 1-7 4 4 0 0 1 1-1 4 4 0 0 1 4-4z" />
                    </svg>
                  </span>
                  <span className="usage-group-name">ChatGPT Plus</span>
                </div>
                <div className="usage-rows">
                  {renderRow("Primary Window", usage.chatgptUsage)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="usage-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Could not load usage data.</p>
          </div>
        )}
      </div>
    </div>
  );
}