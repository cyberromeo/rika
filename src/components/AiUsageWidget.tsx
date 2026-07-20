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

  const renderProgress = (label: string, data?: UsageStat) => {
    if (!data) return null;
    const isRateLimited = data.status === 'rate-limited' || data.usagePercent >= 100;
    const progressColor = isRateLimited ? 'var(--priority-p1)' : (data.usagePercent > 80 ? 'var(--priority-p2)' : 'var(--tg-theme-button-color)');
    
    return (
      <div className="usage-item" key={label}>
        <div className="usage-header">
          <div className="usage-label-group">
            <span className="usage-label">{label}</span>
            <span className="usage-reset">Resets in {formatTime(data.resetInSec)}</span>
          </div>
          <span className="usage-stats" style={{ color: isRateLimited ? 'var(--priority-p1)' : 'var(--tg-theme-text-color)' }}>
            {data.usagePercent}%
          </span>
        </div>
        <div className="usage-bar-bg">
          <div 
            className={`usage-bar-fill ${isRateLimited ? 'pulse-alert' : ''}`} 
            style={{ width: `${Math.min(data.usagePercent, 100)}%`, background: progressColor }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="ai-usage-widget">
      <div className="widget-header">
        <svg className="widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <h2>Your Ai usage</h2>
      </div>

      <div className="widget-content">
        {loading ? (
          <div className="usage-loading">
            <div className="loading-spinner"></div>
            <p>Syncing data...</p>
          </div>
        ) : usage ? (
          <div className="usage-list">
            {renderProgress("OpenCode 5Hr", usage.rollingUsage)}
            {renderProgress("OpenCode Weekly", usage.weeklyUsage)}
            {renderProgress("OpenCode Monthly", usage.monthlyUsage)}
            {renderProgress("ChatGPT Plus", usage.chatgptUsage)}
          </div>
        ) : (
          <div className="usage-error">Could not load usage data.</div>
        )}
      </div>
    </div>
  );
}
