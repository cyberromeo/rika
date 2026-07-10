import React from 'react';
import PowerWidget from '../components/PowerWidget';

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

      <div className="home-widgets">
        <PowerWidget />
      </div>
    </div>
  );
}
