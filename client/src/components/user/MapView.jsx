// Remove these two lines completely:
// import * as maplibregl from 'maplibre-gl';
// import 'maplibre-gl/dist/maplibre-gl.css';

import React, { useEffect, useRef } from 'react';
import { haversine } from '../../utils/geoMath';

// maplibregl is now a global from the CDN script in index.html

function calcBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng  = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
          - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function createBusElement(vehicleNum, isSelected) {
  const el    = document.createElement('div');
  const size  = isSelected ? 56 : 44;
  const color = isSelected ? '#00e5a0' : '#94a3b8';
  const ring  = isSelected ? '#00e5a0' : '#334155';
  const label = (vehicleNum || 'BUS').slice(0, 9);
  const half  = size / 2;
  const arrowH = size * 0.30;
  const arrowW = size * 0.18;
  const tipY   = half - arrowH;
  const baseY  = half + arrowH * 0.35;

  el.style.cssText = `width:${size}px;height:${size + 18}px;cursor:pointer;`;
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${size}" height="${size + 18}"
      viewBox="0 0 ${size} ${size + 18}">
      <circle cx="${half}" cy="${half}" r="${half - 1}"
        fill="#0a0c10" stroke="${ring}"
        stroke-width="${isSelected ? 2.5 : 1.5}"/>
      <circle cx="${half}" cy="${half}" r="${half - 8}"
        fill="${color}" opacity="0.12"/>
      <polygon
        points="${half},${tipY} ${half - arrowW},${baseY} ${half},${baseY - size * 0.07} ${half + arrowW},${baseY}"
        fill="${color}" stroke="#0a0c10" stroke-width="0.5"/>
      <circle cx="${half}" cy="${half}" r="3.5" fill="${color}"/>
      <rect x="1" y="${size + 1}" width="${size - 2}" height="15"
        rx="4" fill="#0a0c10" stroke="${color}" stroke-width="1"/>
      <text x="${half}" y="${size + 11.5}"
        font-family="monospace" font-size="7.5"
        font-weight="bold" text-anchor="middle"
        fill="${color}">${label}</text>
    </svg>`;

  if (isSelected) {
    el.style.filter = 'drop-shadow(0 0 8px rgba(0,229,160,0.5))';
    el.style.zIndex = '10';
  }
  return el;
}

function createStopElement(order, isFirst, isLast) {
  const el    = document.createElement('div');
  const color = isFirst ? '#00e5a0' : isLast ? '#ff4d4d' : '#475569';
  const label = isFirst ? 'S' : isLast ? 'E' : String(order);
  el.style.cssText = 'width:28px;height:28px;cursor:pointer;';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="#0a0c10" stroke="${color}" stroke-width="2"/>
      <text x="14" y="18" font-family="monospace"
        font-size="${label.length > 1 ? 7 : 10}"
        font-weight="bold" text-anchor="middle"
        fill="${color}">${label}</text>
    </svg>`;
  return el;
}

