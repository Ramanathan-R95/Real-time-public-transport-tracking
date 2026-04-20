import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { bearing } from '../../utils/geoMath';

// Dark arrow marker that's clearly visible
function createBusIcon(bearingDeg = 0, vehicleNumber = '', isSelected = false) {
  const size   = isSelected ? 52 : 42;
  const color  = isSelected ? '#00e5a0' : '#64748b';
  const ring   = isSelected ? '#ffffff' : '#374151';
  const shadow = isSelected ? `0 0 20px rgba(0,229,160,0.6)` : 'none';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${size}" height="${size + 16}"
      viewBox="0 0 ${size} ${size + 16}">

      <!-- Outer ring -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}"
        fill="#0a0c10" stroke="${ring}" stroke-width="2"/>

      <!-- Inner fill -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 7}"
        fill="${color}" opacity="0.15"/>

      <!-- Direction arrow — rotates with bearing -->
      <g transform="rotate(${bearingDeg}, ${size / 2}, ${size / 2})">
        <!-- Arrow pointing up (north) before rotation -->
        <polygon
          points="${size / 2},${size / 2 - 14}
                  ${size / 2 - 7},${size / 2 + 6}
                  ${size / 2},${size / 2 + 2}
                  ${size / 2 + 7},${size / 2 + 6}"
          fill="${color}"
          stroke="#0a0c10"
          stroke-width="1"
        />
      </g>

      <!-- Center dot -->
      <circle cx="${size / 2}" cy="${size / 2}" r="3"
        fill="${color}"/>

      <!-- Vehicle label below -->
      <rect x="2" y="${size + 1}" width="${size - 4}" height="13"
        rx="4" fill="#0a0c10" stroke="${color}" stroke-width="1"/>
      <text x="${size / 2}" y="${size + 11}"
        font-family="monospace" font-size="7"
        font-weight="bold" text-anchor="middle"
        fill="${color}">
        ${(vehicleNumber || 'BUS').slice(0, 10)}
      </text>
    </svg>
  `;

  return L.divIcon({
    html:       svg,
    iconSize:   [size, size + 16],
    iconAnchor: [size / 2, size / 2],
    className:  '',
  });
}

function createStopIcon(order, isFirst, isLast) {
  const color = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#374151';
  const text  = isFirst ? 'S' : isLast ? 'E' : String(order);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="11"
        fill="#0a0c10" stroke="${color}" stroke-width="2"/>
      <text x="14" y="18"
        font-family="monospace" font-size="${text.length > 1 ? 7 : 9}"
        font-weight="bold" text-anchor="middle"
        fill="${color}">${text}</text>
    </svg>
  `;
  return L.divIcon({
    html:       svg,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    className:  '',
  });
}

