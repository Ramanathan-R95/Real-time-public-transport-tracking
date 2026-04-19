import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createBusIcon, createStopIcon } from './BusMarker';
import { bearing } from '../../utils/geoMath';

export default function MapView({ displayPos, stops, activeBuses = [], selectedDriverId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkersRef = useRef({});   // driverId -> marker
  const stopMarkersRef = useRef([]);
  const routeLineRef = useRef(null);
  const initialFitRef = useRef(false);

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [10.9152, 78.8537],
      zoom: 16,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Draw stops + route line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !stops?.length) return;

    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    const latlngs = stops.map((s) => [s.lat, s.lng]);
    routeLineRef.current = L.polyline(latlngs, {
      color: '#374151',
      weight: 3,
      opacity: 0.8,
      dashArray: '8 6',
    }).addTo(map);

    stops.forEach((stop, i) => {
      const isFirst = i === 0;
      const icon = createStopIcon(isFirst, String(stop.order || i + 1));
      const marker = L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:monospace;font-size:12px;background:#12151c;color:#e8eaf0;padding:8px 12px;border-radius:6px;min-width:120px">
            <strong style="color:#00e5a0">${stop.name}</strong><br/>
            <span style="color:#6b7280">Stop ${stop.order}</span>
          </div>
        `, { className: 'dark-popup' });
      stopMarkersRef.current.push(marker);
    });

    if (!initialFitRef.current && latlngs.length > 0) {
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [50, 50] });
      initialFitRef.current = true;
    }
  }, [stops]);

  // Draw / update all active bus markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentIds = new Set(activeBuses.map((b) => b.driverId));

    // Remove markers for buses that left
    Object.keys(busMarkersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        busMarkersRef.current[id].remove();
        delete busMarkersRef.current[id];
      }
    });

    // Add / update markers
    activeBuses.forEach((bus) => {
      if (!bus.lat || !bus.lng) return;
      const isSelected = bus.driverId === selectedDriverId;

      let deg = 0;
      if (busMarkersRef.current[bus.driverId]) {
        const prev = busMarkersRef.current[bus.driverId].getLatLng();
        deg = bearing(prev.lat, prev.lng, bus.lat, bus.lng);
      }

      const icon = createBusIcon(deg, bus.vehicleNumber, isSelected);

      if (!busMarkersRef.current[bus.driverId]) {
        const marker = L.marker([bus.lat, bus.lng], { icon, zIndexOffset: isSelected ? 2000 : 1000 })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:monospace;font-size:12px;background:#12151c;color:#e8eaf0;padding:8px 12px;border-radius:6px">
              <strong style="color:#00e5a0">${bus.vehicleNumber}</strong><br/>
              <span style="color:#6b7280">${bus.driverName}</span>
            </div>
          `, { className: 'dark-popup' });
        busMarkersRef.current[bus.driverId] = marker;
      } else {
        busMarkersRef.current[bus.driverId].setLatLng([bus.lat, bus.lng]);
        busMarkersRef.current[bus.driverId].setIcon(icon);
      }
    });
  }, [activeBuses, selectedDriverId]);

  // Pan to selected bus
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !displayPos) return;
    map.panTo([displayPos.lat, displayPos.lng], { animate: true, duration: 0.8 });
  }, [displayPos]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px', borderRadius: 14 }} />
  );
}