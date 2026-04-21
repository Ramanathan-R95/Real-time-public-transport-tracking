import React, { useState, useEffect, useRef } from 'react';
import api            from '../services/api';
import { useSSE }          from '../hooks/useSSE';
import { useInterpolator } from '../hooks/useInterpolator';
import MapView    from '../components/user/MapView';
import ETAPanel   from '../components/user/ETAPanel';
import StaleAlert from '../components/user/StaleAlert';

const STATUS_CFG = {
  waiting:             { color: 'var(--text-dim)', label: 'Waiting'     },
  started:             { color: 'var(--accent)',   label: 'Running'     },
  ended:               { color: 'var(--danger)',   label: 'Trip ended'  },
  driver_disconnected: { color: 'var(--warning)',  label: 'Signal lost' },
};

export default function UserPage() {
  const [routes,           setRoutes]           = useState([]);
  const [selectedRouteId,  setSelectedRouteId]  = useState('');
  const [selectedRoute,    setSelectedRoute]    = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [mapH, setMapH] = useState('50vh');
  const autoSelectedRef = useRef(false);

  // Responsive map height
  useEffect(() => {
    const fn = () => setMapH(window.innerWidth < 768 ? '40vh' : '50vh');
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Load routes
  useEffect(() => {
    api.get('/routes').then((r) => {
      if (!r.data?.length) return;
      setRoutes(r.data);
      setSelectedRouteId(r.data[0]._id);
    }).catch(console.error);
  }, []);

  // Load route detail (stops) when route changes
  useEffect(() => {
    if (!selectedRouteId) return;
    setSelectedRoute(null);
    autoSelectedRef.current = false;
    setSelectedDriverId(null);
    api.get(`/routes/${selectedRouteId}`)
      .then((r) => setSelectedRoute(r.data))
      .catch(console.error);
  }, [selectedRouteId]);

  // SSE — live data
  const { position, tripStatus, eta, connected, activeBuses } = useSSE({
    routeId: selectedRouteId,
  });

  // Buses on selected route
  const busesOnRoute = activeBuses.filter(
    (b) => b.routeId === selectedRouteId && b.lat && b.lng
  );

  // Auto-select first bus when list changes
  useEffect(() => {
    if (busesOnRoute.length > 0 && !autoSelectedRef.current) {
      setSelectedDriverId(busesOnRoute[0].driverId);
      autoSelectedRef.current = true;
    }
    if (busesOnRoute.length === 0) {
      setSelectedDriverId(null);
      autoSelectedRef.current = false;
    }
  }, [busesOnRoute.length]);

  // Target position for interpolation
  const selectedBus = selectedDriverId
    ? activeBuses.find((b) => b.driverId === selectedDriverId)
    : null;

  const targetPosition = (selectedBus?.lat && selectedBus?.lng)
    ? { lat: Number(selectedBus.lat), lng: Number(selectedBus.lng) }
    : (position?.lat && position?.lng)
    ? { lat: Number(position.lat), lng: Number(position.lng) }
    : null;

  const displayPos  = useInterpolator({ targetPosition, intervalMs: 8000 });
  const statusCfg   = STATUS_CFG[tripStatus] || STATUS_CFG.waiting;
  const sortedStops = selectedRoute?.stops
    ? [...selectedRoute.stops].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div style={{
      height:        'calc(100vh - 60px)',
      marginTop:     60,
      display:       'flex',
      flexDirection: 'column',
      background:    'var(--bg)',
      overflow:      'hidden',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        padding:        '9px 14px',
        background:     'var(--surface)',
        borderBottom:   '1px solid var(--border)',
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        flexShrink:     0,
      }}>
        {/* Route selector */}
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)', letterSpacing: 1, flexShrink: 0,
        }}>
          ROUTE
        </span>
        <select
          value={selectedRouteId}
          onChange={(e) => setSelectedRouteId(e.target.value)}
          style={{
            flex: 1, minWidth: 0,
            padding: '7px 10px',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)',
            fontSize: 13, appearance: 'none',
          }}
        >
          {routes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.routeNumber} — {r.routeName}
            </option>
          ))}
        </select>

        {/* Connection status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#00e5a0' : '#ff4d4d',
            animation:  connected ? 'pulse 2s infinite' : 'none',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: connected ? '#00e5a0' : '#ff4d4d',
            letterSpacing: 1,
          }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* ── Bus selector ── */}
      {busesOnRoute.length > 0 && (
        <div style={{
          padding:      '7px 14px',
          background:   'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display:      'flex', alignItems: 'center',
          gap:          8, flexShrink: 0, overflowX: 'auto',
        }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', letterSpacing: 1, flexShrink: 0,
          }}>
            BUS
          </span>
          {busesOnRoute.map((bus) => {
            const sel = bus.driverId === selectedDriverId;
            return (
              <button
                key={bus.driverId}
                onClick={() => setSelectedDriverId(bus.driverId)}
                style={{
                  padding:    '5px 14px', borderRadius: 20,
                  border:     `1.5px solid ${sel ? '#00e5a0' : 'var(--border2)'}`,
                  background: sel ? 'rgba(0,229,160,0.1)' : 'var(--surface2)',
                  color:      sel ? '#00e5a0' : 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  transition: 'all 0.15s',
                  display:    'flex', alignItems: 'center', gap: 6,
                }}
              >
                {/* Live dot */}
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#00e5a0',
                  animation: 'pulse 1.5s infinite',
                  flexShrink: 0,
                }} />
                {bus.vehicleNumber}
                <span style={{ opacity: 0.55, fontSize: 10 }}>
                  {bus.driverName}
                </span>
              </button>
            );
          })}

          <div style={{
            marginLeft: 'auto', padding: '4px 10px', borderRadius: 20,
            border:     `1px solid ${statusCfg.color}`,
            color:      statusCfg.color, fontSize: 10,
            fontFamily: 'var(--font-mono)', letterSpacing: 1,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {statusCfg.label.toUpperCase()}
          </div>
        </div>
      )}

      {/* ── Map ── */}
      <div style={{ height: mapH, flexShrink: 0, padding: '8px 12px 4px' }}>
        <MapView
          displayPos={displayPos}
          stops={sortedStops}
          activeBuses={activeBuses}
          selectedDriverId={selectedDriverId}
        />
      </div>

      {/* ── Bottom scrollable panel ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '6px 12px 28px',
        display: 'flex', flexDirection: 'column', gap: 10,
        WebkitOverflowScrolling: 'touch',
      }}>

        {selectedBus?.timestamp && (
          <StaleAlert lastTimestamp={selectedBus.timestamp} />
        )}

        {/* No active bus */}
        {busesOnRoute.length === 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-dim)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              No active bus on this route
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
              Ask the driver to start a trip from the driver portal.
              <br />
              The map will update automatically.
            </div>
          </div>
        )}

        {/* ETA panel */}
        {selectedDriverId && displayPos && (
          <ETAPanel
            eta={eta}
            stops={sortedStops}
            currentPosition={displayPos}
          />
        )}

        {tripStatus === 'ended' && (
          <div style={{
            background: '#1a0a0a', border: '1px solid var(--danger)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 13, color: 'var(--danger)',
            fontFamily: 'var(--font-mono)', textAlign: 'center',
          }}>
            Trip ended — waiting for next departure.
          </div>
        )}

        {tripStatus === 'driver_disconnected' && (
          <div style={{
            background: '#1a1200', border: '1px solid var(--warning)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 13, color: 'var(--warning)',
            fontFamily: 'var(--font-mono)', textAlign: 'center',
          }}>
            Driver signal lost — showing last known position.
          </div>
        )}

        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <a href="/login" style={{
            color: 'var(--text-faint)', fontSize: 11,
            fontFamily: 'var(--font-mono)', letterSpacing: 1,
          }}>
            DRIVER LOGIN →
          </a>
        </div>
      </div>
    </div>
  );
}