export default function MapView({
  displayPos,
  stops,
  activeBuses = [],
  selectedDriverId,
}) {
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const busMarkersRef   = useRef({});   // driverId → { marker, lastLat, lastLng }
  const stopMarkersRef  = useRef([]);
  const routeLineRef    = useRef(null);
  const initialFitRef   = useRef(false);
  const displayPosRef   = useRef(null); // track latest displayPos for selected bus

  // ── Init map once ──
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center:      [10.9152, 78.8537],
      zoom:        15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom:     19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Draw stops + route line ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !stops?.length) return;

    // Clear old
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const sorted = [...stops].sort((a, b) => a.order - b.order);
    const latlngs = sorted.map((s) => [s.lat, s.lng]);

    // Route line
    routeLineRef.current = L.polyline(latlngs, {
      color:     '#1e2535',
      weight:    4,
      opacity:   0.9,
      dashArray: '10 6',
    }).addTo(map);

    // Stop markers
    sorted.forEach((stop, i) => {
      const icon   = createStopIcon(stop.order, i === 0, i === sorted.length - 1);
      const marker = L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="
            font-family:monospace;font-size:12px;
            background:#0f1219;color:#e2e8f0;
            padding:8px 12px;border-radius:8px;min-width:100px">
            <div style="color:#00e5a0;font-weight:bold;margin-bottom:2px">
              Stop ${stop.order}
            </div>
            <div>${stop.name}</div>
          </div>
        `, { className: 'dark-popup' });
      stopMarkersRef.current.push(marker);
    });

    // Fit map to route on first load
    if (!initialFitRef.current && latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
      initialFitRef.current = true;
    }
  }, [stops]);

  // ── Update ALL bus markers when activeBuses changes ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentIds = new Set(activeBuses.map((b) => b.driverId));

    // Remove markers for buses that left
    Object.keys(busMarkersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        busMarkersRef.current[id].marker.remove();
        delete busMarkersRef.current[id];
      }
    });

    // Add or update each active bus
    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;

      const isSelected = bus.driverId === selectedDriverId;
      const existing   = busMarkersRef.current[bus.driverId];

      let deg = 0;
      if (existing) {
        deg = bearing(
          existing.lastLat, existing.lastLng,
          bus.lat,          bus.lng
        ) || existing.lastBearing || 0;
      }

      const icon = createBusIcon(deg, bus.vehicleNumber, isSelected);

      if (!existing) {
        const marker = L.marker([bus.lat, bus.lng], {
          icon,
          zIndexOffset: isSelected ? 2000 : 1000,
        })
          .addTo(map)
          .bindPopup(`
            <div style="
              font-family:monospace;font-size:12px;
              background:#0f1219;color:#e2e8f0;
              padding:8px 12px;border-radius:8px">
              <div style="color:#00e5a0;font-weight:bold">
                ${bus.vehicleNumber}
              </div>
              <div style="color:#64748b;margin-top:2px">
                ${bus.driverName}
              </div>
            </div>
          `, { className: 'dark-popup' });

        busMarkersRef.current[bus.driverId] = {
          marker,
          lastLat:     bus.lat,
          lastLng:     bus.lng,
          lastBearing: deg,
        };
      } else {
        existing.marker.setLatLng([bus.lat, bus.lng]);
        existing.marker.setIcon(icon);
        existing.lastLat     = bus.lat;
        existing.lastLng     = bus.lng;
        existing.lastBearing = deg;
      }
    });
  }, [activeBuses, selectedDriverId]);

  // ── Smooth interpolated movement for SELECTED bus ──
  // This runs on every rAF tick via useInterpolator
  useEffect(() => {
    if (!displayPos || !selectedDriverId) return;

    const map      = mapInstanceRef.current;
    const existing = busMarkersRef.current[selectedDriverId];
    if (!map || !existing) return;

    const { lat, lng } = displayPos;

    // Compute bearing from last known position
    let deg = existing.lastBearing || 0;
    if (existing.lastLat && existing.lastLng) {
      const b = bearing(existing.lastLat, existing.lastLng, lat, lng);
      if (b !== 0) deg = b;
    }

    const selectedBus = activeBuses.find((b) => b.driverId === selectedDriverId);
    const icon = createBusIcon(deg, selectedBus?.vehicleNumber || '', true);

    existing.marker.setLatLng([lat, lng]);
    existing.marker.setIcon(icon);
    existing.lastBearing = deg;

    displayPosRef.current = { lat, lng };
  }, [displayPos, selectedDriverId, activeBuses]);

  // ── Pan to selected bus when it first appears ──
  useEffect(() => {
    if (!displayPos || !selectedDriverId) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    map.panTo([displayPos.lat, displayPos.lng], {
      animate:  true,
      duration: 0.8,
    });
  }, [
    // Only pan when selectedDriverId changes or bus first appears
    selectedDriverId,
    // Pan when we first get a position (displayPos goes from null to value)
    displayPos === null ? null : 'has-pos',
  ]);

  return (
    <div
      ref={mapRef}
      style={{
        width:     '100%',
        height:    '100%',
        minHeight: '300px',
        borderRadius: 14,
      }}
    />
  );
}