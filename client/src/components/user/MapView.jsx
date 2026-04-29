import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { haversine } from '../../utils/geoMath';

// ── Compute bearing between two lat/lng points ──
function calcBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng  = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
          - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── Bus icon with correctly rotating arrow ──
function makeBusIcon(bearingDeg, vehicleNum, isSelected) {
  const size  = isSelected ? 56 : 44;
  const half  = size / 2;
  const color = isSelected ? '#00e5a0' : '#94a3b8';
  const ring  = isSelected ? '#00e5a0' : '#334155';
  const label = (vehicleNum || 'BUS').slice(0, 9);

  // Arrow points UP in SVG space (north = 0°)
  // rotate() around center will turn it to match real bearing
  const arrowH  = size * 0.30;   // arrow height
  const arrowW  = size * 0.18;   // half-width of base
  const tipY    = half - arrowH; // tip of arrow
  const baseY   = half + arrowH * 0.35; // base of arrow

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${size}" height="${size + 18}"
     viewBox="0 0 ${size} ${size + 18}">

  <!-- Outer ring -->
  <circle cx="${half}" cy="${half}" r="${half - 1}"
    fill="#0a0c10" stroke="${ring}" stroke-width="${isSelected ? 2.5 : 1.5}"/>

  <!-- Inner dim fill -->
  <circle cx="${half}" cy="${half}" r="${half - 8}"
    fill="${color}" opacity="0.1"/>

  <!-- Arrow rotated to bearing — origin is CENTER of circle -->
  <g transform="rotate(${bearingDeg}, ${half}, ${half})">
    <polygon
      points="
        ${half},${tipY}
        ${half - arrowW},${baseY}
        ${half},${baseY - size * 0.07}
        ${half + arrowW},${baseY}
      "
      fill="${color}"
      stroke="#0a0c10"
      stroke-width="0.5"
    />
  </g>

  <!-- Center dot -->
  <circle cx="${half}" cy="${half}" r="3.5" fill="${color}"/>

  <!-- Label bar below -->
  <rect x="1" y="${size + 1}" width="${size - 2}" height="15"
    rx="4" fill="#0a0c10" stroke="${color}" stroke-width="1"/>
  <text
    x="${half}" y="${size + 11.5}"
    font-family="monospace" font-size="7.5"
    font-weight="bold" text-anchor="middle"
    fill="${color}">${label}</text>
</svg>`.trim();

  return L.divIcon({
    html:       svg,
    iconSize:   [size, size + 18],
    iconAnchor: [half, half],  // anchor at circle center, not label
    className:  '',
  });
}

// ── Stop icon ──
function makeStopIcon(order, isFirst, isLast) {
  const color = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#475569';
  const label = isFirst ? 'S' : isLast ? 'E' : String(order);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <circle cx="14" cy="14" r="12" fill="#0a0c10" stroke="${color}" stroke-width="2"/>
  <text x="14" y="18"
    font-family="monospace"
    font-size="${label.length > 1 ? 7 : 10}"
    font-weight="bold"
    text-anchor="middle"
    fill="${color}">${label}</text>
</svg>`.trim();
  return L.divIcon({ html: svg, iconSize: [28, 28], iconAnchor: [14, 14], className: '' });
}

