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

export default function AiUsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      const data: UsageData = {};
      
      // Fetch OpenCode limits
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
        const match = text.match(/rollingUsage:[^{]*({[^}]+}),weeklyUsage:[^{]*({[^}]+}),monthlyUsage:[^{]*({[^}]+})/);
        if (match) {
          const parseProps = (str: string) => {
            const status = str.match(/status:"([^"]+)"/)?.[1] || "ok";
            const resetInSec = parseInt(str.match(/resetInSec:(\d+)/)?.[1] || "0", 10);
            const usagePercent = parseInt(str.match(/usagePercent:(\d+)/)?.[1] || "0", 10);
            return { status, resetInSec, usagePercent };
          };
          data.rollingUsage = parseProps(match[1]);
          data.weeklyUsage = parseProps(match[2]);
          data.monthlyUsage = parseProps(match[3]);
        }
      } catch (err) {
        console.error("Failed to fetch OpenCode Usage", err);
      }

      // Fetch ChatGPT limits
      try {
        const response = await fetch("/api/chatgpt/backend-api/wham/usage", {
          method: "GET",
          headers: {
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
          }
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
        console.error("Failed to fetch ChatGPT Usage", err);
      }

      // Set state if we got anything, otherwise null to show error
      if (Object.keys(data).length > 0) {
        setUsage(data);
      } else {
        setUsage(null);
      }
      setLoading(false);
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
