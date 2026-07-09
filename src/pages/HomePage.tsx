import React from 'react';
import { hapticFeedback } from '../telegram';

export default function HomePage() {
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Sri';
    if (hour < 17) return 'Good Afternoon, Sri';
    return 'Good Evening, Sri';
  })();

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>{greeting}</h1>
        <div className="subtitle">Here's your overview</div>
      </div>

      <div className="home-cards">
        {/* Quick Stats Card */}
        <div className="home-card" onClick={() => hapticFeedback('light')}>
          <div className="home-card-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="home-card-content">
            <h3>Dashboard</h3>
            <p>Your daily summary at a glance</p>
          </div>
        </div>

        {/* Study Card */}
        <div className="home-card" onClick={() => hapticFeedback('light')}>
          <div className="home-card-icon accent">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="home-card-content">
            <h3>Study Progress</h3>
            <p>Track your FMGE preparation</p>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="home-card" onClick={() => hapticFeedback('light')}>
          <div className="home-card-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="home-card-content">
            <h3>Upcoming</h3>
            <p>What's on your schedule today</p>
          </div>
        </div>
      </div>
    </div>
  );
}
