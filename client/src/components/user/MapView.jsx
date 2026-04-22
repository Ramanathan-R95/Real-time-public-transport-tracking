import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { bearing, haversine } from '../../utils/geoMath';

function makeBusIcon(deg, vehicleNum, isSelected) {
  const size  = isSelected ? 52 : 42;
  const half  = size / 2;
  const color = isSelected ? '#00e5a0' : '#94a3b8';
  const ring  = isSelected ? '#00e5a0' : '#334155';
  const label = (vehicleNum || 'BUS').slice(0, 9);

  const tip   = half - size * 0.28;
  const baseY = half + size * 0.14;
  const baseW = size * 0.19;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
    width="${size}" height="${size + 18}"
    viewBox="0 0 ${size} ${size + 18}">
    <circle cx="${half}" cy="${half}" r="${half - 1}"
      fill="#0a0c10" stroke="${ring}" stroke-width="${isSelected ? 2.5 : 1.5}"/>
    <circle cx="${half}" cy="${half}" r="${half - 7}"
      fill="${color}" opacity="0.12"/>
    <g transform="rotate(${deg}, ${half}, ${half})">
      <polygon
        points="${half},${tip} ${half - baseW},${baseY} ${half},${baseY - size * 0.08} ${half + baseW},${baseY}"
        fill="${color}"/>
    </g>
    <circle cx="${half}" cy="${half}" r="3" fill="${color}"/>
    <rect x="1" y="${size + 1}" width="${size - 2}" height="15"
      rx="4" fill="#0a0c10" stroke="${color}" stroke-width="1"/>
    <text x="${half}" y="${size + 11.5}"
      font-family="monospace" font-size="7.5"
      font-weight="bold" text-anchor="middle" fill="${color}">${label}</text>
  </svg>`;

  return L.divIcon({
    html: svg, iconSize: [size, size + 18],
    iconAnchor: [half, half], className: '',
  });
}

function makeStopIcon(order, isFirst, isLast) {
  const color = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#475569';
  const label = isFirst ? 'A' : isLast ? 'B' : String(order);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11" fill="#0a0c10" stroke="${color}" stroke-width="2"/>
    <text x="13" y="17" font-family="monospace"
      font-size="${label.length > 1 ? 7 : 9}"
      font-weight="bold" text-anchor="middle" fill="${color}">${label}</text>
  </svg>`;
  return L.divIcon({ html: svg, iconSize: [26, 26], iconAnchor: [13, 13], className: '' });
}

