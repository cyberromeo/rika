import React from 'react';
import PowerWidget from '../components/PowerWidget';
import AiUsageWidget from '../components/AiUsageWidget';
import FmgeProgressWidget from '../components/FmgeProgressWidget';

interface HomePageProps {
  chartOpen: boolean;
  setChartOpen: (open: boolean) => void;
}

export default function HomePage({ chartOpen, setChartOpen }: HomePageProps) {
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

      <div className="home-widgets" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 20px' }}>
        <AiUsageWidget />
        <FmgeProgressWidget />
        <PowerWidget chartOpen={chartOpen} setChartOpen={setChartOpen} />
      </div>
    </div>
  );
}
