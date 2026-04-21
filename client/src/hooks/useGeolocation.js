import { useState, useEffect, useRef } from 'react';

export function useGeolocation({ enabled = false, onPosition }) {
  const [error,   setError]   = useState(null);
  const [lastPos, setLastPos] = useState(null);
  const watchId   = useRef(null);
  const firstFire = useRef(true);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      firstFire.current = true;
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;

        // Allow first fix even if accuracy is poor — driver needs to appear on map immediately
        if (!firstFire.current && accuracy > 100) return;

        const ping = {
          lat,
          lng,
          accuracy: accuracy || 0,
          speed:    speed || 0,
          timestamp: new Date().toISOString(),
        };

        firstFire.current = false;
        setLastPos(ping);
        setError(null);
        onPosition?.(ping);
      },
      (err) => {
        console.error('[GEO] Error:', err.message);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge:         3000,
        timeout:            15000,
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled]);

  return { lastPos, error };
}