export default function MapView({ displayPos, stops, activeBuses = [], selectedDriverId }) {
  const containerRef      = useRef(null);
  const mapRef            = useRef(null);
  const busMarkersRef     = useRef({});  // driverId → { marker, lastLat, lastLng, bearing }
  const stopLayerRef      = useRef(null);
  const routeLineRef      = useRef(null);
  const lastPanPosRef     = useRef(null);   // last position we panned to
  const hasFittedRouteRef = useRef(false);  // did we fit to route bounds yet
  const isFolowingRef     = useRef(false);  // are we following a bus

  // ── Init map once ──
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoom:        15,
      center:      [20, 78],
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);

    stopLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // When user manually pans/zooms, stop auto-following
    map.on('dragstart zoomstart', () => {
      isFolowingRef.current = false;
    });

    return () => {
      map.remove();
      mapRef.current        = null;
      busMarkersRef.current = {};
      hasFittedRouteRef.current = false;
      isFolowingRef.current     = false;
    };
  }, []);

  // ── Draw stops + fit map to route ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops?.length) return;

    stopLayerRef.current?.clearLayers();
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const sorted  = [...stops].sort((a, b) => a.order - b.order);
    const latlngs = sorted.map((s) => [s.lat, s.lng]);

    routeLineRef.current = L.polyline(latlngs, {
      color: '#1e3a5f', weight: 5, opacity: 1, dashArray: '10 7',
    }).addTo(map);

    sorted.forEach((stop, i) => {
      const icon = makeStopIcon(stop.order, i === 0, i === sorted.length - 1);
      L.marker([stop.lat, stop.lng], { icon })
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;
            background:#0f1219;color:#e2e8f0;
            padding:8px 12px;border-radius:8px;min-width:90px">
            <div style="color:#00e5a0;font-weight:bold;margin-bottom:2px">Stop ${stop.order}</div>
            <div>${stop.name}</div>
          </div>`, { className: 'dark-popup' })
        .addTo(stopLayerRef.current);
    });

    // Only fit to route if we're not already following a bus
    if (!isFolowingRef.current && latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
      hasFittedRouteRef.current = true;
    }

    // Reset follow state when route changes
    lastPanPosRef.current = null;
  }, [stops]);

  // ── Update bus markers when activeBuses list changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(activeBuses.map((b) => b.driverId));

    // Remove stale markers
    Object.entries(busMarkersRef.current).forEach(([id, data]) => {
      if (!currentIds.has(id)) {
        data.marker.remove();
        delete busMarkersRef.current[id];
      }
    });

    // Add or update
    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;

      const lat        = Number(bus.lat);
      const lng        = Number(bus.lng);
      const isSelected = bus.driverId === selectedDriverId;
      const existing   = busMarkersRef.current[bus.driverId];

      let deg = existing?.bearing || 0;
      if (existing?.lastLat && existing?.lastLng) {
        const b = bearing(existing.lastLat, existing.lastLng, lat, lng);
        if (!isNaN(b) && b !== 0) deg = b;
      }

      const icon = makeBusIcon(deg, bus.vehicleNumber, isSelected);

      if (!existing) {
        const marker = L.marker([lat, lng], {
          icon, zIndexOffset: isSelected ? 2000 : 500,
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:monospace;font-size:12px;
              background:#0f1219;color:#e2e8f0;
              padding:8px 12px;border-radius:8px">
              <div style="color:#00e5a0;font-weight:bold">${bus.vehicleNumber}</div>
              <div style="color:#64748b;margin-top:2px">${bus.driverName}</div>
            </div>`, { className: 'dark-popup' });

        busMarkersRef.current[bus.driverId] = {
          marker, bearing: deg, lastLat: lat, lastLng: lng,
        };
      } else {
        existing.marker.setLatLng([lat, lng]);
        existing.marker.setIcon(makeBusIcon(deg, bus.vehicleNumber, isSelected));
        existing.lastLat = lat;
        existing.lastLng = lng;
        existing.bearing = deg;
      }
    });
  }, [activeBuses, selectedDriverId]);

  // ── Smooth marker movement from interpolator ──
  // This runs on rAF (60fps) — ONLY moves the marker, never touches the map view
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !displayPos || !selectedDriverId) return;

    const lat = Number(displayPos.lat);
    const lng = Number(displayPos.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const existing = busMarkersRef.current[selectedDriverId];
    if (!existing) return;

    // Update marker position smoothly
    existing.marker.setLatLng([lat, lng]);

    // Update bearing
    if (existing.lastLat && existing.lastLng) {
      const b = bearing(existing.lastLat, existing.lastLng, lat, lng);
      if (!isNaN(b) && b !== 0) {
        existing.bearing = b;
        const bus  = activeBuses.find((x) => x.driverId === selectedDriverId);
        existing.marker.setIcon(makeBusIcon(b, bus?.vehicleNumber || '', true));
      }
    }

    // ── Pan logic: only pan when bus moves more than 15 metres ──
    // This prevents the 60fps glitch completely
    const last = lastPanPosRef.current;
    const movedEnough = !last ||
      haversine(last.lat, last.lng, lat, lng) > 15;

    if (movedEnough && isFolowingRef.current) {
      lastPanPosRef.current = { lat, lng };
      map.panTo([lat, lng], {
        animate:  true,
        duration: 1.0,         // smooth 1s pan
        easeLinearity: 0.5,
      });
    }
  }, [displayPos]);             // ← ONLY displayPos, no other deps

  // ── When user selects a bus: snap to it and start following ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDriverId) {
      // No bus selected — fit route if available
      if (!selectedDriverId && hasFittedRouteRef.current === false && stops?.length) {
        const sorted  = [...(stops || [])].sort((a, b) => a.order - b.order);
        const latlngs = sorted.map((s) => [s.lat, s.lng]);
        if (latlngs.length >= 2) {
          map?.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
        }
      }
      return;
    }

    const bus = activeBuses.find((b) => b.driverId === selectedDriverId);
    if (bus?.lat && bus?.lng) {
      const lat = Number(bus.lat);
      const lng = Number(bus.lng);
      isFolowingRef.current = true;
      lastPanPosRef.current = { lat, lng };
      map.setView([lat, lng], 16, { animate: true, duration: 0.8 });
    }
  }, [selectedDriverId]);

  // ── When bus first gets a real position, snap to it ──
  const prevBusCountRef = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const busesWithPos = activeBuses.filter((b) => b.lat && b.lng && b.routeId);
    const prev = prevBusCountRef.current;
    prevBusCountRef.current = busesWithPos.length;

    // A bus just appeared — snap to it
    if (busesWithPos.length > 0 && prev === 0) {
      const target = selectedDriverId
        ? busesWithPos.find((b) => b.driverId === selectedDriverId)
        : busesWithPos[0];

      if (target) {
        const lat = Number(target.lat);
        const lng = Number(target.lng);
        isFolowingRef.current = true;
        lastPanPosRef.current = { lat, lng };
        map.setView([lat, lng], 16, { animate: true, duration: 1.0 });
      }
    }

    // All buses gone — fit back to route
    if (busesWithPos.length === 0 && prev > 0) {
      isFolowingRef.current = false;
      lastPanPosRef.current = null;
      if (stops?.length >= 2) {
        const sorted  = [...stops].sort((a, b) => a.order - b.order);
        const latlngs = sorted.map((s) => [s.lat, s.lng]);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
      }
    }
  }, [activeBuses]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
  );
}