// ── Direction arrows along a polyline ──
// Places small triangle decorators at intervals along the route
function addDirectionArrows(map, latlngs, color) {
  const arrows = [];
  const step   = Math.max(1, Math.floor(latlngs.length / 8)); // ~8 arrows along route

  for (let i = step; i < latlngs.length - 1; i += step) {
    const [lat1, lng1] = latlngs[i];
    const [lat2, lng2] = latlngs[i + 1];
    const bear = calcBearing(lat1, lng1, lat2, lng2);

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <g transform="rotate(${bear}, 8, 8)">
    <polygon points="8,2 12,12 8,9 4,12" fill="${color}" opacity="0.7"/>
  </g>
</svg>`.trim();

    const icon = L.divIcon({
      html: svg, iconSize: [16, 16], iconAnchor: [8, 8], className: '',
    });
    arrows.push(L.marker([lat1, lng1], { icon, interactive: false }).addTo(map));
  }
  return arrows;
}

export default function MapView({ displayPos, stops, activeBuses = [], selectedDriverId }) {
  const containerRef      = useRef(null);
  const mapRef            = useRef(null);
  const busMarkersRef     = useRef({});   // driverId → { marker, prevLat, prevLng, bearing }
  const stopLayerRef      = useRef(null);
  const routeLineRef      = useRef(null);
  const arrowMarkersRef   = useRef([]);   // direction arrows
  const lastPanPosRef     = useRef(null);
  const isFollowingRef    = useRef(false);
  const prevBusCountRef   = useRef(0);

  // ── Init map ──
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:      [20, 78],
      zoom:        15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);

    stopLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // User interaction stops auto-follow
    map.on('dragstart', () => { isFollowingRef.current = false; });

    return () => {
      map.remove();
      mapRef.current        = null;
      busMarkersRef.current = {};
      isFollowingRef.current    = false;
      lastPanPosRef.current     = null;
    };
  }, []);

  // ── Draw stops + route line with direction arrows ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops?.length) return;

    // Clear old
    stopLayerRef.current?.clearLayers();
    arrowMarkersRef.current.forEach((m) => m.remove());
    arrowMarkersRef.current = [];
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    const sorted  = [...stops].sort((a, b) => a.order - b.order);
    const latlngs = sorted.map((s) => [s.lat, s.lng]);

    // Route polyline
    routeLineRef.current = L.polyline(latlngs, {
      color:   '#2563eb',
      weight:  4,
      opacity: 0.75,
    }).addTo(map);

    // Direction arrows along the route
    if (latlngs.length >= 2) {
      arrowMarkersRef.current = addDirectionArrows(map, latlngs, '#60a5fa');
    }

    // Stop markers
    sorted.forEach((stop, i) => {
      const icon = makeStopIcon(stop.order, i === 0, i === sorted.length - 1);
      L.marker([stop.lat, stop.lng], { icon })
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;
            background:#0f1219;color:#e2e8f0;
            padding:8px 12px;border-radius:8px;min-width:100px">
            <div style="color:#00e5a0;font-weight:bold;margin-bottom:3px">
              ${stop.name}
            </div>
            <div style="color:#64748b">Stop ${stop.order}</div>
          </div>
        `, { className: 'dark-popup' })
        .addTo(stopLayerRef.current);
    });

    // Fit map to route — only if not following a bus
    if (!isFollowingRef.current && latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 17 });
    }

    lastPanPosRef.current = null;
  }, [stops]);

  // ── Update bus markers when list changes ──
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

    // Add/update each bus
    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;

      const lat        = Number(bus.lat);
      const lng        = Number(bus.lng);
      const isSelected = bus.driverId === selectedDriverId;
      const existing   = busMarkersRef.current[bus.driverId];

      // ── BEARING FIX ──
      // Compute bearing BEFORE updating prevLat/prevLng
      let deg = existing?.bearing ?? 0;
      if (existing?.prevLat !== undefined && existing?.prevLng !== undefined) {
        const moved = haversine(existing.prevLat, existing.prevLng, lat, lng);
        if (moved > 2) { // only update bearing if moved > 2m
          const b = calcBearing(existing.prevLat, existing.prevLng, lat, lng);
          if (!isNaN(b)) deg = b;
        }
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
            </div>
          `, { className: 'dark-popup' });

        busMarkersRef.current[bus.driverId] = {
          marker,
          bearing: deg,
          prevLat: lat,   // store AFTER creating
          prevLng: lng,
        };
      } else {
        // Update bearing BEFORE moving marker (prevLat still holds old position)
        existing.bearing = deg;
        existing.marker.setLatLng([lat, lng]);
        existing.marker.setIcon(makeBusIcon(deg, bus.vehicleNumber, isSelected));
        // NOW update previous position
        existing.prevLat = lat;
        existing.prevLng = lng;
      }
    });
  }, [activeBuses, selectedDriverId]);

  // ── Smooth interpolated movement for selected bus ──
  // Only updates marker position + bearing. Never touches map viewport.
  useEffect(() => {
    if (!displayPos || !selectedDriverId) return;
    const map = mapRef.current;
    if (!map) return;

    const lat = Number(displayPos.lat);
    const lng = Number(displayPos.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const existing = busMarkersRef.current[selectedDriverId];
    if (!existing) return;

    // Compute bearing from PREVIOUS interpolated position
    const moved = existing.prevLat !== undefined
      ? haversine(existing.prevLat, existing.prevLng, lat, lng)
      : 999;

    let deg = existing.bearing ?? 0;
    if (moved > 0.5 && existing.prevLat !== undefined) {
      const b = calcBearing(existing.prevLat, existing.prevLng, lat, lng);
      if (!isNaN(b)) deg = b;
    }

    // Move marker
    existing.marker.setLatLng([lat, lng]);

    // Update icon with new bearing
    const bus = activeBuses.find((x) => x.driverId === selectedDriverId);
    existing.marker.setIcon(makeBusIcon(deg, bus?.vehicleNumber || '', true));
    existing.bearing = deg;

    // Update prev position for next frame's bearing calc
    existing.prevLat = lat;
    existing.prevLng = lng;

    // ── Pan map — only when bus moves > 20m from last pan ──
    if (isFollowingRef.current) {
      const last   = lastPanPosRef.current;
      const distMoved = last ? haversine(last.lat, last.lng, lat, lng) : 999;
      if (distMoved > 20) {
        lastPanPosRef.current = { lat, lng };
        map.panTo([lat, lng], { animate: true, duration: 1.2, easeLinearity: 0.4 });
      }
    }
  }, [displayPos]); // only displayPos — no other deps to avoid rerenders

  // ── Snap to bus when driver selected or first appears ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDriverId) return;

    const bus = activeBuses.find((b) => b.driverId === selectedDriverId);
    if (bus?.lat && bus?.lng) {
      const lat = Number(bus.lat);
      const lng = Number(bus.lng);
      isFollowingRef.current = true;
      lastPanPosRef.current  = { lat, lng };
      // Zoom in closer when following a bus
      map.setView([lat, lng], 17, { animate: true, duration: 0.8 });
    }
  }, [selectedDriverId]);

  // ── Handle bus appearing / disappearing ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const busesWithPos = activeBuses.filter((b) => b.lat && b.lng);
    const prev = prevBusCountRef.current;
    prevBusCountRef.current = busesWithPos.length;

    // Bus just appeared — zoom to it
    if (busesWithPos.length > 0 && prev === 0) {
      const target = selectedDriverId
        ? busesWithPos.find((b) => b.driverId === selectedDriverId)
        : busesWithPos[0];

      if (target) {
        const lat = Number(target.lat);
        const lng = Number(target.lng);
        isFollowingRef.current = true;
        lastPanPosRef.current  = { lat, lng };
        map.setView([lat, lng], 17, { animate: true, duration: 1.0 });
      }
    }

    // All buses gone — zoom back to route
    if (busesWithPos.length === 0 && prev > 0) {
      isFollowingRef.current = false;
      lastPanPosRef.current  = null;
      if (stops?.length >= 2) {
        const latlngs = [...stops]
          .sort((a, b) => a.order - b.order)
          .map((s) => [s.lat, s.lng]);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [activeBuses]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
  );
}