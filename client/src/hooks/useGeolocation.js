import { useState, useEffect, useRef } from 'react';

export function useGeolocation({ enabled = false, onPosition }) {
  const [error, setError] = useState(null);
  const [lastPos, setLastPos] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
        if (accuracy > 80) return; // Ignore poor fixes
        const ping = { lat, lng, accuracy, speed: speed || 0, timestamp: new Date().toISOString() };
        setLastPos(ping);
        setError(null);
        onPosition?.(ping);
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
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