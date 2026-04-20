import React, { useState, useEffect } from 'react';
import api            from '../services/api';
import { useSSE }          from '../hooks/useSSE';
import { useInterpolator } from '../hooks/useInterpolator';
import MapView    from '../components/user/MapView';
import ETAPanel   from '../components/user/ETAPanel';
import StaleAlert from '../components/user/StaleAlert';

const STATUS_CONFIG = {
  waiting:             { color: 'var(--text-dim)', label: 'Waiting'    },
  started:             { color: 'var(--accent)',   label: 'Running'    },
  ended:               { color: 'var(--danger)',   label: 'Trip ended' },
  driver_disconnected: { color: 'var(--warning)',  label: 'Signal lost'},
};

export default function UserPage() {
  const [routes,           setRoutes]           = useState([]);
  const [selectedRouteId,  setSelectedRouteId]  = useState('');
  const [selectedRoute,    setSelectedRoute]    = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [mapHeight,        setMapHeight]        = useState('52vh');

  useEffect(() => {
    const update = () => setMapHeight(window.innerWidth < 768 ? '42vh' : '52vh');
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    api.get('/routes').then((r) => {
      setRoutes(r.data);
      if (r.data.length > 0) setSelectedRouteId(r.data[0]._id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedRouteId) return;
    api.get(`/routes/${selectedRouteId}`)
      .then((r) => setSelectedRoute(r.data))
      .catch(console.error);
  }, [selectedRouteId]);

  const { position, tripStatus, eta, connected, activeBuses } = useSSE({
    routeId: selectedRouteId,
  });

  const busesOnRoute = activeBuses.filter((b) => b.routeId === selectedRouteId);

  // Auto-select first bus when buses appear
  useEffect(() => {
    if (busesOnRoute.length > 0 && !selectedDriverId) {
      setSelectedDriverId(busesOnRoute[0].driverId);
    }
    if (busesOnRoute.length === 0) setSelectedDriverId(null);
  }, [busesOnRoute.length]);

  // Get selected bus real-time position from activeBuses (updated on every ping)
  const selectedBus = selectedDriverId
    ? activeBuses.find((b) => b.driverId === selectedDriverId)
    : null;

  // Use selected bus lat/lng as interpolation target
  const targetPosition = selectedBus?.lat && selectedBus?.lng
    ? { lat: Number(selectedBus.lat), lng: Number(selectedBus.lng) }
    : position?.lat
    ? { lat: Number(position.lat), lng: Number(position.lng) }
    : null;

  const displayPos = useInterpolator({ targetPosition, intervalMs: 5000 });
  const statusCfg  = STATUS_CONFIG[tripStatus] || STATUS_CONFIG.waiting;
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

      {/* Top bar */}
      <div style={{
        padding:        '10px 16px',
        background:     'var(--surface)',
        borderBottom:   '1px solid var(--border)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexShrink:     0,
        gap:            12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <label style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', letterSpacing: 1, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            ROUTE
          </label>
          <select
            value={selectedRouteId}
            onChange={(e) => { setSelectedRouteId(e.target.value); setSelectedDriverId(null); }}
            style={{
              flex: 1, minWidth: 0,
              padding: '7px 10px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              appearance: 'none',
            }}
          >
            {routes.map((r) => (
              <option key={r._id} value={r._id}>
                {r.routeNumber} — {r.routeName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connected ? 'var(--accent)' : 'var(--danger)',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: connected ? 'var(--accent)' : 'var(--danger)',
            letterSpacing: 1,
          }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Bus selector */}
      {busesOnRoute.length > 0 && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          gap: 10, flexShrink: 0, overflowX: 'auto',
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
                  padding: '5px 14px', borderRadius: 20,
                  border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border2)'}`,
                  background: sel ? 'rgba(0,229,160,0.1)' : 'var(--surface2)',
                  color: sel ? 'var(--accent)' : 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {bus.vehicleNumber}
                <span style={{ marginLeft: 6, opacity: 0.55, fontSize: 10 }}>
                  {bus.driverName}
                </span>
              </button>
            );
          })}

          <div style={{
            marginLeft: 'auto',
            padding: '4px 10px', borderRadius: 20,
            border: `1px solid ${statusCfg.color}`,
            color: statusCfg.color, fontSize: 10,
            fontFamily: 'var(--font-mono)', letterSpacing: 1,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {statusCfg.label.toUpperCase()}
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{ height: mapHeight, flexShrink: 0, padding: '10px 12px 6px' }}>
        <MapView
          displayPos={displayPos}
          stops={sortedStops}
          activeBuses={activeBuses}
          selectedDriverId={selectedDriverId}
        />
      </div>

      {/* Bottom panel */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '6px 12px 24px',
        display: 'flex', flexDirection: 'column', gap: 10,
        WebkitOverflowScrolling: 'touch',
      }}>
        {selectedBus?.timestamp && (
          <StaleAlert lastTimestamp={selectedBus.timestamp} />
        )}

        {busesOnRoute.length === 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '24px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              No active bus on this route
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
              Map updates automatically when a driver starts a trip.
            </div>
          </div>
        )}

        {selectedDriverId && (
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
            color: 'var(--text-faint)', fontSize: 12,
            fontFamily: 'var(--font-mono)', letterSpacing: 1,
          }}>
            DRIVER LOGIN →
          </a>
        </div>
      </div>
    </div>
  );
}