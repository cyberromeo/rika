import type { ReactNode } from 'react';
import Icon from './Icon';

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="capsule">
        <div className="capsule-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function FeatureIcon({ name, color }: { name: string; color: string }) {
  return (
    <span className="feature-icon" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>
      <Icon name={name} size={18} />
    </span>
  );
}

export function CardTitle({ icon, color, title, right }: { icon: string; color: string; title: string; right?: ReactNode }) {
  return (
    <div className="card-title">
      <FeatureIcon name={icon} color={color} />
      <h3>{title}</h3>
      {right && <div className="card-title-right">{right}</div>}
    </div>
  );
}

export function Loading({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-list" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div className="skeleton" key={i} style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function Problem({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="problem">
      <Icon name="alert" size={18} />
      <span>{text}</span>
      {onRetry && (
        <button className="btn small ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <span>{text}</span>
    </div>
  );
}
