import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { bearing } from '../../utils/geoMath';

// ── Bus icon — dark, clearly visible arrow ──
function makeBusIcon(deg, vehicleNum, isSelected) {
  const size  = isSelected ? 54 : 44;
  const half  = size / 2;
  const color = isSelected ? '#00e5a0' : '#94a3b8';
  const bg    = '#0a0c10';
  const ring  = isSelected ? '#00e5a0' : '#334155';
  const glow  = isSelected ? `filter: drop-shadow(0 0 8px #00e5a080);` : '';
  const label = (vehicleNum || 'BUS').slice(0, 9);

  // Arrow triangle pointing UP before rotation transform
  const arrowSize  = size * 0.28;
  const arrowTip   = half - arrowSize * 1.1;
  const arrowBaseY = half + arrowSize * 0.5;
  const arrowBaseW = arrowSize * 0.7;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    width="${size}" height="${size + 18}"
    viewBox="0 0 ${size} ${size + 18}"
    style="${glow}">

    <circle cx="${half}" cy="${half}" r="${half - 1}"
      fill="${bg}" stroke="${ring}" stroke-width="${isSelected ? 2.5 : 1.5}"/>

    <g transform="rotate(${deg}, ${half}, ${half})">
      <polygon
        points="${half},${arrowTip}
                ${half - arrowBaseW},${arrowBaseY}
                ${half},${arrowBaseY - arrowSize * 0.3}
                ${half + arrowBaseW},${arrowBaseY}"
        fill="${color}"/>
    </g>

    <circle cx="${half}" cy="${half}" r="3" fill="${color}"/>

    <rect x="1" y="${size + 1}" width="${size - 2}" height="15"
      rx="4" fill="${bg}" stroke="${color}" stroke-width="1"/>
    <text x="${half}" y="${size + 11.5}"
      font-family="monospace" font-size="7.5"
      font-weight="bold" text-anchor="middle" fill="${color}">
      ${label}
    </text>
  </svg>`;

  return L.divIcon({
    html:       svg,
    iconSize:   [size, size + 18],
    iconAnchor: [half, half],
    className:  '',
  });
}

// ── Stop icon ──
function makeStopIcon(order, isFirst, isLast) {
  const color = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#475569';
  const label = isFirst ? 'A' : isLast ? 'B' : String(order);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11"
      fill="#0a0c10" stroke="${color}" stroke-width="2"/>
    <text x="13" y="17"
      font-family="monospace"
      font-size="${label.length > 1 ? 7 : 9}"
      font-weight="bold"
      text-anchor="middle"
      fill="${color}">${label}</text>
  </svg>`;
  return L.divIcon({
    html: svg, iconSize: [26, 26], iconAnchor: [13, 13], className: '',
  });
}

export default function MapView({ displayPos, stops, activeBuses = [], selectedDriverId }) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);       // L.Map instance
  const busMarkersRef   = useRef({});         // driverId → { marker, bearing }
  const stopLayerRef    = useRef(null);       // L.LayerGroup for stops
  const routeLineRef    = useRef(null);       // L.Polyline
  const hasFittedRef    = useRef(false);      // did we fit to route yet
  const hasPannedRef    = useRef(false);      // did we pan to first bus pos

  // ── Init map once ──
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoom:        15,
      center:      [20, 78],              // India centre — will be overridden by fitBounds
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom:     19,
    }).addTo(map);

    stopLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current    = null;
      busMarkersRef.current = {};
      hasFittedRef.current  = false;
      hasPannedRef.current  = false;
    };
  }, []);

  // ── Draw stops + fit map to route ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops?.length) return;

    // Clear previous stops
    stopLayerRef.current?.clearLayers();
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const sorted  = [...stops].sort((a, b) => a.order - b.order);
    const latlngs = sorted.map((s) => [s.lat, s.lng]);

    // Route line
    routeLineRef.current = L.polyline(latlngs, {
      color:     '#1e3a5f',
      weight:    5,
      opacity:   1,
      dashArray: '10 7',
    }).addTo(map);

    // Stop markers
    sorted.forEach((stop, i) => {
      const icon = makeStopIcon(stop.order, i === 0, i === sorted.length - 1);
      L.marker([stop.lat, stop.lng], { icon })
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;
            background:#0f1219;color:#e2e8f0;
            padding:8px 12px;border-radius:8px;min-width:90px">
            <div style="color:#00e5a0;font-weight:bold;margin-bottom:2px">
              Stop ${stop.order}
            </div>
            <div>${stop.name}</div>
          </div>
        `, { className: 'dark-popup' })
        .addTo(stopLayerRef.current);
    });

    // Fit map to route bounds — always when stops change
    if (latlngs.length >= 2) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      hasFittedRef.current = true;
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
      hasFittedRef.current = true;
    }

    // Reset pan flag so map will follow the bus when it appears
    hasPannedRef.current = false;
  }, [stops]);

  // ── Update bus markers when activeBuses changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(activeBuses.map((b) => b.driverId));

    // Remove gone buses
    Object.entries(busMarkersRef.current).forEach(([id, data]) => {
      if (!currentIds.has(id)) {
        data.marker.remove();
        delete busMarkersRef.current[id];
      }
    });

    // Add/update
    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;

      const lat        = Number(bus.lat);
      const lng        = Number(bus.lng);
      const isSelected = bus.driverId === selectedDriverId;
      const existing   = busMarkersRef.current[bus.driverId];

      let deg = 0;
      if (existing) {
        const b = bearing(
          existing.lastLat, existing.lastLng, lat, lng,
        );
        deg = (b !== 0 && !isNaN(b)) ? b : existing.bearing;
      }

      const icon = makeBusIcon(deg, bus.vehicleNumber, isSelected);

      if (!existing) {
        const marker = L.marker([lat, lng], {
          icon,
          zIndexOffset: isSelected ? 2000 : 500,
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:monospace;font-size:12px;
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
          marker, bearing: deg, lastLat: lat, lastLng: lng,
        };
      } else {
        existing.marker.setLatLng([lat, lng]);
        existing.marker.setIcon(icon);
        existing.bearing = deg;
        existing.lastLat = lat;
        existing.lastLng = lng;
      }
    });
  }, [activeBuses, selectedDriverId]);

  // ── Smooth marker movement via displayPos (rAF-driven) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !displayPos || !selectedDriverId) return;

    const lat      = Number(displayPos.lat);
    const lng      = Number(displayPos.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const existing = busMarkersRef.current[selectedDriverId];
    if (!existing) return;

    // Compute bearing
    let deg = existing.bearing || 0;
    if (existing.lastLat && existing.lastLng) {
      const b = bearing(existing.lastLat, existing.lastLng, lat, lng);
      if (!isNaN(b) && b !== 0) deg = b;
    }

    const bus  = activeBuses.find((b) => b.driverId === selectedDriverId);
    const icon = makeBusIcon(deg, bus?.vehicleNumber || '', true);

    existing.marker.setLatLng([lat, lng]);
    existing.marker.setIcon(icon);
    existing.bearing = deg;

    // Pan to bus — first time or when it moves significantly
    if (!hasPannedRef.current) {
      map.setView([lat, lng], 16, { animate: true });
      hasPannedRef.current = true;
    }
  }, [displayPos]);                            // intentionally only displayPos

  // ── When user selects a different bus, pan to it ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDriverId) return;

    const bus = activeBuses.find((b) => b.driverId === selectedDriverId);
    if (bus?.lat && bus?.lng) {
      map.setView([Number(bus.lat), Number(bus.lng)], 16, { animate: true });
    }
  }, [selectedDriverId]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', borderRadius: 12 }}
    />
  );
}