async function getOSRMPath(stops) {
  if (!stops || stops.length < 2) return [];

  try {
    const coords = stops
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s) => `${s.lng},${s.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.routes?.[0]?.geometry?.coordinates?.length) {
      return data.routes[0].geometry.coordinates;
    }
  } catch (err) {
    console.error('[MapView] OSRM route fetch failed:', err);
  }

  return stops
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => [s.lng, s.lat]);
}

export default function MapView({ displayPos, stops, activeBuses = [], selectedDriverId }) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef({});
  const stopMarkersRef  = useRef([]);
  const routeAddedRef   = useRef(false);
  const isFollowingRef  = useRef(false);
  const lastPanPosRef   = useRef(null);
  const prevBusCountRef = useRef(0);
  const activeBusesRef  = useRef(activeBuses);
  const selectedIdRef   = useRef(selectedDriverId);
  const stopsRef        = useRef(stops);

  useEffect(() => { activeBusesRef.current  = activeBuses;      }, [activeBuses]);
  useEffect(() => { selectedIdRef.current   = selectedDriverId; }, [selectedDriverId]);
  useEffect(() => { stopsRef.current        = stops;            }, [stops]);

  function zoomToBus(bus) {
    const map = mapRef.current;
    if (!map || !bus?.lat || !bus?.lng) return;
    isFollowingRef.current = true;
    lastPanPosRef.current  = { lat: Number(bus.lat), lng: Number(bus.lng) };
    map.flyTo({
      center:   [Number(bus.lng), Number(bus.lat)],
      zoom:     17,
      speed:    1.4,
      curve:    1,
      essential: true,
    });
  }

  function fitToRoute(stopsArr) {
    const map = mapRef.current;
    if (!map || !stopsArr?.length) return;
    const sorted = [...stopsArr].sort((a, b) => a.order - b.order);
    if (sorted.length === 1) {
      map.flyTo({ center: [sorted[0].lng, sorted[0].lat], zoom: 15 });
      return;
    }
    const lngs = sorted.map((s) => s.lng);
    const lats = sorted.map((s) => s.lat);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)],
       [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, maxZoom: 16, duration: 1000 }
    );
  }

  // ── Init map ──
  useEffect(() => {
    if (mapRef.current) return;

    // Wait for maplibregl global to be available
    if (typeof maplibregl === 'undefined') {
      console.error('[Map] maplibregl not loaded yet');
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     'https://tiles.openfreemap.org/styles/liberty',
      center:    [78.8537, 10.9152],
      zoom:      13,
    });

    map.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom:    true,
    }), 'top-right');

    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    }), 'top-right');

    map.on('dragstart', () => { isFollowingRef.current = false; });

    map.on('load', () => {
      console.log('[Map] Loaded successfully');

      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });

      map.addLayer({
        id:     'route-line',
        type:   'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint:  {
          'line-color':   '#3b82f6',
          'line-width':   4,
          'line-opacity': 0.8,
        },
      });

      routeAddedRef.current = true;

      // Snap to existing data after load
      setTimeout(() => {
        const buses = activeBusesRef.current.filter((b) => b.lat && b.lng);
        if (buses.length > 0) {
          const target = selectedIdRef.current
            ? buses.find((b) => b.driverId === selectedIdRef.current) || buses[0]
            : buses[0];
          zoomToBus(target);
        } else if (stopsRef.current?.length) {
          fitToRoute(stopsRef.current);
        }
      }, 500);
    });

    map.on('error', (e) => {
      console.error('[Map] Error:', e.error?.message || e);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current        = null;
      markersRef.current    = {};
      stopMarkersRef.current = [];
      routeAddedRef.current  = false;
      isFollowingRef.current = false;
    };
  }, []);

  // ── Draw stops ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops?.length) return;

    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    const sorted = [...stops].sort((a, b) => a.order - b.order);

    const updateRoute = () => {
      const source = map.getSource('route');
      if (!source) return;

      if (sorted.length < 2) {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
        });
        return;
      }

      getOSRMPath(sorted).then((coords) => {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
        });
      });
    };

    if (map.loaded()) updateRoute();
    else map.on('load', updateRoute);

    sorted.forEach((stop, i) => {
      const el    = createStopElement(stop.order, i === 0, i === sorted.length - 1);
      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="font-family:monospace;font-size:12px;
            background:#0f1219;color:#e2e8f0;
            padding:8px 12px;border-radius:8px">
            <div style="color:#00e5a0;font-weight:bold;margin-bottom:3px">${stop.name}</div>
            <div style="color:#64748b">Stop ${stop.order}</div>
          </div>`);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(popup)
        .addTo(map);

      stopMarkersRef.current.push(marker);
    });

    if (!isFollowingRef.current) fitToRoute(stops);
  }, [stops]);

  // ── Update bus markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(activeBuses.map((b) => b.driverId));

    Object.entries(markersRef.current).forEach(([id, data]) => {
      if (!currentIds.has(id)) {
        data.marker.remove();
        delete markersRef.current[id];
      }
    });

    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;

      const lat        = Number(bus.lat);
      const lng        = Number(bus.lng);
      const isSelected = bus.driverId === selectedDriverId;
      const existing   = markersRef.current[bus.driverId];

      let deg = existing?.bearing ?? 0;
      if (existing?.prevLat !== undefined) {
        const moved = haversine(existing.prevLat, existing.prevLng, lat, lng);
        if (moved > 2) {
          const b = calcBearing(existing.prevLat, existing.prevLng, lat, lng);
          if (!isNaN(b)) deg = b;
        }
      }

      if (!existing) {
        const el     = createBusElement(bus.vehicleNumber, isSelected);
        const popup  = new maplibregl.Popup({ offset: 30, closeButton: false })
          .setHTML(`
            <div style="font-family:monospace;font-size:12px;
              background:#0f1219;color:#e2e8f0;
              padding:8px 12px;border-radius:8px">
              <div style="color:#00e5a0;font-weight:bold">${bus.vehicleNumber}</div>
              <div style="color:#64748b;margin-top:2px">${bus.driverName}</div>
            </div>`);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .setRotation(deg)
          .setPopup(popup)
          .addTo(map);

        markersRef.current[bus.driverId] = {
          marker, bearing: deg,
          prevLat: lat, prevLng: lng,
          isSelected, el,
        };
      } else {
        existing.bearing = deg;
        existing.marker.setLngLat([lng, lat]);
        existing.marker.setRotation(deg);

        if (existing.isSelected !== isSelected) {
          const newEl = createBusElement(bus.vehicleNumber, isSelected);
          existing.el.replaceWith(newEl);
          existing.el         = newEl;
          existing.isSelected = isSelected;
        }

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

    const existing = markersRef.current[selectedDriverId];
    if (!existing) return;

    let deg = existing.bearing ?? 0;
    if (existing.prevLat !== undefined) {
      const moved = haversine(existing.prevLat, existing.prevLng, lat, lng);
      if (moved > 0.3) {
        const b = calcBearing(existing.prevLat, existing.prevLng, lat, lng);
        if (!isNaN(b)) deg = b;
      }
    }

    existing.marker.setLngLat([lng, lat]);
    existing.marker.setRotation(deg);
    existing.bearing = deg;
    existing.prevLat = lat;
    existing.prevLng = lng;

    if (isFollowingRef.current) {
      const last      = lastPanPosRef.current;
      const distMoved = last ? haversine(last.lat, last.lng, lat, lng) : 999;
      if (distMoved > 15) {
        lastPanPosRef.current = { lat, lng };
        map.easeTo({
          center:   [lng, lat],
          duration: 800,
          easing:   (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        });
      }
    }
  }, [displayPos]);

  // ── Snap to selected bus ──
  useEffect(() => {
    if (!selectedDriverId) return;
    const bus = activeBuses.find((b) => b.driverId === selectedDriverId);
    if (bus?.lat && bus?.lng) zoomToBus(bus);
  }, [selectedDriverId]);

  // ── Bus appears / disappears ──
  useEffect(() => {
    const busesWithPos = activeBuses.filter((b) => b.lat && b.lng);
    const prev = prevBusCountRef.current;
    prevBusCountRef.current = busesWithPos.length;

    if (busesWithPos.length > 0 && prev === 0) {
      const target = selectedDriverId
        ? busesWithPos.find((b) => b.driverId === selectedDriverId) || busesWithPos[0]
        : busesWithPos[0];
      zoomToBus(target);
    }

    if (busesWithPos.length === 0 && prev > 0) {
      isFollowingRef.current = false;
      lastPanPosRef.current  = null;
      fitToRoute(stops);
    }
  }, [activeBuses]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}