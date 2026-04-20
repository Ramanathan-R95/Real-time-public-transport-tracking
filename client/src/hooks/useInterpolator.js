import { useEffect, useRef, useState } from 'react';

function lerp(a, b, t) { return a + (b - a) * t; }

export function useInterpolator({ targetPosition, intervalMs = 5000 }) {
  const [displayPos, setDisplayPos] = useState(null);
  const stateRef = useRef({
    fromLat: null, fromLng: null,
    toLat:   null, toLng:   null,
    startTime: null,
    duration: intervalMs,
  });
  const rafRef = useRef(null);

  // When a new target arrives, start a new interpolation from current pos
  useEffect(() => {
    if (!targetPosition) return;

    const s = stateRef.current;

    // Start from wherever we currently are
    const fromLat = s.toLat ?? targetPosition.lat;
    const fromLng = s.toLng ?? targetPosition.lng;

    s.fromLat   = fromLat;
    s.fromLng   = fromLng;
    s.toLat     = targetPosition.lat;
    s.toLng     = targetPosition.lng;
    s.startTime = performance.now();
    s.duration  = intervalMs;

    // Set immediately if first position
    if (!displayPos) {
      setDisplayPos({ lat: targetPosition.lat, lng: targetPosition.lng });
    }
  }, [targetPosition]);

  // Continuous rAF loop — keeps running between pings
  useEffect(() => {
    function tick(now) {
      const s = stateRef.current;

      if (
        s.fromLat !== null &&
        s.toLat   !== null &&
        s.startTime !== null
      ) {
        const elapsed = now - s.startTime;
        const t       = Math.min(elapsed / s.duration, 1);
        const lat     = lerp(s.fromLat, s.toLat, t);
        const lng     = lerp(s.fromLng, s.toLng, t);
        setDisplayPos({ lat, lng });
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return displayPos;
}