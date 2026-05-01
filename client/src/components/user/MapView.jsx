import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { haversine } from '../../utils/geoMath';

function calcBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng  = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
          - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function makeBusIcon(bearingDeg, vehicleNum, isSelected) {
  const size  = isSelected ? 56 : 44;
  const half  = size / 2;
  const color = isSelected ? '#00e5a0' : '#94a3b8';
  const ring  = isSelected ? '#00e5a0' : '#334155';
  const label = (vehicleNum || 'BUS').slice(0, 9);
  const arrowH = size * 0.30;
  const arrowW = size * 0.18;
  const tipY   = half - arrowH;
  const baseY  = half + arrowH * 0.35;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${size}" height="${size + 18}"
     viewBox="0 0 ${size} ${size + 18}">
  <circle cx="${half}" cy="${half}" r="${half - 1}"
    fill="#0a0c10" stroke="${ring}" stroke-width="${isSelected ? 2.5 : 1.5}"/>
  <circle cx="${half}" cy="${half}" r="${half - 8}"
    fill="${color}" opacity="0.1"/>
  <g transform="rotate(${bearingDeg}, ${half}, ${half})">
    <polygon
      points="${half},${tipY} ${half - arrowW},${baseY} ${half},${baseY - size * 0.07} ${half + arrowW},${baseY}"
      fill="${color}" stroke="#0a0c10" stroke-width="0.5"/>
  </g>
  <circle cx="${half}" cy="${half}" r="3.5" fill="${color}"/>
  <rect x="1" y="${size + 1}" width="${size - 2}" height="15"
    rx="4" fill="#0a0c10" stroke="${color}" stroke-width="1"/>
  <text x="${half}" y="${size + 11.5}"
    font-family="monospace" font-size="7.5"
    font-weight="bold" text-anchor="middle"
    fill="${color}">${label}</text>
</svg>`.trim();

  return L.divIcon({
    html: svg, iconSize: [size, size + 18],
    iconAnchor: [half, half], className: '',
  });
}

function makeStopIcon(order, isFirst, isLast) {
  const color = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#475569';
  const label = isFirst ? 'S' : isLast ? 'E' : String(order);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <circle cx="14" cy="14" r="12" fill="#0a0c10" stroke="${color}" stroke-width="2"/>
  <text x="14" y="18" font-family="monospace"
    font-size="${label.length > 1 ? 7 : 10}"
    font-weight="bold" text-anchor="middle" fill="${color}">${label}</text>
</svg>`.trim();
  return L.divIcon({ html: svg, iconSize: [28, 28], iconAnchor: [14, 14], className: '' });
}

