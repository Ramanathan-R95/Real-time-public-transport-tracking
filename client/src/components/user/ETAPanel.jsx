import React, { useEffect, useState } from 'react';
import { formatETA, haversine, formatDistance } from '../../utils/geoMath';

export default function ETAPanel({ eta, stops, currentPosition }) {
  const [countdown, setCountdown] = useState(eta?.eta_seconds || null);

  useEffect(() => {
    if (eta?.eta_seconds) setCountdown(eta.eta_seconds);
  }, [eta]);

  // Tick countdown locally between server updates
  useEffect(() => {
    if (!countdown) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const nextStop = stops?.find((s) => {
    if (!currentPosition) return false;
    return haversine(currentPosition.lat, currentPosition.lng, s.lat, s.lng) > 30;
  });

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* ETA header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
            letterSpacing: 2,
            marginBottom: 4,
          }}>
            ESTIMATED ARRIVAL
          </div>
          <div style={{
            fontSize: 36,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: countdown > 0 ? 'var(--accent)' : 'var(--text-dim)',
            lineHeight: 1,
          }}>
            {formatETA(countdown)}
          </div>
        </div>

        {eta?.confidence !== undefined && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              letterSpacing: 2,
              marginBottom: 4,
            }}>
              CONFIDENCE
            </div>
            <div style={{
              fontSize: 20,
              fontFamily: 'var(--font-mono)',
              color: eta.confidence > 0.7 ? 'var(--accent)' : 'var(--warning)',
            }}>
              {eta.fallback ? 'N/A' : `${Math.round(eta.confidence * 100)}%`}
            </div>
          </div>
        )}
      </div>

      {/* Next stop */}
      {nextStop && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
            animation: 'pulse 1.5s infinite',
          }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
              NEXT STOP
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
              {nextStop.name}
            </div>
          </div>
          {currentPosition && (
            <div style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--text-dim)',
            }}>
              {formatDistance(haversine(currentPosition.lat, currentPosition.lng, nextStop.lat, nextStop.lng))}
            </div>
          )}
        </div>
      )}

      {/* All stops */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: 2,
          marginBottom: 12,
        }}>
          ALL STOPS
        </div>
        {stops?.map((stop, i) => {
          const dist = currentPosition
            ? haversine(currentPosition.lat, currentPosition.lng, stop.lat, stop.lng)
            : null;
          const isPassed = dist !== null && dist < 30;

          return (
            <div key={stop._id || i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
              borderBottom: i < stops.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: isPassed ? 0.4 : 1,
              transition: 'opacity 0.3s',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  border: `2px solid ${isPassed ? 'var(--text-dim)' : 'var(--accent)'}`,
                  background: isPassed ? 'var(--text-dim)' : 'transparent',
                  flexShrink: 0,
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: isPassed ? 400 : 500 }}>
                  {stop.name}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-dim)',
              }}>
                {dist !== null ? formatDistance(dist) : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}