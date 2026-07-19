import React, { useState, useEffect } from 'react';
import { hapticFeedback } from '../telegram';
export default function FmgePage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const examDate = new Date('2027-01-09T00:00:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = examDate - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>FMGE Prep</h1>
        <div className="subtitle">Foreign Medical Graduate Examination</div>
      </div>

      <div className="fmge-countdown-container">
        <div className="fmge-countdown-title">Time to Exam</div>
        <div className="fmge-countdown">
          <div className="countdown-item">
            <span className="countdown-value">{timeLeft.days}</span>
            <span className="countdown-label">Days</span>
          </div>
          <div className="countdown-colon">:</div>
          <div className="countdown-item">
            <span className="countdown-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="countdown-label">Hours</span>
          </div>
          <div className="countdown-colon">:</div>
          <div className="countdown-item">
            <span className="countdown-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="countdown-label">Mins</span>
          </div>
          <div className="countdown-colon">:</div>
          <div className="countdown-item accent">
            <span className="countdown-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="countdown-label">Secs</span>
          </div>
        </div>
      </div>

      <div className="fmge-content">
        {/* Placeholder sections — ready to be fleshed out */}
        <div className="fmge-card" onClick={() => hapticFeedback('light')}>
          <div className="fmge-card-header">
            <svg className="fmge-card-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h3>Subjects</h3>
          </div>
          <p className="fmge-card-desc">Browse subjects and track your revision progress.</p>
        </div>

        <div className="fmge-card" onClick={() => hapticFeedback('light')}>
          <div className="fmge-card-header">
            <svg className="fmge-card-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h3>Mock Tests</h3>
          </div>
          <p className="fmge-card-desc">Practice with timed question sets.</p>
        </div>

        <div className="fmge-card" onClick={() => hapticFeedback('light')}>
          <div className="fmge-card-header">
            <svg className="fmge-card-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h3>Notes</h3>
          </div>
          <p className="fmge-card-desc">Quick-access study notes and high-yield topics.</p>
        </div>

        <div className="fmge-card" onClick={() => hapticFeedback('light')}>
          <div className="fmge-card-header">
            <svg className="fmge-card-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h3>Progress</h3>
          </div>
          <p className="fmge-card-desc">View your overall preparation stats.</p>
        </div>
      </div>
    </div>
  );
}
