import { useEffect, useRef, useState } from 'react';

// Ease-out cubic — starts fast, slows at destination
// Makes movement look natural like Google Maps
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Linear lerp
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function useInterpolator({ targetPosition, intervalMs = 3000 }) {
  const [displayPos, setDisplayPos] = useState(null);

  const fromRef      = useRef(null);
  const toRef        = useRef(null);
  const startTimeRef = useRef(null);
  const durationRef  = useRef(intervalMs);
  const rafRef       = useRef(null);
  const lastUpdateRef = useRef(null);

  // When new real GPS position arrives
  useEffect(() => {
    if (!targetPosition?.lat || !targetPosition?.lng) return;

    const now = performance.now();

    // First position — snap immediately, no animation
    if (!fromRef.current) {
      fromRef.current   = { lat: targetPosition.lat, lng: targetPosition.lng };
      toRef.current     = { lat: targetPosition.lat, lng: targetPosition.lng };
      startTimeRef.current  = now;
      lastUpdateRef.current = now;
      setDisplayPos({ lat: targetPosition.lat, lng: targetPosition.lng });
      return;
    }

    // How long since last real update
    const timeSinceLast = lastUpdateRef.current
      ? now - lastUpdateRef.current
      : intervalMs;

    // Current interpolated position becomes new starting point (smooth handoff)
    const elapsed = startTimeRef.current ? now - startTimeRef.current : 0;
    const rawT    = durationRef.current > 0 ? elapsed / durationRef.current : 1;
    const t       = easeOut(Math.min(rawT, 1));
    const curLat  = lerp(fromRef.current.lat, toRef.current.lat, t);
    const curLng  = lerp(fromRef.current.lng, toRef.current.lng, t);

    // New interpolation: from current position → new target
    fromRef.current       = { lat: curLat, lng: curLng };
    toRef.current         = { lat: targetPosition.lat, lng: targetPosition.lng };
    startTimeRef.current  = now;
    lastUpdateRef.current = now;

    // Duration: slightly faster than ping interval so marker arrives before next ping
    durationRef.current = Math.max(timeSinceLast * 0.85, 1500);

  }, [targetPosition?.lat, targetPosition?.lng]);

  // rAF loop — smooth 60fps animation
  useEffect(() => {
    function tick(now) {
      if (
        fromRef.current    !== null &&
        toRef.current      !== null &&
        startTimeRef.current !== null
      ) {
        const elapsed = now - startTimeRef.current;
        const rawT    = durationRef.current > 0
          ? elapsed / durationRef.current
          : 1;

        // Apply easing — movement decelerates smoothly
        const t   = easeOut(Math.min(rawT, 1));
        const lat = lerp(fromRef.current.lat, toRef.current.lat, t);
        const lng = lerp(fromRef.current.lng, toRef.current.lng, t);

        setDisplayPos({ lat, lng });
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return displayPos;
}