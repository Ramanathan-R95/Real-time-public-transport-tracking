import React, { useEffect, useState } from 'react';

export default function StaleAlert({ lastTimestamp }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastTimestamp) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastTimestamp)) / 1000);
      setSecondsAgo(diff);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [lastTimestamp]);

  if (secondsAgo < 30) return null;

  const isStale = secondsAgo > 60;

  return (
    <div style={{
      background: isStale ? '#1a0f00' : '#0f1a00',
      border: `1px solid ${isStale ? 'var(--warning)' : 'var(--accent)'}`,
      borderRadius: 8,
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
    }}>
      <span style={{
        width: 7, height: 7,
        borderRadius: '50%',
        background: isStale ? 'var(--warning)' : 'var(--accent)',
        animation: 'pulse 1.2s infinite',
        flexShrink: 0,
      }} />
      <span style={{ color: isStale ? 'var(--warning)' : 'var(--accent)' }}>
        {isStale
          ? `Last update ${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago — driver may be in low signal area`
          : `Last update ${secondsAgo}s ago`}
      </span>
    </div>
  );
}