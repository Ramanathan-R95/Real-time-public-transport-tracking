import { useState, useEffect, useRef } from 'react';

export function useGeolocation({ enabled = false, onPosition }) {
  const [error,   setError]   = useState(null);
  const [lastPos, setLastPos] = useState(null);
  const watchId    = useRef(null);
  const onPosRef   = useRef(onPosition);
  const firstFix   = useRef(true);

  // Always keep ref up to date
  useEffect(() => { onPosRef.current = onPosition; }, [onPosition]);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        firstFix.current = true;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    console.log('[GEO] Starting watchPosition');

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
        console.log(`[GEO] Fix: lat=${lat.toFixed(5)} lng=${lng.toFixed(5)} acc=${accuracy?.toFixed(0)}m`);

        const ping = {
          lat,
          lng,
          accuracy: accuracy || 0,
          speed:    speed    || 0,
          timestamp: new Date().toISOString(),
        };

        setLastPos(ping);
        setError(null);
        // Always call via ref — captures latest version
        onPosRef.current?.(ping);
      },
      (err) => {
        console.error('[GEO] Error:', err.code, err.message);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge:         0,       // always fresh
        timeout:            20000,
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current  = null;
        firstFix.current = true;
        console.log('[GEO] Stopped watchPosition');
      }
    };
  }, [enabled]);   // only re-run when enabled changes

  return { lastPos, error };
}