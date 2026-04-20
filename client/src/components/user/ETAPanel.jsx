import React, { useEffect, useState } from 'react';
import { formatETA, formatDistance, haversine } from '../../utils/geoMath';

function ConfidenceDots({ confidence }) {
  const level = confidence >= 0.7 ? 3 : confidence >= 0.4 ? 2 : confidence > 0 ? 1 : 0;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3].map((d) => (
        <div key={d} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: d <= level ? 'var(--accent)' : 'var(--border2)',
          transition: 'background 0.3s',
        }} />
      ))}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-dim)',
        marginLeft: 4,
        letterSpacing: 1,
      }}>
        {level === 3 ? 'HIGH' : level === 2 ? 'MED' : level === 1 ? 'LOW' : 'EST'}
      </span>
    </div>
  );
}

export default function ETAPanel({ eta, stops, currentPosition }) {
  // Local countdown ticks every second between server updates
  const [liveEtas, setLiveEtas] = useState([]);

  useEffect(() => {
    if (!eta?.stops?.length) return;
    setLiveEtas(eta.stops.map((s) => ({ ...s })));
  }, [eta]);

  useEffect(() => {
    if (!liveEtas.length) return;
    const t = setInterval(() => {
      setLiveEtas((prev) =>
        prev.map((s) => ({
          ...s,
          etaSeconds: Math.max(0, s.etaSeconds - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(t);
  }, [liveEtas.length > 0]);

  if (!eta && !stops?.length) return null;

  // If no ETA from server yet, show stop list with distances only
  if (!eta?.stops?.length) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 6,
          }}>
            STOPS ON THIS ROUTE
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            ETA will appear once the bus starts moving.
          </div>
        </div>
        <StopList stops={stops} currentPosition={currentPosition} liveEtas={[]} />
      </div>
    );
  }

  const nextStop = liveEtas[0];
  const arrived  = nextStop?.etaSeconds === 0;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>

      {/* ── Big ETA header ── */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        background: arrived ? 'rgba(0,229,160,0.04)' : 'transparent',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 4,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', letterSpacing: 2,
          }}>
            {arrived ? 'ARRIVING NOW' : 'NEXT STOP'}
          </div>
          <ConfidenceDots confidence={eta.confidence || 0} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
          <div style={{
            fontSize: 42,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: arrived ? 'var(--accent)' : 'var(--text)',
            lineHeight: 1,
            animation: arrived ? 'glow-pulse 1.5s infinite' : 'none',
          }}>
            {arrived ? 'NOW' : formatETA(nextStop?.etaSeconds)}
          </div>
          {!arrived && (
            <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
              until
            </div>
          )}
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
          {nextStop?.stopName}
        </div>

        {currentPosition && stops?.[nextStop?.stopIdx] && (
          <div style={{
            marginTop: 6,
            fontSize: 12,
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            {formatDistance(haversine(
              currentPosition.lat, currentPosition.lng,
              stops[nextStop.stopIdx].lat, stops[nextStop.stopIdx].lng
            ))} away
          </div>
        )}
      </div>

      {/* ── All remaining stops ── */}
      <StopList
        stops={stops}
        currentPosition={currentPosition}
        liveEtas={liveEtas}
        nearestIdx={eta.nearestStopIdx}
      />
    </div>
  );
}

function StopList({ stops, currentPosition, liveEtas, nearestIdx = 0 }) {
  return (
    <div>
      <div style={{
        padding: '10px 20px 6px',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-dim)', letterSpacing: 2,
      }}>
        ALL STOPS
      </div>

      {stops?.map((stop, i) => {
        const isPassed  = i < nearestIdx;
        const isNext    = i === nearestIdx;
        const etaEntry  = liveEtas.find((e) => e.stopIdx === i);
        const distM     = currentPosition
          ? haversine(currentPosition.lat, currentPosition.lng, stop.lat, stop.lng)
          : null;

        return (
          <div key={stop._id || i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 20px',
            borderBottom: i < stops.length - 1 ? '1px solid var(--border)' : 'none',
            background: isNext ? 'rgba(0,229,160,0.03)' : 'transparent',
            opacity: isPassed ? 0.35 : 1,
            transition: 'opacity 0.4s, background 0.3s',
          }}>

            {/* Stop indicator */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0,
              gap: 0,
            }}>
              <div style={{
                width: isPassed ? 10 : isNext ? 12 : 10,
                height: isPassed ? 10 : isNext ? 12 : 10,
                borderRadius: '50%',
                background: isPassed
                  ? 'var(--text-faint)'
                  : isNext
                  ? 'var(--accent)'
                  : 'transparent',
                border: isPassed
                  ? 'none'
                  : isNext
                  ? '2px solid var(--accent)'
                  : '2px solid var(--border2)',
                boxShadow: isNext ? '0 0 8px rgba(0,229,160,0.4)' : 'none',
                transition: 'all 0.3s',
              }} />
            </div>

            {/* Stop name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: isNext ? 600 : 400,
                color: isPassed ? 'var(--text-dim)' : isNext ? 'var(--accent)' : 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {isPassed && '✓ '}{stop.name}
              </div>
              {distM !== null && !isPassed && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                  {formatDistance(distM)}
                </div>
              )}
            </div>

            {/* ETA */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {isPassed ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
                  passed
                </span>
              ) : etaEntry ? (
                <div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: isNext ? 16 : 13,
                    fontWeight: isNext ? 700 : 400,
                    color: isNext ? 'var(--accent)' : 'var(--text-dim)',
                  }}>
                    {etaEntry.etaSeconds === 0 ? 'NOW' : formatETA(etaEntry.etaSeconds)}
                  </div>
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
                  —
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}