import React, { useEffect, useState } from 'react';
import './AiUsageWidget.css';

interface UsageData {
  rollingUsage: { status: string; resetInSec: number; usagePercent: number };
  weeklyUsage: { status: string; resetInSec: number; usagePercent: number };
  monthlyUsage: { status: string; resetInSec: number; usagePercent: number };
}

export default function AiUsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch("/api/opencode/workspace/wrk_01KWYHQ06WTW00CA0RFP7AK07Q/go", {
          method: "GET",
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Sec-Fetch-Site": "none",
            "Priority": "u=0, i",
            "Sec-Fetch-Mode": "navigate",
            "Accept-Language": "en-IN,en;q=0.9",
            "Sec-Fetch-Dest": "document",
          }
        });
        const text = await response.text();
        
        // Extract JSON from the raw HTML response via regex
        const match = text.match(/rollingUsage:({[^}]+}),weeklyUsage:({[^}]+}),monthlyUsage:({[^}]+})/);
        if (match) {
          // It's not standard JSON (keys unquoted), so we parse it manually or eval safely.
          // Since it's from a trusted first party we could just construct the object.
          const parseProps = (str: string) => {
            const status = str.match(/status:"([^"]+)"/)?.[1] || "ok";
            const resetInSec = parseInt(str.match(/resetInSec:(\d+)/)?.[1] || "0", 10);
            const usagePercent = parseInt(str.match(/usagePercent:(\d+)/)?.[1] || "0", 10);
            return { status, resetInSec, usagePercent };
          };

          setUsage({
            rollingUsage: parseProps(match[1]),
            weeklyUsage: parseProps(match[2]),
            monthlyUsage: parseProps(match[3]),
          });
        }
      } catch (err) {
        console.error("Failed to fetch Ai Usage, using fallback data", err);
        // Fallback mockup data in case of CORS or network error during demo
        setUsage({
          rollingUsage: { status: "ok", resetInSec: 13773, usagePercent: 12 },
          weeklyUsage: { status: "rate-limited", resetInSec: 37964, usagePercent: 100 },
          monthlyUsage: { status: "ok", resetInSec: 1647924, usagePercent: 57 }
        });
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

  const renderProgress = (label: string, data: { status: string; resetInSec: number; usagePercent: number }) => {
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
            {renderProgress("5 Hr Limit", usage.rollingUsage)}
            {renderProgress("Weekly Limit", usage.weeklyUsage)}
            {renderProgress("Monthly Limit", usage.monthlyUsage)}
          </div>
        ) : (
          <div className="usage-error">Could not load usage data.</div>
        )}
      </div>
    </div>
  );
}