function addDirectionArrows(map, latlngs, color) {
  const arrows = [];
  const total  = latlngs.length;
  if (total < 2) return arrows;
  const step = Math.max(1, Math.floor(total / 8));
  for (let i = step; i < total - 1; i += step) {
    const [lat1, lng1] = latlngs[i];
    const [lat2, lng2] = latlngs[Math.min(i + 1, total - 1)];
    const bear = calcBearing(lat1, lng1, lat2, lng2);
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <g transform="rotate(${bear}, 8, 8)">
    <polygon points="8,2 12,12 8,9 4,12" fill="${color}" opacity="0.8"/>
  </g>
</svg>`.trim();
    const icon = L.divIcon({ html: svg, iconSize: [16, 16], iconAnchor: [8, 8], className: '' });
    arrows.push(L.marker([lat1, lng1], { icon, interactive: false }).addTo(map));
  }
  return arrows;
}

export default function MapView({ displayPos, stops, activeBuses = [], selectedDriverId }) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const busMarkersRef   = useRef({});
  const stopLayerRef    = useRef(null);
  const routeLineRef    = useRef(null);
  const arrowMarkersRef = useRef([]);
  const lastPanPosRef   = useRef(null);
  const isFollowingRef  = useRef(false);
  const prevBusCountRef = useRef(0);
  const initTimerRef    = useRef(null);

  // Keep latest props accessible in effects without re-running them
  const activeBusesRef      = useRef(activeBuses);
  const selectedDriverIdRef = useRef(selectedDriverId);
  const stopsRef            = useRef(stops);
  useEffect(() => { activeBusesRef.current      = activeBuses;      }, [activeBuses]);
  useEffect(() => { selectedDriverIdRef.current = selectedDriverId; }, [selectedDriverId]);
  useEffect(() => { stopsRef.current            = stops;            }, [stops]);

  // ── Helper: zoom to bus ──
  function zoomToBus(map, bus) {
    const lat = Number(bus.lat);
    const lng = Number(bus.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    isFollowingRef.current = true;
    lastPanPosRef.current  = { lat, lng };
    map.setView([lat, lng], 17, { animate: true, duration: 0.8 });
  }

  // ── Helper: zoom to route ──
  function zoomToRoute(map, stopsArr) {
    if (!stopsArr?.length) return;
    const latlngs = [...stopsArr]
      .sort((a, b) => a.order - b.order)
      .map((s) => [s.lat, s.lng]);
    if (latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 16 });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 15);
    }
  }

  // ── Init map ──
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 78], zoom: 5, zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);

    stopLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('dragstart', () => { isFollowingRef.current = false; });

    // ── On refresh: wait 800ms then snap to whatever exists ──
    initTimerRef.current = setTimeout(() => {
      const buses = activeBusesRef.current.filter((b) => b.lat && b.lng);
      if (buses.length > 0) {
        const target = selectedDriverIdRef.current
          ? buses.find((b) => b.driverId === selectedDriverIdRef.current) || buses[0]
          : buses[0];
        zoomToBus(map, target);
      } else if (stopsRef.current?.length) {
        zoomToRoute(map, stopsRef.current);
      }
    }, 800);

    return () => {
      clearTimeout(initTimerRef.current);
      map.remove();
      mapRef.current        = null;
      busMarkersRef.current = {};
      isFollowingRef.current    = false;
      lastPanPosRef.current     = null;
    };
  }, []);

  // ── Draw stops ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops?.length) return;

    stopLayerRef.current?.clearLayers();
    arrowMarkersRef.current.forEach((m) => m.remove());
    arrowMarkersRef.current = [];
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    const sorted  = [...stops].sort((a, b) => a.order - b.order);
    const latlngs = sorted.map((s) => [s.lat, s.lng]);

    routeLineRef.current = L.polyline(latlngs, {
      color: '#2563eb', weight: 4, opacity: 0.75,
    }).addTo(map);

    if (latlngs.length >= 2) {
      arrowMarkersRef.current = addDirectionArrows(map, latlngs, '#60a5fa');
    }

    sorted.forEach((stop, i) => {
      const icon = makeStopIcon(stop.order, i === 0, i === sorted.length - 1);
      L.marker([stop.lat, stop.lng], { icon })
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;
            background:#0f1219;color:#e2e8f0;
            padding:8px 12px;border-radius:8px;min-width:100px">
            <div style="color:#00e5a0;font-weight:bold;margin-bottom:3px">${stop.name}</div>
            <div style="color:#64748b">Stop ${stop.order}</div>
          </div>
        `, { className: 'dark-popup' })
        .addTo(stopLayerRef.current);
    });

    // Only fit to route if no bus is active
    if (!isFollowingRef.current && latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 16 });
    }
  }, [stops]);

  // ── Update bus markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(activeBuses.map((b) => b.driverId));

    Object.entries(busMarkersRef.current).forEach(([id, data]) => {
      if (!currentIds.has(id)) { data.marker.remove(); delete busMarkersRef.current[id]; }
    });

    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;
      const lat        = Number(bus.lat);
      const lng        = Number(bus.lng);
      const isSelected = bus.driverId === selectedDriverId;
      const existing   = busMarkersRef.current[bus.driverId];

      let deg = existing?.bearing ?? 0;
      if (existing?.prevLat !== undefined) {
        const moved = haversine(existing.prevLat, existing.prevLng, lat, lng);
        if (moved > 2) {
          const b = calcBearing(existing.prevLat, existing.prevLng, lat, lng);
          if (!isNaN(b)) deg = b;
        }
      }

      const icon = makeBusIcon(deg, bus.vehicleNumber, isSelected);

      if (!existing) {
        const marker = L.marker([lat, lng], { icon, zIndexOffset: isSelected ? 2000 : 500 })
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
          marker, bearing: deg, prevLat: lat, prevLng: lng,
        };
      } else {
        existing.bearing = deg;
        existing.marker.setLatLng([lat, lng]);
        existing.marker.setIcon(makeBusIcon(deg, bus.vehicleNumber, isSelected));
        existing.prevLat = lat;
        existing.prevLng = lng;
      }
    });
  }, [activeBuses, selectedDriverId]);

  // ── Smooth interpolated movement ──
  useEffect(() => {
    if (!displayPos || !selectedDriverId) return;
    const map = mapRef.current;
    if (!map) return;

    const lat = Number(displayPos.lat);
    const lng = Number(displayPos.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const existing = busMarkersRef.current[selectedDriverId];
    if (!existing) return;

    let deg = existing.bearing ?? 0;
    if (existing.prevLat !== undefined) {
      const moved = haversine(existing.prevLat, existing.prevLng, lat, lng);
      if (moved > 0.5) {
        const b = calcBearing(existing.prevLat, existing.prevLng, lat, lng);
        if (!isNaN(b)) deg = b;
      }
    }

    existing.marker.setLatLng([lat, lng]);
    const bus = activeBuses.find((x) => x.driverId === selectedDriverId);
    existing.marker.setIcon(makeBusIcon(deg, bus?.vehicleNumber || '', true));
    existing.bearing = deg;
    existing.prevLat = lat;
    existing.prevLng = lng;

    if (isFollowingRef.current) {
      const last      = lastPanPosRef.current;
      const distMoved = last ? haversine(last.lat, last.lng, lat, lng) : 999;
      if (distMoved > 20) {
        lastPanPosRef.current = { lat, lng };
        map.panTo([lat, lng], { animate: true, duration: 1.2, easeLinearity: 0.4 });
      }
    }
  }, [displayPos]);

  // ── Snap to selected bus ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDriverId) return;
    const bus = activeBuses.find((b) => b.driverId === selectedDriverId);
    if (bus?.lat && bus?.lng) zoomToBus(map, bus);
  }, [selectedDriverId]);

  // ── Bus appears / disappears ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const busesWithPos = activeBuses.filter((b) => b.lat && b.lng);
    const prev = prevBusCountRef.current;
    prevBusCountRef.current = busesWithPos.length;

    if (busesWithPos.length > 0 && prev === 0) {
      const target = selectedDriverId
        ? busesWithPos.find((b) => b.driverId === selectedDriverId) || busesWithPos[0]
        : busesWithPos[0];
      zoomToBus(map, target);
    }

    if (busesWithPos.length === 0 && prev > 0) {
      isFollowingRef.current = false;
      lastPanPosRef.current  = null;
      zoomToRoute(map, stops);
    }
  }, [activeBuses]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
  );
}