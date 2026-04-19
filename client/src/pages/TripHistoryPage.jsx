import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function formatDuration(start, end) {
  if (!start) return '—';
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function TripHistoryPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/drivers/my-trips')
      .then((r) => { setTrips(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '86px 20px 24px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button
            onClick={() => navigate('/driver')}
            style={{
              width: 36, height: 36,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-dim)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: 3, marginBottom: 3 }}>
              CAMPUSTRACK
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Trip History</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', animation: 'pulse 1.5s infinite' }}>
            LOADING...
          </div>
        ) : trips.length === 0 ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>○</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>No trips yet.</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>
              Start a trip from the driver portal to see history here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trips.map((trip, i) => {
              const isActive = trip.status === 'active';
              const avgSpeed = trip.pings?.length
                ? (trip.pings.reduce((s, p) => s + (p.speed || 0), 0) / trip.pings.length * 3.6).toFixed(1)
                : null;

              return (
                <div key={trip._id} className="fade-in" style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '16px 18px',
                  animationDelay: `${i * 0.04}s`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                        {trip.route?.routeNumber} — {trip.route?.routeName || 'Unknown Route'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(trip.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {' · '}
                        {new Date(trip.startTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--text-dim)'}`,
                      color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: 1,
                    }}>
                      {isActive ? 'ACTIVE' : 'DONE'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                      { label: 'DURATION',  value: formatDuration(trip.startTime, trip.endTime) },
                      { label: 'PINGS',     value: trip.pings?.length ?? 0 },
                      { label: 'AVG SPEED', value: avgSpeed ? `${avgSpeed} km/h` : '—' },
                      { label: 'STATUS',    value: trip.status === 'completed' ? '✓' : '●' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}