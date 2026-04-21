import { useEffect, useRef, useState } from 'react';

function lerp(a, b, t) {
  return a + (b - a) * Math.min(t, 1);
}

export function useInterpolator({ targetPosition, intervalMs = 8000 }) {
  const [displayPos, setDisplayPos] = useState(null);

  const fromRef      = useRef(null);
  const toRef        = useRef(null);
  const startTimeRef = useRef(null);
  const durationRef  = useRef(intervalMs);
  const rafRef       = useRef(null);
  const lastUpdateRef = useRef(null);

  // When a new real position arrives, start interpolating toward it
  useEffect(() => {
    if (!targetPosition?.lat || !targetPosition?.lng) return;

    const now = performance.now();

    if (!fromRef.current) {
      // First position — snap immediately
      fromRef.current  = { lat: targetPosition.lat, lng: targetPosition.lng };
      toRef.current    = { lat: targetPosition.lat, lng: targetPosition.lng };
      startTimeRef.current = now;
      setDisplayPos({ lat: targetPosition.lat, lng: targetPosition.lng });
      lastUpdateRef.current = now;
      return;
    }

    // Compute how long since last real update — use that as duration
    const sinceLastUpdate = lastUpdateRef.current
      ? now - lastUpdateRef.current
      : intervalMs;

    // Start from current interpolated position (smooth handoff)
    const elapsed = startTimeRef.current ? now - startTimeRef.current : 0;
    const t       = durationRef.current > 0
      ? Math.min(elapsed / durationRef.current, 1)
      : 1;
    const currentLat = lerp(fromRef.current.lat, toRef.current.lat, t);
    const currentLng = lerp(fromRef.current.lng, toRef.current.lng, t);

    fromRef.current   = { lat: currentLat, lng: currentLng };
    toRef.current     = { lat: targetPosition.lat, lng: targetPosition.lng };
    startTimeRef.current = now;
    durationRef.current  = Math.max(sinceLastUpdate * 0.9, 2000); // slightly faster than ping rate
    lastUpdateRef.current = now;
  }, [targetPosition?.lat, targetPosition?.lng]);

  // rAF loop — runs continuously
  useEffect(() => {
    function tick() {
      if (fromRef.current && toRef.current && startTimeRef.current) {
        const now     = performance.now();
        const elapsed = now - startTimeRef.current;
        const t       = durationRef.current > 0
          ? elapsed / durationRef.current
          : 1;

        if (t <= 1.05) {
          const lat = lerp(fromRef.current.lat, toRef.current.lat, Math.min(t, 1));
          const lng = lerp(fromRef.current.lng, toRef.current.lng, Math.min(t, 1));
          setDisplayPos({ lat, lng });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return displayPos;
}