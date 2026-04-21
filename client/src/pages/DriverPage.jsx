import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useWebSocket }     from '../hooks/useWebSocket';
import { useGeolocation }   from '../hooks/useGeolocation';
import { useNetworkQuality } from '../hooks/useNetworkQuality';
import { bufferPing, getAllBuffered } from '../services/idbBuffer';
import { encodePosition, resetEncoder } from '../services/deltaEncoder';
import TripControls  from '../components/driver/TripControls';
import SignalBadge   from '../components/driver/SignalBadge';
import BufferStatus  from '../components/driver/BufferStatus';

export default function DriverPage() {
  const navigate = useNavigate();
  const driver   = JSON.parse(localStorage.getItem('driver_info') || '{}');
  const token    = localStorage.getItem('driver_token');

  const [routes,        setRoutes]        = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [tripActive,    setTripActive]    = useState(false);
  const [tripId,        setTripId]        = useState(null);
  const [bufferCount,   setBufferCount]   = useState(0);
  const [pingCount,     setPingCount]     = useState(0);
  const [lastPingTime,  setLastPingTime]  = useState(null);
  const [wsMessages,    setWsMessages]    = useState([]);
  const [hasRoute,      setHasRoute]      = useState(null);
  const [myRoute,       setMyRoute]       = useState(null);

  const quality      = useNetworkQuality();
  const lastSentTime = useRef(0);   // 0 = never sent → first ping goes immediately

  // Check if driver has route
  useEffect(() => {
    api.get('/routes/my')
      .then((r) => {
        if (r.data) {
          setHasRoute(true);
          setMyRoute(r.data);
          setSelectedRoute(r.data._id);
        } else {
          setHasRoute(false);
        }
      })
      .catch(() => setHasRoute(false));
  }, []);

  // Load all routes
  useEffect(() => {
    api.get('/routes').then((r) => setRoutes(r.data)).catch(console.error);
  }, []);

  // Poll buffer count
  useEffect(() => {
    const iv = setInterval(async () => {
      const b = await getAllBuffered();
      setBufferCount(b.length);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const { status: wsStatus, send } = useWebSocket({
    token,
    onMessage: (msg) => {
      console.log('[Driver] WS message:', msg);
      if (msg.type === 'trip_started') setTripId(msg.tripId);
      if (msg.type === 'trip_ended')   { setTripActive(false); setTripId(null); }
      setWsMessages((p) => [msg, ...p].slice(0, 8));
    },
  });

  // Called on every GPS fix
  const handlePosition = useCallback(async (ping) => {
    if (!tripActive) return;

    const now = Date.now();

    // First ping always goes — reset lastSentTime only when trip starts
    const minInterval = lastSentTime.current === 0 ? 0 : quality.interval;

    if (now - lastSentTime.current < minInterval) return;
    lastSentTime.current = now;

    console.log(`[Driver] Sending ping: lat=${ping.lat} lng=${ping.lng} ws=${wsStatus}`);

    if (wsStatus === 'connected') {
      send({
        type:      'ping',
        lat:       ping.lat,
        lng:       ping.lng,
        accuracy:  ping.accuracy,
        speed:     ping.speed,
        timestamp: ping.timestamp,
      });
    } else {
      await bufferPing(ping);
      console.log('[Driver] WS offline — buffered ping');
    }

    setPingCount((c) => c + 1);
    setLastPingTime(new Date().toLocaleTimeString());
  }, [tripActive, wsStatus, quality.interval, send]);

  const { lastPos, error: geoError } = useGeolocation({
    enabled:    tripActive,
    onPosition: handlePosition,
  });

  function handleStartTrip() {
    if (!selectedRoute) return;
    console.log('[Driver] Starting trip on route:', selectedRoute);
    resetEncoder();
    lastSentTime.current = 0;  // reset so first ping fires immediately
    send({ type: 'trip_start', routeId: selectedRoute });
    setTripActive(true);
    setPingCount(0);
  }

  function handleEndTrip() {
    send({ type: 'trip_end' });
    setTripActive(false);
    resetEncoder();
    lastSentTime.current = 0;
  }

  function handleLogout() {
    localStorage.clear();
    navigate('/login');
  }

  const wsColor = wsStatus === 'connected' ? 'var(--accent)'
    : wsStatus === 'reconnecting'           ? 'var(--warning)'
    : 'var(--danger)';

  if (hasRoute === null) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--text-dim)', letterSpacing: 2,
          animation: 'pulse 1.5s infinite',
        }}>
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 16px 32px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--accent)', letterSpacing: 3, marginBottom: 4,
            }}>
              CAMPUSTRACK
            </div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>
              {driver.name || 'Driver'}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
            }}>
              {driver.vehicleNumber}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/driver/history')}
              style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
              History
            </button>
            {hasRoute && (
              <button onClick={() => navigate('/driver/route-setup')}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
                Edit Route
              </button>
            )}
            <button onClick={handleLogout}
              style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>

        {!hasRoute ? (
          <div className="fade-in" style={{
            background: 'var(--surface)', border: '1px solid var(--accent)',
            borderRadius: 16, padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              No route assigned yet
            </div>
            <div style={{
              fontSize: 13, color: 'var(--text-dim)',
              lineHeight: 1.6, marginBottom: 24,
            }}>
              Set up your route once — students will use it to track you live.
            </div>
            <button onClick={() => navigate('/driver/route-setup')}
              style={{
                padding: '13px 28px', background: 'var(--accent)',
                color: '#080a0f', borderRadius: 10,
                fontWeight: 700, fontSize: 14,
                fontFamily: 'var(--font-mono)', letterSpacing: 1,
                border: 'none', cursor: 'pointer',
              }}>
              SETUP MY ROUTE
            </button>
          </div>
        ) : (
          <>
            {/* Route info */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: tripActive ? 'var(--accent)' : 'var(--text-dim)',
                animation: tripActive ? 'pulse 1.5s infinite' : 'none',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 2,
                }}>
                  MY ROUTE
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {myRoute?.routeNumber} — {myRoute?.routeName}
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--text-dim)',
              }}>
                {myRoute?.stops?.length} stops
              </div>
            </div>

            {/* Status bar */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16,
            }}>
              <SignalBadge label={quality.label} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: wsColor,
                  animation: wsStatus === 'reconnecting' ? 'pulse 1s infinite' : 'none',
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: wsColor, letterSpacing: 1,
                }}>
                  {wsStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {bufferCount > 0 && (
              <div style={{ marginBottom: 12 }}>
                <BufferStatus count={bufferCount} />
              </div>
            )}

            {geoError && (
              <div style={{
                background: '#1a0a0a', border: '1px solid var(--danger)',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: 'var(--danger)',
                marginBottom: 12, fontFamily: 'var(--font-mono)',
              }}>
                GPS Error: {geoError}
              </div>
            )}

            {/* Trip controls */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20, marginBottom: 16,
            }}>
              <TripControls
                tripActive={tripActive}
                onStart={handleStartTrip}
                onEnd={handleEndTrip}
                disabled={wsStatus !== 'connected'}
                routes={routes}
                selectedRoute={selectedRoute}
                onRouteChange={setSelectedRoute}
              />
            </div>

            {/* Live stats */}
            {tripActive && (
              <div className="fade-in" style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 20, marginBottom: 16,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 14,
                }}>
                  LIVE STATS
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
                }}>
                  {[
                    { label: 'PINGS SENT',  value: pingCount },
                    { label: 'INTERVAL',    value: `${quality.interval / 1000}s` },
                    { label: 'LAST PING',   value: lastPingTime || '—' },
                    { label: 'ACCURACY',
                      value: lastPos ? `${Math.round(lastPos.accuracy)}m` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{
                        fontSize: 10, color: 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 4,
                      }}>
                        {label}
                      </div>
                      <div style={{
                        fontSize: 22, fontFamily: 'var(--font-mono)',
                        color: 'var(--accent)', fontWeight: 700,
                      }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                {lastPos && (
                  <div style={{
                    marginTop: 14, paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text-dim)',
                  }}>
                    {lastPos.lat.toFixed(6)}, {lastPos.lng.toFixed(6)}
                  </div>
                )}
              </div>
            )}

            {/* Server log */}
            {wsMessages.length > 0 && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 10,
                }}>
                  SERVER LOG
                </div>
                {wsMessages.map((m, i) => (
                  <div key={i} style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text-dim)', padding: '4px 0',
                    borderBottom: i < wsMessages.length - 1
                      ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ color: 'var(--accent)' }}>{m.type}</span>
                    {m.tripId && ` → ${m.tripId.slice(-6)}`}
                    {m.count  !== undefined && ` (${m.count} pings)`}
                    {m.timestamp && ` @ ${new Date(m.timestamp).toLocaleTimeString()}`}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}