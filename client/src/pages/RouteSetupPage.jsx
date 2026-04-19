import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../services/api';

// ── Nominatim search (OSM geocoding, free, no key) ──
async function searchPlaces(query) {
  if (!query || query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'CampusTrack/1.0' },
  });
  return res.json();
}

// ── OSRM road routing between two points (free, no key) ──
async function getRoadPath(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch {}
  // Fallback: straight line
  return [[from.lat, from.lng], [to.lat, to.lng]];
}

// ── Get full road path through all stops in order ──
async function getFullRoadPath(stops) {
  if (stops.length < 2) return [];
  const segments = await Promise.all(
    stops.slice(0, -1).map((s, i) => getRoadPath(s, stops[i + 1]))
  );
  // Merge segments, removing duplicate junction points
  return segments.reduce((acc, seg, i) => {
    return i === 0 ? [...acc, ...seg] : [...acc, ...seg.slice(1)];
  }, []);
}

function createStopIcon(index, isFirst, isLast) {
  const bg = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#1a1f2e';
  const border = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#4b5563';
  const textColor = isFirst || isLast ? '#0a0c10' : '#00e5a0';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="${bg}" fill-opacity="${isFirst || isLast ? 1 : 0.15}"
        stroke="${border}" stroke-width="2"/>
      <text x="17" y="21" font-family="monospace" font-size="11" font-weight="bold"
        text-anchor="middle" fill="${textColor}">${index + 1}</text>
    </svg>
  `;
  return L.divIcon({ html: svg, iconSize: [34, 34], iconAnchor: [17, 17], className: '' });
}

export default function RouteSetupPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);

  const [routeName, setRouteName] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [stops, setStops] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchDebounce = useRef(null);

  // Pending stop before name confirmed
  const [pendingStop, setPendingStop] = useState(null); // { lat, lng, displayName }
  const [stopLabel, setStopLabel] = useState('');

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [10.9152, 78.8537],
      zoom: 15,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Allow clicking map directly too
    map.on('click', (e) => {
      setPendingStop({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        displayName: `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`,
      });
      setStopLabel('');
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Debounced nominatim search
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

  // Redraw markers + road route when stops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear route line
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    // Draw markers
    stops.forEach((stop, i) => {
      const icon = createStopIcon(i, i === 0, i === stops.length - 1);
      const marker = L.marker([stop.lat, stop.lng], { icon, draggable: true })
        .addTo(map)
        .bindTooltip(`<span style="font-family:monospace;font-size:11px">${stop.name}</span>`, {
          permanent: true,
          direction: 'top',
          offset: [0, -20],
          className: 'stop-tooltip',
        });

      // Allow dragging to adjust position
      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setStops((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], lat, lng };
          return updated;
        });
      });

      markersRef.current.push(marker);
    });

    // Draw road route
    if (stops.length >= 2) {
      getFullRoadPath(stops).then((path) => {
        if (!mapInstanceRef.current) return;
        routeLineRef.current = L.polyline(path, {
          color: '#00e5a0',
          weight: 4,
          opacity: 0.7,
        }).addTo(mapInstanceRef.current);
      });
    }
  }, [stops]);

  // When a suggestion is selected from search
  function handleSuggestionSelect(place) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const name = place.display_name.split(',').slice(0, 2).join(', ');

    setSuggestions([]);
    setSearchQuery('');

    // Pan map to location
    mapInstanceRef.current?.setView([lat, lng], 17);

    // Set as pending stop with the place name pre-filled
    setPendingStop({ lat, lng, displayName: name });
    setStopLabel(name);
  }

  function confirmPendingStop() {
    if (!pendingStop || !stopLabel.trim()) return;
    setStops((prev) => [
      ...prev,
      {
        name: stopLabel.trim(),
        lat: pendingStop.lat,
        lng: pendingStop.lng,
        order: prev.length + 1,
      },
    ]);
    setPendingStop(null);
    setStopLabel('');
  }

  function cancelPendingStop() {
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
    if (!routeName.trim()) return setError('Route name is required');
    if (!routeNumber.trim()) return setError('Route number is required');
    if (stops.length < 2) return setError('Add at least 2 stops');
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
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent)',
            letterSpacing: 3,
            marginBottom: 2,
          }}>
            CAMPUSTRACK
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Setup Your Route</div>
        </div>
        <button
          onClick={() => navigate('/driver')}
          style={{
            padding: '7px 14px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-dim)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel ── */}
        <div style={{
          width: 340,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}>

          {/* Route name + number */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                letterSpacing: 1,
                marginBottom: 5,
              }}>
                ROUTE NAME
              </label>
              <input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g. Main Gate to Engineering Block"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                letterSpacing: 1,
                marginBottom: 5,
              }}>
                ROUTE NUMBER
              </label>
              <input
                value={routeNumber}
                onChange={(e) => setRouteNumber(e.target.value)}
                placeholder="e.g. R4"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Search box */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
          }}>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              letterSpacing: 1,
              marginBottom: 6,
            }}>
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
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  background: 'var(--surface2)',
                  border: `1px solid ${searchFocused ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 13,
                  transition: 'border-color 0.2s',
                }}
              />
              {searching && (
                <div style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14,
                  height: 14,
                  border: '2px solid var(--accent)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
            </div>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && searchFocused && (
              <div style={{
                position: 'absolute',
                left: 16,
                right: 16,
                top: '100%',
                marginTop: -2,
                background: 'var(--surface2)',
                border: '1px solid var(--accent)',
                borderRadius: '0 0 10px 10px',
                zIndex: 2000,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {suggestions.map((place, i) => {
                  const parts = place.display_name.split(',');
                  const main = parts.slice(0, 2).join(',');
                  const sub = parts.slice(2, 4).join(',').trim();
                  return (
                    <div
                      key={place.place_id}
                      onMouseDown={() => handleSuggestionSelect(place)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,229,160,0.07)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        fontSize: 13,
                        color: 'var(--text)',
                        fontWeight: 500,
                        marginBottom: 2,
                      }}>
                        {main}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stops list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
            <div style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              letterSpacing: 1,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>STOPS</span>
              <span style={{ color: stops.length >= 2 ? 'var(--accent)' : 'var(--text-dim)' }}>
                {stops.length} added
              </span>
            </div>

            {stops.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 0',
                color: 'var(--text-dim)',
                fontSize: 13,
                lineHeight: 1.8,
              }}>
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◎</div>
                Search for a location above
                <br />
                or click directly on the map
              </div>
            ) : (
              stops.map((stop, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {/* Order badge */}
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: i === 0
                      ? 'rgba(0,229,160,0.15)'
                      : i === stops.length - 1
                      ? 'rgba(255,77,77,0.15)'
                      : 'var(--surface2)',
                    border: `1.5px solid ${
                      i === 0 ? 'var(--accent)'
                      : i === stops.length - 1 ? 'var(--danger)'
                      : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: i === 0
                      ? 'var(--accent)'
                      : i === stops.length - 1
                      ? 'var(--danger)'
                      : 'var(--text-dim)',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>

                  {/* Stop name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {stop.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 1,
                    }}>
                      {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    <button
                      onClick={() => moveStop(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                      style={{
                        width: 24, height: 24,
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: i === 0 ? 'var(--border)' : 'var(--text-dim)',
                        fontSize: 11,
                        cursor: i === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStop(i, 1)}
                      disabled={i === stops.length - 1}
                      title="Move down"
                      style={{
                        width: 24, height: 24,
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: i === stops.length - 1 ? 'var(--border)' : 'var(--text-dim)',
                        fontSize: 11,
                        cursor: i === stops.length - 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeStop(i)}
                      title="Remove stop"
                      style={{
                        width: 24, height: 24,
                        background: 'transparent',
                        border: '1px solid var(--danger)',
                        borderRadius: 4,
                        color: 'var(--danger)',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Save footer */}
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border)',
          }}>
            {error && (
              <div style={{
                color: 'var(--danger)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                marginBottom: 10,
              }}>
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || stops.length < 2}
              style={{
                width: '100%',
                padding: '13px',
                background: saving || stops.length < 2 ? 'var(--border)' : 'var(--accent)',
                color: saving || stops.length < 2 ? 'var(--text-dim)' : '#0a0c10',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                letterSpacing: 1,
                border: 'none',
                cursor: saving || stops.length < 2 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'SAVING...' : `SAVE ROUTE (${stops.length} stops)`}
            </button>
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Map instruction overlay — top center */}
          {!pendingStop && (
            <div style={{
              position: 'absolute',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10,12,16,0.85)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '7px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-dim)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}>
              Search on the left — or click map to place a stop
            </div>
          )}

          {/* Pending stop confirmation card */}
          {pendingStop && (
            <div style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--surface)',
              border: '1px solid var(--accent)',
              borderRadius: 14,
              padding: '16px 18px',
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              width: 340,
              backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
                letterSpacing: 2,
                marginBottom: 10,
              }}>
                CONFIRM STOP {stops.length + 1}
              </div>

              <div style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                marginBottom: 10,
              }}>
                {pendingStop.lat.toFixed(5)}, {pendingStop.lng.toFixed(5)}
              </div>

              <input
                autoFocus
                value={stopLabel}
                onChange={(e) => setStopLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmPendingStop()}
                placeholder="Stop name (e.g. Main Gate)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 13,
                  marginBottom: 12,
                }}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={confirmPendingStop}
                  disabled={!stopLabel.trim()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: stopLabel.trim() ? 'var(--accent)' : 'var(--border)',
                    color: stopLabel.trim() ? '#0a0c10' : 'var(--text-dim)',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    border: 'none',
                    cursor: stopLabel.trim() ? 'pointer' : 'not-allowed',
                    letterSpacing: 1,
                  }}
                >
                  ADD STOP
                </button>
                <button
                  onClick={cancelPendingStop}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-dim)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}