import { useState, useEffect } from 'react';

export function useNetworkQuality() {
  const getQuality = () => {
    const conn = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;

    if (!conn) return { type: '4g', interval: 3000, label: 'Good' };

    const type = conn.effectiveType;
    // Tighter intervals for smoother interpolation
    if (type === '4g') return { type, interval: 3000,  label: 'Excellent' };
    if (type === '3g') return { type, interval: 6000,  label: 'Fair' };
    if (type === '2g') return { type, interval: 12000, label: 'Weak' };
    return { type: 'slow-2g', interval: 20000, label: 'Offline' };
  };

  const [quality, setQuality] = useState(getQuality);

  useEffect(() => {
    const conn = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;
    if (!conn) return;
    const update = () => setQuality(getQuality());
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  return quality;
}