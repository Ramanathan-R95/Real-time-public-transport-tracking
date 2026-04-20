import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

export function useSSE({ routeId }) {
  const [position,    setPosition]    = useState(null);
  const [tripStatus,  setTripStatus]  = useState('waiting');
  const [eta,         setEta]         = useState(null);
  const [connected,   setConnected]   = useState(false);
  const [activeBuses, setActiveBuses] = useState([]);
  const esRef = useRef(null);

  useEffect(() => {
    if (!routeId) return;

    function connect() {
      if (esRef.current) esRef.current.close();

      const url = `${BASE}/sse/route/${routeId}`;
      const es  = new EventSource(url);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.addEventListener('position', (e) => {
        const data = JSON.parse(e.data);
        setPosition(data);
        if (data.eta) setEta(data.eta);
      });

      es.addEventListener('trip_status', (e) => {
        const data = JSON.parse(e.data);
        setTripStatus(data.status);
        if (data.status === 'ended') {
          setEta(null);
          setPosition(null);
        }
      });

      es.addEventListener('buses_update', (e) => {
        setActiveBuses(JSON.parse(e.data));
      });

      es.addEventListener('ping', () => setConnected(true));

      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => esRef.current?.close();
  }, [routeId]);

  return { position, tripStatus, eta, connected, activeBuses };
}