import React from 'react';

export default function BufferStatus({ count }) {
  if (count === 0) return null;
  return (
    <div style={{
      background: '#1a1200',
      border: '1px solid var(--warning)',
      borderRadius: 8,
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--warning)',
        animation: 'pulse 1.2s ease infinite',
        flexShrink: 0,
      }} />
      <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
        {count} ping{count > 1 ? 's' : ''} buffered — will sync on reconnect
      </span>
    </div>
  );
}