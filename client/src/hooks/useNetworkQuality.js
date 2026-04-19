import { useState, useEffect } from 'react';

export function useNetworkQuality() {
  const getQuality = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { type: '4g', interval: 5000, label: 'Good' };
    const type = conn.effectiveType;
    if (type === '4g') return { type, interval: 5000,  label: 'Excellent' };
    if (type === '3g') return { type, interval: 12000, label: 'Fair' };
    if (type === '2g') return { type, interval: 25000, label: 'Weak' };
    return { type: 'offline', interval: 30000, label: 'Offline' };
  };

  const [quality, setQuality] = useState(getQuality);

  useEffect(() => {
    const conn = navigator.connection;
    if (!conn) return;
    const update = () => setQuality(getQuality());
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  return quality;
}