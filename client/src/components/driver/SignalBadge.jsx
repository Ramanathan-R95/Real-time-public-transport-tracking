import React from 'react';

const config = {
  Excellent: { color: '#00e5a0', bars: 4 },
  Good:      { color: '#00e5a0', bars: 3 },
  Fair:      { color: '#ffb020', bars: 2 },
  Weak:      { color: '#ff7043', bars: 1 },
  Offline:   { color: '#ff4d4d', bars: 0 },
};

export default function SignalBadge({ label }) {
  const { color, bars } = config[label] || config.Offline;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
        {[1, 2, 3, 4].map((b) => (
          <div key={b} style={{
            width: 4,
            height: 4 + b * 3,
            borderRadius: 2,
            background: b <= bars ? color : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}