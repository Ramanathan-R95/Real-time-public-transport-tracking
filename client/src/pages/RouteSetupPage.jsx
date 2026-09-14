import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ── Nominatim search ──
async function searchPlaces(query) {
  if (!query || query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'CampusTrack/1.0' },
  });
  return res.json();
}

// ── OSRM road path between consecutive stops ──
async function getOSRMPath(stops) {
  if (stops.length < 2) return [];
  try {
    const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
    const url    = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res    = await fetch(url);
    const data   = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates?.length) {
      // Returns [lng, lat] pairs — MapLibre uses [lng, lat]
      return data.routes[0].geometry.coordinates;
    }
  } catch (err) {
    console.error('[OSRM] Failed:', err);
  }
  // Fallback: straight line
  return stops.map((s) => [s.lng, s.lat]);
}

function setRouteGeometry(map, coordinates) {
  const source = map?.getSource?.('route');
  if (!source) return;

  source.setData({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
  });
}

function createStopMarkerEl(index, total) {
  const el     = document.createElement('div');
  const isFirst = index === 0;
  const isLast  = index === total - 1;
  const color   = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#1a1f2e';
  const border  = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#4b5563';
  const text    = isFirst ? 'S' : isLast ? 'E' : String(index + 1);
  const textClr = isFirst || isLast ? '#0a0c10' : '#00e5a0';
  el.style.cssText = 'width:34px;height:34px;cursor:grab;';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14"
        fill="${color}" fill-opacity="${isFirst || isLast ? 1 : 0.2}"
        stroke="${border}" stroke-width="2"/>
      <text x="17" y="21" font-family="monospace" font-size="11"
        font-weight="bold" text-anchor="middle" fill="${textClr}">${text}</text>
    </svg>`;
  return el;
}

export default function RouteSetupPage() {
  const navigate = useNavigate();
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef([]);
  const routeSourceRef  = useRef(false);

  const [routeName,      setRouteName]      = useState('');
  const [routeNumber,    setRouteNumber]    = useState('');
  const [stops,          setStops]          = useState([]);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [suggestions,    setSuggestions]    = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [pendingStop,    setPendingStop]    = useState(null);
  const [stopLabel,      setStopLabel]      = useState('');
  const [routeLoading,   setRouteLoading]   = useState(false);
  const searchDebounce  = useRef(null);

  // ── Init map ──
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style:     'https://tiles.openfreemap.org/styles/liberty',
      center:    [78.8537, 10.9152],
      zoom:      14,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // Add route source and layers
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });

      // Road line
      map.addLayer({
        id:     'route-road',
        type:   'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint:  {
          'line-color':   '#00e5a0',
          'line-width':   4,
          'line-opacity': 0.8,
        },
      });

      // Casing (outline) for depth effect
      map.addLayer({
        id:     'route-casing',
        type:   'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint:  {
          'line-color':    '#064e3b',
          'line-width':    7,
          'line-opacity':  0.4,
        },
      }, 'route-road');

      routeSourceRef.current = true;
    });

    map.on('click', (e) => {
      setPendingStop({
        lat:         e.lngLat.lat,
        lng:         e.lngLat.lng,
        displayName: `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`,
      });
      setStopLabel('');
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // ── Redraw markers + fetch OSRM road path when stops change ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add stop markers (draggable)
    stops.forEach((stop, i) => {
      const el     = createStopMarkerEl(i, stops.length);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center', draggable: true })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      // Update stop position on drag
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat();
        setStops((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], lat, lng };
          return updated;
        });
      });

      markersRef.current.push(marker);
    });

    // Fetch OSRM road path
    if (stops.length >= 2 && routeSourceRef.current) {
      setRouteLoading(true);
      let isActive = true;

      getOSRMPath(stops).then((coords) => {
        if (!isActive) return;
        setRouteGeometry(map, coords);
        setRouteLoading(false);
      }).catch(() => {
        if (!isActive) return;
        setRouteGeometry(map, stops.map((s) => [s.lng, s.lat]));
        setRouteLoading(false);
      });

      return () => { isActive = false; };
    }

    if (routeSourceRef.current) {
      setRouteGeometry(map, []);
      setRouteLoading(false);
    }
  }, [stops]);

  // ── Nominatim debounced search ──
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    if (searchQuery.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setSuggestions(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchDebounce.current);
  }, [searchQuery]);

  function handleSuggestionSelect(place) {
    const lat  = parseFloat(place.lat);
    const lng  = parseFloat(place.lon);
    const name = place.display_name.split(',').slice(0, 2).join(', ');
    setSuggestions([]);
    setSearchQuery('');
    mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: 17, speed: 1.4 });
    setPendingStop({ lat, lng, displayName: name });
    setStopLabel(name);
  }

  function confirmPendingStop() {
    if (!pendingStop || !stopLabel.trim()) return;
    setStops((prev) => [
      ...prev,
      { name: stopLabel.trim(), lat: pendingStop.lat, lng: pendingStop.lng, order: prev.length + 1 },
    ]);
    setPendingStop(null);
    setStopLabel('');
  }

  function removeStop(index) {
    setStops((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    );
  }

  function moveStop(index, dir) {
    setStops((prev) => {
      const next = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  async function handleSave() {
    if (!routeName.trim())    return setError('Route name is required');
    if (!routeNumber.trim())  return setError('Route number is required');
    if (stops.length < 2)     return setError('Add at least 2 stops');
    setError('');
    setSaving(true);
    try {
      await api.post('/routes', { routeName, routeNumber, stops });
      navigate('/driver');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '12px 20px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: 3, marginBottom: 2 }}>
            CAMPUSTRACK
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Setup Your Route</div>
        </div>
        <button onClick={() => navigate('/driver')} style={{
          padding: '7px 14px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{
          width: 340, background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', flexShrink: 0,
        }}>

          {/* Route name + number */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'ROUTE NAME',   value: routeName,   set: setRouteName,   placeholder: 'e.g. Main Gate to Engineering' },
              { label: 'ROUTE NUMBER', value: routeNumber, set: setRouteNumber, placeholder: 'e.g. R4' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 5 }}>
                  {label}
                </label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', fontSize: 13,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 6 }}>
              SEARCH & ADD STOP
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Type stop name or location..."
                style={{
                  width: '100%', padding: '9px 36px 9px 12px',
                  background: 'var(--surface2)',
                  border: `1px solid ${searchFocused ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, color: 'var(--text)', fontSize: 13,
                  transition: 'border-color 0.2s',
                }}
              />
              {searching && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%',
                  width: 14, height: 14, marginTop: -7,
                  border: '2px solid var(--accent)', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
              )}
            </div>

            {suggestions.length > 0 && searchFocused && (
              <div style={{
                position: 'absolute', left: 16, right: 16, top: '100%',
                background: 'var(--surface2)', border: '1px solid var(--accent)',
                borderRadius: '0 0 10px 10px', zIndex: 2000,
                overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {suggestions.map((place, i) => {
                  const parts = place.display_name.split(',');
                  return (
                    <div
                      key={place.place_id}
                      onMouseDown={() => handleSuggestionSelect(place)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 2 }}>
                        {parts.slice(0, 2).join(',')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {parts.slice(2, 4).join(',').trim()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Route loading indicator */}
          {routeLoading && (
            <div style={{
              padding: '8px 16px', background: 'rgba(0,229,160,0.05)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
            }}>
              <div style={{
                width: 12, height: 12,
                border: '2px solid var(--accent)', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              }} />
              Fetching road route...
            </div>
          )}

          {/* Stops list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
            <div style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)', letterSpacing: 1,
              marginBottom: 10, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>STOPS</span>
              <span style={{ color: stops.length >= 2 ? 'var(--accent)' : 'var(--text-dim)' }}>
                {stops.length} added
              </span>
            </div>

            {stops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◎</div>
                Search above or click the map
              </div>
            ) : stops.map((stop, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'rgba(0,229,160,0.15)' : i === stops.length - 1 ? 'rgba(255,77,77,0.15)' : 'var(--surface2)',
                  border: `1.5px solid ${i === 0 ? 'var(--accent)' : i === stops.length - 1 ? 'var(--danger)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: i === 0 ? 'var(--accent)' : i === stops.length - 1 ? 'var(--danger)' : 'var(--text-dim)',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stop.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                    {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {[
                    { label: '↑', disabled: i === 0,              action: () => moveStop(i, -1) },
                    { label: '↓', disabled: i === stops.length-1, action: () => moveStop(i,  1) },
                    { label: '✕', disabled: false,                action: () => removeStop(i), danger: true },
                  ].map(({ label, disabled, action, danger }) => (
                    <button key={label} onClick={action} disabled={disabled} style={{
                      width: 24, height: 24, fontSize: 11,
                      background: danger ? 'transparent' : 'var(--surface2)',
                      border: `1px solid ${danger ? 'var(--danger)' : 'var(--border)'}`,
                      borderRadius: 4,
                      color: disabled ? 'var(--border)' : danger ? 'var(--danger)' : 'var(--text-dim)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save footer */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
            {error && (
              <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 10 }}>
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || stops.length < 2}
              style={{
                width: '100%', padding: '13px',
                background: saving || stops.length < 2 ? 'var(--border)' : 'var(--accent)',
                color:      saving || stops.length < 2 ? 'var(--text-dim)' : '#0a0c10',
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                fontFamily: 'var(--font-mono)', letterSpacing: 1,
                border: 'none', cursor: saving || stops.length < 2 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'SAVING...' : `SAVE ROUTE (${stops.length} stops)`}
            </button>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Instruction overlay */}
          {!pendingStop && (
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,12,16,0.85)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '7px 16px',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
              pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 100,
              backdropFilter: 'blur(4px)',
            }}>
              Search on the left — or click map to place a stop
            </div>
          )}

          {/* Pending stop confirm card */}
          {pendingStop && (
            <div style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--surface)', border: '1px solid var(--accent)',
              borderRadius: 14, padding: '16px 18px', zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: 340,
            }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: 2, marginBottom: 10 }}>
                CONFIRM STOP {stops.length + 1}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                {pendingStop.lat.toFixed(5)}, {pendingStop.lng.toFixed(5)}
              </div>
              <input
                autoFocus
                value={stopLabel}
                onChange={(e) => setStopLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmPendingStop()}
                placeholder="Stop name (e.g. Main Gate)"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 13, marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={confirmPendingStop}
                  disabled={!stopLabel.trim()}
                  style={{
                    flex: 1, padding: '10px',
                    background: stopLabel.trim() ? 'var(--accent)' : 'var(--border)',
                    color:      stopLabel.trim() ? '#0a0c10' : 'var(--text-dim)',
                    borderRadius: 8, fontWeight: 700, fontSize: 13,
                    fontFamily: 'var(--font-mono)', border: 'none',
                    cursor: stopLabel.trim() ? 'pointer' : 'not-allowed', letterSpacing: 1,
                  }}
                >
                  ADD STOP
                </button>
                <button
                  onClick={() => { setPendingStop(null); setStopLabel(''); }}
                  style={{
                    padding: '10px 16px', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 8,
                    color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}