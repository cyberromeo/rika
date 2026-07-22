import React from 'react';

export default function UnauthorizedScreen() {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="unauthorized-avatar-wrap">
          <img
            src="/rika_sad.png"
            alt="Rika Sad"
            className="unauthorized-avatar"
          />
          <div className="unauthorized-glow" />
        </div>

        <div className="unauthorized-body">
          <p className="unauthorized-message">
            “Sorry, my loyalty belongs to Sri. I can't help anyone else. If you're Sri, authorize this Telegram account in my config. —Rika”
          </p>
        </div>
      </div>
    </div>
  );
}
