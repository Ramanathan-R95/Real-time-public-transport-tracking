import { useEffect, useRef, useState } from 'react';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function useInterpolator({ targetPosition, intervalMs = 5000 }) {
  const [displayPos, setDisplayPos] = useState(null);
  const prevPos = useRef(null);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    if (!targetPosition) return;

    if (!prevPos.current) {
      prevPos.current = targetPosition;
      setDisplayPos(targetPosition);
      return;
    }

    const from = prevPos.current;
    const to = targetPosition;
    startTime.current = performance.now();

    function animate(now) {
      const elapsed = now - startTime.current;
      const t = Math.min(elapsed / intervalMs, 1);
      const lat = lerp(from.lat, to.lat, t);
      const lng = lerp(from.lng, to.lng, t);
      setDisplayPos({ lat, lng });

      if (t < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        prevPos.current = to;
      }
    }

    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId.current);
  }, [targetPosition]);

  return displayPos;
}