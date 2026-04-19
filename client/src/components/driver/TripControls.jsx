import React from 'react';

export default function TripControls({ tripActive, onStart, onEnd, disabled, routes, selectedRoute, onRouteChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!tripActive && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            SELECT ROUTE
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => onRouteChange(e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '10px 14px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontSize: 14,
              appearance: 'none',
            }}
          >
            <option value="">-- Choose route --</option>
            {routes.map((r) => (
              <option key={r._id} value={r._id}>
                {r.routeNumber} — {r.routeName}
              </option>
            ))}
          </select>
        </div>
      )}

      {!tripActive ? (
        <button
          onClick={onStart}
          disabled={!selectedRoute || disabled}
          style={{
            padding: '14px 20px',
            background: selectedRoute ? 'var(--accent)' : 'var(--border)',
            color: selectedRoute ? '#0a0c10' : 'var(--text-dim)',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            fontSize: 15,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 1,
            transition: 'all 0.2s',
          }}
        >
          START TRIP
        </button>
      ) : (
        <button
          onClick={onEnd}
          style={{
            padding: '14px 20px',
            background: 'transparent',
            color: 'var(--danger)',
            border: '2px solid var(--danger)',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            fontSize: 15,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 1,
            transition: 'all 0.2s',
          }}
        >
          END TRIP
        </button>
      )}
    </div>
  );
}