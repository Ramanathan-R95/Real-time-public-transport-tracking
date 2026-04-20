import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSSE } from '../hooks/useSSE';
import { useInterpolator } from '../hooks/useInterpolator';
import MapView from '../components/user/MapView';
import ETAPanel from '../components/user/ETAPanel';
import StaleAlert from '../components/user/StaleAlert';

const STATUS_CONFIG = {
  waiting:             { color: 'var(--text-dim)', label: 'Waiting'       },
  started:             { color: 'var(--accent)',   label: 'Running'       },
  ended:               { color: 'var(--danger)',   label: 'Trip ended'    },
  driver_disconnected: { color: 'var(--warning)',  label: 'Signal lost'   },
};

export default function UserPage() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  // Load routes
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

  // Filter buses on the selected route
  const busesOnRoute = activeBuses.filter((b) => b.routeId === selectedRouteId);

  // Auto-select first bus on route when buses change
  useEffect(() => {
    if (busesOnRoute.length > 0 && !selectedDriverId) {
      setSelectedDriverId(busesOnRoute[0].driverId);
    }
    if (busesOnRoute.length === 0) setSelectedDriverId(null);
  }, [busesOnRoute.length]);

  // Get position of selected bus
  const selectedBusPosition = selectedDriverId
    ? activeBuses.find((b) => b.driverId === selectedDriverId)
    : null;

  const targetPosition = selectedBusPosition?.lat
    ? { lat: selectedBusPosition.lat, lng: selectedBusPosition.lng }
    : position;

  const displayPos = useInterpolator({ targetPosition, intervalMs: 5000 });
  const statusCfg = STATUS_CONFIG[tripStatus] || STATUS_CONFIG.waiting;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', paddingTop: 62 }}>

      {/* Top bar */}
      <div style={{
        padding: '14px 20px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: 3, marginBottom: 2 }}>
            CAMPUSTRACK
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Live Tracking</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--accent)' : 'var(--danger)',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: connected ? 'var(--accent)' : 'var(--danger)', letterSpacing: 1 }}>
            {connected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>
      </div>

      {/* Route + Bus selectors */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Route selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 1, width: 44, flexShrink: 0 }}>
            ROUTE
          </div>
          <select
            value={selectedRouteId}
            onChange={(e) => { setSelectedRouteId(e.target.value); setSelectedDriverId(null); }}
            style={{
              flex: 1,
              padding: '7px 12px',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
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

        {/* Bus selector — only shows when buses are active on this route */}
        {busesOnRoute.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 1, width: 44, flexShrink: 0 }}>
              BUS
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {busesOnRoute.map((bus) => (
                <button
                  key={bus.driverId}
                  onClick={() => setSelectedDriverId(bus.driverId)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${bus.driverId === selectedDriverId ? 'var(--accent)' : 'var(--border)'}`,
                    background: bus.driverId === selectedDriverId ? 'rgba(0,229,160,0.1)' : 'var(--surface2)',
                    color: bus.driverId === selectedDriverId ? 'var(--accent)' : 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {bus.vehicleNumber}
                  <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>{bus.driverName}</span>
                </button>
              ))}
            </div>
            <div style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${statusCfg.color}`,
              color: statusCfg.color,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {statusCfg.label.toUpperCase()}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', paddingLeft: 54 }}>
            No active buses on this route
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ height: '52vh', flexShrink: 0, padding: '10px 16px 6px' }}>
        <MapView
          displayPos={displayPos}
          stops={selectedRoute?.stops || []}
          activeBuses={activeBuses}
          selectedDriverId={selectedDriverId}
        />
      </div>

      {/* Bottom panel */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '6px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {selectedBusPosition?.timestamp && (
          <StaleAlert lastTimestamp={selectedBusPosition.timestamp} />
        )}

        {busesOnRoute.length === 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>No active bus on this route.</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 6 }}>
              Map will update automatically when a driver starts a trip.
            </div>
          </div>
        )}

        {selectedDriverId && (
          <ETAPanel
            eta={eta}
            stops={selectedRoute?.stops?.sort((a, b) => a.order - b.order) || []}
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
            This trip has ended. Waiting for next departure.
          </div>
        )}

        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <a href="/login" style={{ color: 'var(--text-dim)', fontSize: 12, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
            Driver login →
          </a>
        </div>
      </div>
    </div>
  );
}